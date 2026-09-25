// Self-contained regression test for the abstract submission wizard:
// creates a disposable confirmed test account via the Supabase admin API,
// drives the flow in a real browser (login through the final review step),
// verifies the stored structured abstract, then cleans up everything it
// created.
//
// It stops short of clicking "Submit Abstract" on purpose: submit_abstract
// auto-assigns and emails every active reviewer for the chosen sub-theme, and
// this runs against the real project, so a full submit would email real
// reviewers.
//
// Requires `npm run dev` running on :3000, and DATABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local:
//   npm run test:wizard
import { chromium } from "playwright-core"
import { Client } from "pg"
import { mkdirSync } from "node:fs"
import path from "node:path"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const TEST_EMAIL = `wizard-e2e-${Date.now()}@example.com`
const TEST_PASSWORD = "TestPassword123!"
// Defaults to the local dev server; set CHECK_SITE to point it at a deployed site.
const BASE = process.env.CHECK_SITE || "http://localhost:3000"

const outDir = "scripts/.smoke-screenshots"
mkdirSync(outDir, { recursive: true })

async function supaAdmin(pathSuffix, options = {}) {
  const res = await fetch(`${SUPA_URL}${pathSuffix}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })
  return res.json()
}

console.log("--- Creating disposable test account ---")
const created = await supaAdmin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: "Amaka",
      last_name: "Okafor",
      asm_id_number: "12345678",
      professional_title: "Research Scientist",
      institution: "University of Abuja",
      department: "Microbiology",
      country: "Nigeria",
      phone: "+2348012345678",
    },
  }),
})
if (!created.id) throw new Error(`Failed to create test user: ${JSON.stringify(created)}`)
const userId = created.id
console.log("Test user:", userId, TEST_EMAIL)

let submissionId = null
let storagePath = null
const errors = []

async function cleanup() {
  console.log("\n--- Cleaning up ---")
  if (submissionId) {
    const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await client.connect()
    for (const table of ["reviews", "review_assignments", "decisions", "notifications", "submission_documents", "submission_versions", "submission_authors"]) {
      await client.query(`delete from ${table} where submission_id = $1`, [submissionId])
    }
    await client.query("delete from audit_logs where entity_id = $1", [submissionId])
    await client.query("delete from submissions where id = $1", [submissionId])
    await client.end()
  }
  if (storagePath) {
    await supaAdmin(`/storage/v1/object/abstracts/${storagePath}`, { method: "DELETE" })
  }
  await supaAdmin(`/auth/v1/admin/users/${userId}`, { method: "DELETE" })
  console.log("Cleanup complete.")
}

try {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true })
  const page = await browser.newPage()
  page.on("console", (msg) => {
    // React's dev build needs eval() for callstack reconstruction, which the
    // site's CSP forbids; production never uses it, so it's dev-only noise.
    if (msg.type() === "error" && !msg.text().includes("eval() is not supported")) {
      errors.push(`[console] ${msg.text()}`)
    }
  })
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))

  async function shot(name) {
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  }

  console.log("--- Login ---")
  await page.goto(`${BASE}/login`)
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.getByRole("button", { name: "Log in" }).click()
  await page.waitForURL(/\/author\/dashboard/, { timeout: 15000 })
  await shot("wizard-01-dashboard")

  console.log("--- Step 1: Abstract Information ---")
  await page.getByRole("link", { name: "+ Submit New Abstract" }).first().click()
  await page.waitForSelector("text=Step 1: Abstract Information")
  await page.fill('input[name="title"]', "Genomic Surveillance of AMR Pathogens in Abuja Wastewater")
  await page.locator('button[role="combobox"]').first().click()
  await page.waitForTimeout(300)
  await page.locator('[role="option"]').first().click()
  const keywordInput = page.getByPlaceholder("Type a keyword and press Enter")
  await keywordInput.fill("antimicrobial resistance")
  await keywordInput.press("Enter")
  await keywordInput.fill("wastewater surveillance")
  await keywordInput.press("Enter")
  await shot("wizard-02-step1-filled")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.waitForURL(/step=2/, { timeout: 15000 })

  submissionId = new URL(page.url()).pathname.split("/").pop()

  console.log("--- Step 2: Authors ---")
  await page.waitForSelector("text=Step 2: Authors")
  await page.getByRole("button", { name: "+ Add Co-Author" }).click()
  await page.fill('input[name="coAuthors.0.firstName"]', "Chidi")
  await page.fill('input[name="coAuthors.0.lastName"]', "Nwosu")
  await page.fill('input[name="coAuthors.0.email"]', "chidi.nwosu@example.com")
  await page.fill('input[name="coAuthors.0.institution"]', "University of Lagos")
  await page.fill('input[name="coAuthors.0.country"]', "Nigeria")
  await shot("wizard-03-step2-filled")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.waitForURL(/step=3/, { timeout: 15000 })

  console.log("--- Step 3: Abstract Content ---")
  await page.waitForSelector("text=Step 3: Abstract Content")
  // Structured intake: four required parts, each with its own word limit.
  // First a deliberately over-limit Background to prove the form blocks it.
  await page.fill('textarea[name="background"]', Array(40).fill("word").join(" "))
  await page.waitForSelector("text=40 / 35 words")
  const nextDisabled = await page.getByRole("button", { name: "Next", exact: true }).isDisabled()
  if (!nextDisabled) throw new Error("Next should be disabled while Background is over its 35-word limit")
  console.log("over-limit Background correctly blocks Next")
  // A pasted heading is stripped rather than counted/duplicated.
  await page.fill('textarea[name="background"]', "Background: Antimicrobial resistance (AMR) is a growing threat to public health across Nigeria.")
  await page.fill('textarea[name="methods"]', "Wastewater samples were collected across five sites in Abuja over six months and characterised by whole-genome sequencing.")
  await page.fill('textarea[name="results"]', "We identified a high burden of beta-lactam, fluoroquinolone and aminoglycoside resistance genes, with notable site-to-site variation.")
  await page.fill('textarea[name="conclusion"]', "Resistance gene burden tracks proximity to healthcare facilities, supporting targeted wastewater surveillance.")
  await shot("wizard-04-step3-filled")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.waitForURL(/step=4/, { timeout: 15000 })

  console.log("--- Step 4: Declarations ---")
  await page.waitForSelector("text=Step 4: Declarations")
  await page.getByText("I declare there is no conflict of interest").click()
  await page.getByText("I confirm ethical approval has been obtained").click()
  await page.fill('textarea[name="fundingDeclaration"]', "Funded by the Nigerian CDC AMR Surveillance Grant.")
  await page.getByText("I confirm this abstract is original work").click()
  await shot("wizard-05-step4-filled")
  await page.getByRole("button", { name: "Next", exact: true }).click()
  await page.waitForURL(/step=5/, { timeout: 15000 })

  console.log("--- Step 5: Document Upload ---")
  await page.waitForSelector("text=Step 5: Document Upload")
  await page.locator('input[type="file"]').setInputFiles(path.resolve("scripts/fixtures/test-abstract.pdf"))
  await page.waitForSelector("text=Replace", { timeout: 15000 })
  await shot("wizard-06-step5-uploaded")
  await page.getByRole("link", { name: "Next", exact: true }).click()
  await page.waitForURL(/step=6/, { timeout: 15000 })

  console.log("--- Step 6: Payment (seeded directly; its own upload flow is covered elsewhere) ---")
  await page.waitForSelector("text=Step 6: Payment")
  {
    const seed = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await seed.connect()
    await seed.query(
      "update submissions set payment_receipt_path = $2, payment_currency = 'NGN', payment_receipt_uploaded_at = now() where id = $1",
      [submissionId, `${submissionId}/wizard-e2e-fake-receipt.pdf`]
    )
    await seed.end()
  }
  await page.goto(`${BASE}/author/submissions/${submissionId}?step=7`)

  console.log("--- Step 7: Review (structured abstract) ---")
  await page.waitForSelector("text=Step 7: Review & Submit")
  // Structured abstracts render as four labelled parts on the review step.
  await page.waitForSelector("text=Methods:")
  await shot("wizard-07-step7-review")
  const submitEnabledStructured = await page.getByRole("button", { name: "Submit Abstract" }).isEnabled()
  console.log("Submit enabled for a structured abstract:", submitEnabledStructured)

  // What was actually stored, checked before the legacy scenario below rewrites it.
  let structuredOk = false
  {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const { rows } = await c.query(
      "select abstract_text, word_count, abstract_background, abstract_methods, abstract_results, abstract_conclusion from submission_versions where submission_id = $1",
      [submissionId]
    )
    await c.end()
    const v = rows[0]
    const words = (s) => (s ?? "").trim().split(/\s+/).filter(Boolean).length
    const sectionWords = v
      ? words(v.abstract_background) + words(v.abstract_methods) + words(v.abstract_results) + words(v.abstract_conclusion)
      : -1
    structuredOk =
      !!v &&
      !v.abstract_background.toLowerCase().startsWith("background") && // pasted heading was stripped
      v.abstract_text.startsWith("Background: Antimicrobial") &&
      v.abstract_text.includes("\n\nMethods: ") &&
      v.abstract_text.includes("\n\nResults: ") &&
      v.abstract_text.includes("\n\nConclusion: ") &&
      v.word_count === sectionWords
    console.log("stored word_count:", v?.word_count, "section words:", sectionWords)
  }

  // Deliberately NOT clicking Submit: submit_abstract auto-assigns every active
  // reviewer for the sub-theme and emails them, and this test runs against the
  // real project. Everything up to the button is what this change touches; the
  // submit RPC itself is unchanged.

  console.log("--- Legacy draft: free text with no structure must not be submittable ---")
  {
    const legacy = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await legacy.connect()
    await legacy.query(
      "update submission_versions set abstract_background = null, abstract_methods = null, abstract_results = null, abstract_conclusion = null, abstract_text = 'An older free-text abstract written before the four-part structure existed.' where submission_id = $1",
      [submissionId]
    )
    await legacy.end()
  }
  await page.goto(`${BASE}/author/submissions/${submissionId}?step=7`)
  await page.waitForSelector("text=Step 7: Review & Submit")
  await page.waitForSelector("text=rewrite it as Background, Methods, Results and Conclusion")
  const submitEnabledLegacy = await page.getByRole("button", { name: "Submit Abstract" }).isEnabled()
  console.log("Submit enabled for a legacy free-text draft:", submitEnabledLegacy)
  await shot("wizard-08-legacy-blocked")

  await page.goto(`${BASE}/author/submissions/${submissionId}?step=3`)
  await page.waitForSelector("text=Your earlier abstract text (for reference)")
  console.log("Step 3 offers the earlier text for reference: true")
  await shot("wizard-09-legacy-step3")

  console.log("--- Accepted legacy abstract: restructure for the Book of Abstracts ---")
  const LEGACY_TEXT = "An older free-text abstract written before the four-part structure existed."
  {
    const acc = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await acc.connect()
    // Status set directly (no decision row, so no notification is generated).
    await acc.query("update submissions set status = 'accepted_oral' where id = $1", [submissionId])
    await acc.end()
  }
  await page.goto(`${BASE}/author/submissions/${submissionId}`)
  await page.waitForSelector("text=Your abstract for the Book of Abstracts")
  await page.waitForSelector("text=Your earlier abstract text (for reference)")
  await page.fill('textarea[name="background"]', "Antimicrobial resistance threatens public health across Nigeria.")
  await page.fill('textarea[name="methods"]', "Wastewater from five Abuja sites was sequenced over six months to profile resistance genes.")
  await page.fill('textarea[name="results"]', "Beta-lactam, fluoroquinolone and aminoglycoside resistance genes were abundant and varied by site.")
  await page.fill('textarea[name="conclusion"]', "Resistance burden follows proximity to healthcare facilities.")
  await page.getByRole("button", { name: "Save for the Book of Abstracts" }).click()
  await page.waitForSelector("text=ready for the Book of Abstracts", { timeout: 30000 })
  await shot("wizard-10-restructured")
  let restructureOk = false
  {
    const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await c.connect()
    const { rows } = await c.query(
      "select abstract_text, abstract_text_original, abstract_background, abstract_results from submission_versions where submission_id = $1",
      [submissionId]
    )
    const { rows: audit } = await c.query(
      "select action from audit_logs where entity_id = $1 and action = 'abstract_restructured'",
      [submissionId]
    )
    await c.end()
    restructureOk =
      rows[0]?.abstract_text_original === LEGACY_TEXT && // originally reviewed text preserved
      rows[0]?.abstract_text.startsWith("Background: Antimicrobial") &&
      !!rows[0]?.abstract_results &&
      audit.length === 1
    console.log("restructure stored original + audit entry:", restructureOk)
  }

  await browser.close()

  console.log("\n--- Verifying DB state ---")
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const { rows: subs } = await client.query("select status from submissions where id = $1", [submissionId])
  const { rows: notif } = await client.query("select notification_type from notifications where submission_id = $1", [submissionId])
  const { rows: docs } = await client.query("select storage_path from submission_documents where submission_id = $1", [submissionId])
  await client.end()
  storagePath = docs[0]?.storage_path ?? null

  console.log("\n=== RESULT ===")
  console.log("submissions row:", JSON.stringify(subs[0]))
  console.log("notifications created (must be none -- nothing was submitted):", notif.length)
  console.log("Console/page errors:", errors.length)
  errors.forEach((e) => console.log(" -", e))
  console.log("structured storage ok:", structuredOk)

  const pass =
    structuredOk &&
    restructureOk &&
    submitEnabledStructured &&
    !submitEnabledLegacy &&
    subs[0]?.status === "accepted_oral" &&
    notif.length === 0 &&
    errors.length === 0
  console.log(pass ? "\nPASS" : "\nFAIL")
  if (!pass) process.exitCode = 1
} catch (err) {
  console.error("Test threw:", err)
  process.exitCode = 1
} finally {
  await cleanup()
}
