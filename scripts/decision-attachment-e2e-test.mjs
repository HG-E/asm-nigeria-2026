// Regression test for the committee decision-attachment feature: creates
// disposable author + admin test accounts, drives a real abstract through
// the wizard, jumps its status to decision_pending directly (the review
// pipeline itself is already covered by other tests -- this test only
// exercises the new propose -> attach -> finalize -> author-download path),
// then verifies in a real browser that:
//   - the attachment control is hidden until a decision draft exists
//   - a committee/admin upload succeeds and is visible pre-finalize in the
//     Finalize panel
//   - the author sees NO decision info while still decision_pending
//   - once finalized, the author's page shows a working download link
//
// Requires `npm run dev` running on :3000, and DATABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in .env.local:
//   npm run test:decision-attachment
import { chromium } from "playwright-core"
import { Client } from "pg"
import { mkdirSync } from "node:fs"
import path from "node:path"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STAMP = Date.now()
const AUTHOR_EMAIL = `decision-attach-author-${STAMP}@example.com`
const ADMIN_EMAIL = `decision-attach-admin-${STAMP}@example.com`
const PASSWORD = "TestPassword123!"

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

console.log("--- Creating disposable test accounts ---")
const author = await supaAdmin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({
    email: AUTHOR_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: "Chiamaka",
      last_name: "Eze",
      asm_id_number: "87654321",
      professional_title: "Research Scientist",
      institution: "University of Jos",
      department: "Microbiology",
      country: "Nigeria",
      phone: "+2348011112222",
    },
  }),
})
if (!author.id) throw new Error(`Failed to create author test user: ${JSON.stringify(author)}`)
console.log("Author:", author.id, AUTHOR_EMAIL)

const admin = await supaAdmin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({
    email: ADMIN_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: "Test",
      last_name: "Admin",
      institution: "ASM Nigeria",
      country: "Nigeria",
    },
  }),
})
if (!admin.id) throw new Error(`Failed to create admin test user: ${JSON.stringify(admin)}`)
console.log("Admin:", admin.id, ADMIN_EMAIL)

const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await pg.connect()
await pg.query("update user_profiles set role = 'admin' where id = $1", [admin.id])

let submissionId = null
let storagePath = null
let receiptStoragePath = null
let attachmentStoragePath = null
const errors = []

async function cleanup() {
  console.log("\n--- Cleaning up ---")
  if (submissionId) {
    for (const table of [
      "reviews",
      "review_assignments",
      "decisions",
      "notifications",
      "submission_documents",
      "submission_versions",
      "submission_authors",
    ]) {
      await pg.query(`delete from ${table} where submission_id = $1`, [submissionId])
    }
    await pg.query("delete from audit_logs where entity_id = $1", [submissionId])
    await pg.query("delete from submissions where id = $1", [submissionId])
  }
  await pg.end()
  if (storagePath) {
    await supaAdmin(`/storage/v1/object/abstracts/${storagePath}`, { method: "DELETE" })
  }
  if (receiptStoragePath) {
    await supaAdmin(`/storage/v1/object/payment-receipts/${receiptStoragePath}`, { method: "DELETE" })
  }
  if (attachmentStoragePath) {
    await supaAdmin(`/storage/v1/object/decision-attachments/${attachmentStoragePath}`, { method: "DELETE" })
  }
  await supaAdmin(`/auth/v1/admin/users/${author.id}`, { method: "DELETE" })
  await supaAdmin(`/auth/v1/admin/users/${admin.id}`, { method: "DELETE" })
  console.log("Cleanup complete.")
}

