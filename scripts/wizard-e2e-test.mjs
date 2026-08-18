// Self-contained regression test for the 6-step abstract submission wizard:
// creates a disposable confirmed test account via the Supabase admin API,
// drives the full flow in a real browser (login through submit), verifies
// the resulting DB state, then cleans up everything it created.
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
    if (msg.type() === "error") errors.push(`[console] ${msg.text()}`)
  })
  page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))

  async function shot(name) {
    await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  }

  console.log("--- Login ---")
  await page.goto("http://localhost:3000/login")
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
  const abstractText =
    "Antimicrobial resistance (AMR) is a growing threat to public health across Nigeria. " +
    "This study examined wastewater samples collected across five sites in Abuja over a " +
    "six-month period to characterize the prevalence and diversity of AMR genes using " +
    "whole-genome sequencing. We identified a significant burden of resistance genes " +
    "associated with beta-lactams, fluoroquinolones, and aminoglycosides, with notable " +
    "site-to-site variation correlating with proximity to healthcare facilities."
  await page.fill('textarea[name="abstractText"]', abstractText)
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

  console.log("--- Step 6: Review & Submit ---")
  await page.waitForSelector("text=Step 6: Review & Submit")
  await shot("wizard-07-step6-review")
  await page.getByRole("button", { name: "Submit Abstract" }).click()
  await page.waitForURL(/submitted=1/, { timeout: 20000 })
  await shot("wizard-08-submitted")

  const bodyText = await page.locator("body").innerText()
  const refMatch = bodyText.match(/ASM-ABJ-2026-\d{5}/)

  await browser.close()

  console.log("\n--- Verifying DB state ---")
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  const { rows: subs } = await client.query("select status, reference_number from submissions where id = $1", [submissionId])
  const { rows: audit } = await client.query("select action from audit_logs where entity_id = $1", [submissionId])
  const { rows: notif } = await client.query("select notification_type, status from notifications where submission_id = $1", [submissionId])
  const { rows: docs } = await client.query("select storage_path from submission_documents where submission_id = $1", [submissionId])
  await client.end()
  storagePath = docs[0]?.storage_path ?? null

  console.log("\n=== RESULT ===")
  console.log("Reference number on page:", refMatch ? refMatch[0] : "NOT FOUND")
  console.log("submissions row:", JSON.stringify(subs[0]))
  console.log("audit_logs row:", JSON.stringify(audit[0]))
  console.log("notifications row:", JSON.stringify(notif[0]))
  console.log("Console/page errors:", errors.length)
  errors.forEach((e) => console.log(" -", e))

  const pass =
    subs[0]?.status === "submitted" &&
    !!subs[0]?.reference_number &&
    audit.length === 1 &&
    notif.length === 1 &&
    errors.length === 0
  console.log(pass ? "\nPASS" : "\nFAIL")
  if (!pass) process.exitCode = 1
} catch (err) {
  console.error("Test threw:", err)
  process.exitCode = 1
} finally {
  await cleanup()
}