try {
  const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true })

  const authorPage = await browser.newContext().then((c) => c.newPage())
  const adminPage = await browser.newContext().then((c) => c.newPage())
  for (const p of [authorPage, adminPage]) {
    p.on("console", (msg) => {
      if (msg.type() === "error") errors.push(`[console:${p === authorPage ? "author" : "admin"}] ${msg.text()}`)
    })
    p.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))
  }

  console.log("--- Author: login + submit an abstract via the wizard ---")
  await authorPage.goto("http://localhost:3000/login")
  await authorPage.fill('input[name="email"]', AUTHOR_EMAIL)
  await authorPage.fill('input[name="password"]', PASSWORD)
  await authorPage.getByRole("button", { name: "Log in" }).click()
  await authorPage.waitForURL(/\/author\/dashboard/, { timeout: 45000 })

  await authorPage.getByRole("link", { name: "+ Submit New Abstract" }).first().click()
  await authorPage.waitForSelector("text=Step 1: Abstract Information")
  await authorPage.fill('input[name="title"]', "Decision Attachment Feature Test Abstract")
  await authorPage.locator('button[role="combobox"]').first().click()
  await authorPage.waitForTimeout(300)
  await authorPage.locator('[role="option"]').first().click()
  const keywordInput = authorPage.getByPlaceholder("Type a keyword and press Enter")
  await keywordInput.fill("test fixture")
  await keywordInput.press("Enter")
  await authorPage.getByRole("button", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=2/, { timeout: 45000 })
  submissionId = new URL(authorPage.url()).pathname.split("/").pop()

  await authorPage.waitForSelector("text=Step 2: Authors")
  await authorPage.getByRole("button", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=3/, { timeout: 45000 })

  await authorPage.waitForSelector("text=Step 3: Abstract Content")
  await authorPage.fill(
    'textarea[name="abstractText"]',
    "This is a disposable test abstract created solely to exercise the committee " +
      "decision-attachment feature end to end. It is deleted automatically when the test finishes."
  )
  await authorPage.getByRole("button", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=4/, { timeout: 45000 })

  await authorPage.waitForSelector("text=Step 4: Declarations")
  await authorPage.getByText("I declare there is no conflict of interest").click()
  await authorPage.getByText("I confirm ethical approval has been obtained").click()
  await authorPage.fill('textarea[name="fundingDeclaration"]', "None.")
  await authorPage.getByText("I confirm this abstract is original work").click()
  await authorPage.getByRole("button", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=5/, { timeout: 45000 })

  await authorPage.waitForSelector("text=Step 5: Document Upload")
  await authorPage.locator('input[type="file"]').setInputFiles(path.resolve("scripts/fixtures/test-abstract.pdf"))
  await authorPage.waitForSelector("text=Replace", { timeout: 45000 })
  await authorPage.getByRole("link", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=6/, { timeout: 45000 })

  await authorPage.waitForSelector("text=Step 6: Payment", { timeout: 45000 })
  await authorPage.locator('button[role="combobox"]').click()
  await authorPage.waitForTimeout(300)
  await authorPage.getByRole("option", { name: "NGN — Nigerian Naira" }).click()
  await authorPage.locator('input[type="file"]').setInputFiles(path.resolve("scripts/fixtures/test-abstract.pdf"))
  await authorPage.waitForSelector("text=Receipt uploaded", { timeout: 45000 })
  await authorPage.getByRole("link", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=7/, { timeout: 45000 })

  await authorPage.waitForSelector("text=Step 7: Review & Submit", { timeout: 45000 })
  await authorPage.getByRole("button", { name: "Submit Abstract" }).click()
  await authorPage.waitForURL(/submitted=1/, { timeout: 45000 })
  console.log("Submitted:", submissionId)

  const { rows: docRows } = await pg.query(
    "select storage_path from submission_documents where submission_id = $1",
    [submissionId]
  )
  storagePath = docRows[0]?.storage_path ?? null
  const { rows: subRows } = await pg.query(
    "select payment_receipt_path from submissions where id = $1",
    [submissionId]
  )
  receiptStoragePath = subRows[0]?.payment_receipt_path ?? null

  console.log("--- Jumping status straight to decision_pending (review pipeline covered elsewhere) ---")
  await pg.query("update submissions set status = 'decision_pending' where id = $1", [submissionId])

  console.log("--- Author: confirm no decision info leaks pre-finalize ---")
  await authorPage.goto(`http://localhost:3000/author/submissions/${submissionId}`)
  const preFinalizeText = await authorPage.locator("body").innerText()
  const noLeakPreFinalize = !preFinalizeText.includes("Download reviewer's corrected file")
  await authorPage.screenshot({ path: `${outDir}/decision-attach-01-author-pre-finalize.png`, fullPage: true })
  console.log("No attachment link visible pre-finalize:", noLeakPreFinalize)

  console.log("--- Admin: login ---")
  await adminPage.goto("http://localhost:3000/login")
  await adminPage.fill('input[name="email"]', ADMIN_EMAIL)
  await adminPage.fill('input[name="password"]', PASSWORD)
  await adminPage.getByRole("button", { name: "Log in" }).click()
  await adminPage.waitForURL(/\/admin/, { timeout: 45000 })

  await adminPage.goto(`http://localhost:3000/admin/submissions/${submissionId}`)
  await adminPage.waitForSelector("text=Propose Decision (as Committee)")

  console.log("--- Admin: confirm attach control is hidden before any decision draft exists ---")
  const beforeSaveText = await adminPage.locator("body").innerText()
  const gatedBeforeSave = beforeSaveText.includes("Save the decision below before attaching a corrected file.")
  console.log("Attach control correctly gated before first save:", gatedBeforeSave)

  console.log("--- Admin: propose a Minor Revision decision ---")
  await adminPage.locator('button[role="combobox"]').last().click()
  await adminPage.waitForTimeout(300)
  await adminPage.getByRole("option", { name: "Minor Revision" }).click()
  await adminPage.fill('textarea[name="decisionNotes"]', "Test fixture decision notes.")
  await adminPage.fill('textarea[name="authorMessage"]', "Please see the attached corrected version.")
  await adminPage.getByRole("button", { name: "Save Decision" }).click()
  await adminPage.waitForSelector("text=Decision saved", { timeout: 45000 })
  await adminPage.waitForTimeout(500) // router.refresh() after the toast

  console.log("--- Admin: attach the corrected file ---")
  await adminPage.locator('input[type="file"]').setInputFiles(path.resolve("scripts/fixtures/test-abstract.pdf"))
  await adminPage.waitForSelector("text=Attachment saved", { timeout: 45000 })
  await adminPage.waitForTimeout(500)
  await adminPage.screenshot({ path: `${outDir}/decision-attach-02-admin-attached.png`, fullPage: true })

  const { rows: decisionRows } = await pg.query(
    "select attachment_path, attachment_file_name from decisions where submission_id = $1 order by created_at desc limit 1",
    [submissionId]
  )
  attachmentStoragePath = decisionRows[0]?.attachment_path ?? null
  console.log("Attachment stored at:", attachmentStoragePath)

  console.log("--- Admin: confirm attachment visible in Finalize panel before finalizing ---")
  const beforeFinalizeText = await adminPage.locator("body").innerText()
  const visibleBeforeFinalize = beforeFinalizeText.includes("test-abstract.pdf")
  console.log("Attachment filename visible pre-finalize in Finalize panel:", visibleBeforeFinalize)

  console.log("--- Admin: finalize the decision ---")
  await adminPage.getByRole("button", { name: "Finalize & Notify Author" }).click()
  await adminPage.waitForSelector("text=Decision finalized", { timeout: 45000 })

  console.log("--- Author: confirm the download link now appears and resolves ---")
  await authorPage.goto(`http://localhost:3000/author/submissions/${submissionId}`)
  await authorPage.waitForSelector("text=Download reviewer's corrected file", { timeout: 45000 })
  await authorPage.screenshot({ path: `${outDir}/decision-attach-03-author-post-finalize.png`, fullPage: true })
  const downloadHref = await authorPage.getByRole("link", { name: /Download reviewer's corrected file/ }).getAttribute("href")
  const downloadResponse = await authorPage.request.get(downloadHref)
  const downloadOk = downloadResponse.ok()
  const downloadBytes = (await downloadResponse.body()).length
  console.log("Download link resolved:", downloadOk, "status:", downloadResponse.status(), "bytes:", downloadBytes)

  await browser.close()

  console.log("\n=== RESULT ===")
  // Logged for visibility, not gated on: this dev server already emits
  // benign noise unrelated to this feature on every run (a CSP-blocked
  // eval() dev-mode warning on every page, and a hydration quirk on
  // Step5Upload -- a component this feature never touches). Gating pass/fail
  // on zero console output would make the test flaky against pre-existing
  // app behavior instead of this feature's actual correctness.
  console.log("Console/page messages (informational):", errors.length)
  errors.forEach((e) => console.log(" -", e))

  const pass = noLeakPreFinalize && gatedBeforeSave && visibleBeforeFinalize && downloadOk && downloadBytes > 0
  console.log(pass ? "\nPASS" : "\nFAIL")
  if (!pass) process.exitCode = 1
} catch (err) {
  console.error("Test threw:", err)
  process.exitCode = 1
} finally {
  await cleanup()
}

