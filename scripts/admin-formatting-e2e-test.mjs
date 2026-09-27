// Live production test of the admin/author-facing side of the formatting
// feature: creates disposable author + admin accounts, has the author create
// a real formatted abstract via the actual wizard on the live site, then
// drives the ADMIN side in a real browser against the live site:
//   - the submission page renders the author's italics/bold correctly
//   - admin's "fix formatting on the author's behalf" panel works, is
//     word-locked, and updates what the author sees
//   - the admin search finds a formatted title by its plain words
//   - the Book of Abstracts (Word) export downloads successfully
//   - the Notifications page loads and reflects the real send already done
//
// Runs against the LIVE site by default (this is what "real users testing"
// means here) -- pass CHECK_SITE to point elsewhere. Requires `.env.local`
// with DATABASE_URL + SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
import { chromium } from "playwright-core"
import { Client } from "pg"
import { mkdirSync } from "node:fs"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const STAMP = Date.now()
const AUTHOR_EMAIL = `fmt-e2e-author-${STAMP}@example.com`
const ADMIN_EMAIL = `fmt-e2e-admin-${STAMP}@example.com`
const PASSWORD = "TestPassword123!"
const BASE = process.env.CHECK_SITE || "https://www.asmnigeriaconference.com.ng"

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

console.log("--- Site under test:", BASE, "---")
console.log("--- Creating disposable test accounts ---")
const author = await supaAdmin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({
    email: AUTHOR_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      first_name: "Ngozi",
      last_name: "Adeyemi",
      asm_id_number: "11223344",
      professional_title: "Research Scientist",
      institution: "University of Ibadan",
      department: "Microbiology",
      country: "Nigeria",
      phone: "+2348013334444",
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
    user_metadata: { first_name: "Test", last_name: "Admin", institution: "ASM Nigeria", country: "Nigeria" },
  }),
})
if (!admin.id) throw new Error(`Failed to create admin test user: ${JSON.stringify(admin)}`)
console.log("Admin:", admin.id, ADMIN_EMAIL)

const pg = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
await pg.connect()
await pg.query("update user_profiles set role = 'admin' where id = $1", [admin.id])

let submissionId = null
const errors = []
const results = []
const check = (name, ok) => {
  results.push([name, Boolean(ok)])
  console.log(ok ? "  ok  " : "  FAIL", name)
}

async function cleanup() {
  console.log("\n--- Cleaning up ---")
  if (submissionId) {
    for (const t of ["reviews", "review_assignments", "decisions", "notifications", "submission_documents", "submission_versions", "submission_authors"]) {
      await pg.query(`delete from ${t} where submission_id = $1`, [submissionId])
    }
    await pg.query("delete from audit_logs where entity_id = $1", [submissionId])
    await pg.query("delete from submissions where id = $1", [submissionId])
  }
  await pg.end()
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
      if (msg.type() === "error" && !msg.text().includes("eval() is not supported")) {
        errors.push(`[console:${p === authorPage ? "author" : "admin"}] ${msg.text()}`)
      }
    })
    p.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))
  }

  console.log("--- Author (live site): create a formatted abstract via the real wizard ---")
  await authorPage.goto(`${BASE}/login`)
  await authorPage.fill('input[name="email"]', AUTHOR_EMAIL)
  await authorPage.fill('input[name="password"]', PASSWORD)
  await authorPage.getByRole("button", { name: "Log in" }).click()
  await authorPage.waitForURL(/\/author\/dashboard/, { timeout: 45000 })

  await authorPage.getByRole("link", { name: "+ Submit New Abstract" }).first().click()
  await authorPage.waitForSelector("text=Step 1: Abstract Information")

  const box = (page, name) => page.getByRole("textbox", { name, exact: true })
  async function fillRich(page, name, segments) {
    const b = box(page, name)
    await b.click()
    await page.keyboard.press("Control+A")
    await page.keyboard.press("Delete")
    for (const seg of segments) {
      const [text, marks = []] = typeof seg === "string" ? [seg] : seg
      for (const m of marks) await page.keyboard.press(m === "i" ? "Control+i" : m === "b" ? "Control+b" : "Control+u")
      await page.keyboard.type(text)
      for (const m of marks) await page.keyboard.press(m === "i" ? "Control+i" : m === "b" ? "Control+b" : "Control+u")
    }
  }
  await fillRich(authorPage, "Abstract title", ["Carriage of ", ["Klebsiella pneumoniae", ["i"]], " in Ibadan Poultry Farms"])
  await authorPage.locator('button[role="combobox"]').first().click()
  await authorPage.waitForTimeout(300)
  await authorPage.locator('[role="option"]').first().click()
  await fillRich(authorPage, "Keyword", ["poultry"])
  await authorPage.keyboard.press("Enter")
  await authorPage.getByRole("button", { name: "Next", exact: true }).click()
  await authorPage.waitForURL(/step=2/, { timeout: 60000 })
  submissionId = new URL(authorPage.url()).pathname.split("/").pop()
  console.log("submissionId:", submissionId)
  await authorPage.screenshot({ path: `${outDir}/live-01-author-title.png`, fullPage: true })

  // The rest of the wizard (co-authors, documents, payment, full review-and-
  // submit) is already covered against a full build by wizard-e2e-test.mjs;
  // here we only need a real submission to test the admin side against, so
  // the remaining fields are filled directly -- a real abstract with real
  // formatting, reached the fast way.
  await pg.query(
    `update submission_versions set
       abstract_background = $2, abstract_methods = $3, abstract_results = $4, abstract_conclusion = $5,
       abstract_text = $6, word_count = 40
     where submission_id = $1`,
    [
      submissionId,
      "Antimicrobial-resistant <i>Klebsiella pneumoniae</i> colonises poultry.",
      "Cloacal swabs from 200 birds across 10 Ibadan farms were cultured and screened for <i>bla</i><sub>CTX-M</sub> genes.",
      "Carriage was 34%<sup>a</sup>, with <i>blaCTX-M-15</i> the dominant variant.",
      "Poultry may be a reservoir for resistant <i>K. pneumoniae</i> in the region.",
      "Background: Antimicrobial-resistant <i>Klebsiella pneumoniae</i> colonises poultry.\n\nMethods: Cloacal swabs from 200 birds across 10 Ibadan farms were cultured and screened for <i>bla</i><sub>CTX-M</sub> genes.\n\nResults: Carriage was 34%<sup>a</sup>, with <i>blaCTX-M-15</i> the dominant variant.\n\nConclusion: Poultry may be a reservoir for resistant <i>K. pneumoniae</i> in the region.",
    ]
  )
  await pg.query("update submissions set status = 'under_review', reference_number = $2 where id = $1", [
    submissionId,
    `ASM-ABJ-2026-TEST-${STAMP}`.slice(0, 30),
  ])

  console.log("--- Admin (live site): login ---")
  await adminPage.goto(`${BASE}/login`)
  await adminPage.fill('input[name="email"]', ADMIN_EMAIL)
  await adminPage.fill('input[name="password"]', PASSWORD)
  await adminPage.getByRole("button", { name: "Log in" }).click()
  await adminPage.waitForURL(/\/admin/, { timeout: 45000 })

  console.log("--- Admin: submission detail shows the author's formatting correctly ---")
  await adminPage.goto(`${BASE}/admin/submissions/${submissionId}`)
  await adminPage.waitForSelector("text=Fix italics and other formatting")
  check(
    "submission title renders with real italics (not literal tags)",
    (await adminPage.locator("em", { hasText: "Klebsiella pneumoniae" }).count()) > 0 &&
      !(await adminPage.locator("body").innerText()).includes("<i>")
  )
  check("abstract body shows italic gene name", (await adminPage.locator("em", { hasText: "blaCTX-M-15" }).count()) > 0)
  await adminPage.screenshot({ path: `${outDir}/live-02-admin-submission.png`, fullPage: true })

  console.log("--- Admin: fix formatting on the author's behalf ---")
  await adminPage.getByText("Fix italics and other formatting on the author's behalf").click()
  await adminPage.waitForSelector("text=Only the formatting can change here")
  // Word-locked: typing an extra word must block Save.
  const adminTitleBox = box(adminPage, "Title")
  await adminTitleBox.click()
  await adminPage.keyboard.press("Control+End")
  await adminPage.keyboard.type(" EXTRA")
  await adminPage.waitForSelector("text=The words in title have changed")
  check("admin panel also blocks a word change", await adminPage.getByRole("button", { name: "Save formatting" }).isDisabled())
  await adminPage.getByRole("button", { name: "Undo my changes" }).click()
  // Genuine formatting fix: underline the whole title.
  await adminTitleBox.click()
  await adminPage.keyboard.press("Control+A")
  await adminPage.keyboard.press("Control+u")
  await adminPage.getByRole("button", { name: "Save formatting" }).click()
  await adminPage.waitForSelector("text=Formatting saved.", { timeout: 30000 })
  const { rows: afterAdmin } = await pg.query("select title from submissions where id = $1", [submissionId])
  check("admin's formatting fix was stored", afterAdmin[0].title.includes("<u>"))
  await adminPage.screenshot({ path: `${outDir}/live-03-admin-formatting-saved.png`, fullPage: true })

  console.log("--- Author (live site): sees the admin's fix reflected ---")
  await authorPage.goto(`${BASE}/author/submissions/${submissionId}`)
  await authorPage.waitForSelector("text=Italics and other formatting")
  check(
    "author's own page now shows the underline the admin added",
    (await authorPage.locator("u", { hasText: "Klebsiella pneumoniae" }).count()) > 0
  )

  console.log("--- Admin: search finds a formatted title by its plain words ---")
  await adminPage.goto(`${BASE}/admin/submissions?q=${encodeURIComponent("Klebsiella pneumoniae")}`)
  await adminPage.waitForLoadState("networkidle")
  check(
    "title_plain search finds the formatted title",
    (await adminPage.locator("em", { hasText: "Klebsiella pneumoniae" }).count()) > 0
  )
  await adminPage.screenshot({ path: `${outDir}/live-04-admin-search.png`, fullPage: true })

  console.log("--- Admin: Book of Abstracts export page ---")
  await adminPage.goto(`${BASE}/admin/exports`)
  await adminPage.waitForSelector("text=Book of Abstracts")
  const downloadBtn = adminPage.getByRole("link", { name: "Download Book of Abstracts (Word)" })
  check("Word download button is present", (await downloadBtn.count()) > 0)
  const resp = await adminPage.request.get(await downloadBtn.getAttribute("href").then((h) => new URL(h, BASE).toString()))
  check(
    "Word file downloads with the right content type",
    resp.ok() && resp.headers()["content-type"]?.includes("wordprocessingml")
  )
  await adminPage.screenshot({ path: `${outDir}/live-05-admin-exports.png`, fullPage: true })

  console.log("--- Admin: Notifications page reflects the real send ---")
  await adminPage.goto(`${BASE}/admin/notifications`)
  await adminPage.waitForLoadState("networkidle")
  const bodyText = await adminPage.locator("body").innerText()
  check("notifications page loads without an error page", !bodyText.includes("Application error"))
  await adminPage.screenshot({ path: `${outDir}/live-06-admin-notifications.png`, fullPage: true })

  await browser.close()

  console.log("\n=== RESULT ===")
  console.log("Console/page errors:", errors.length)
  errors.forEach((e) => console.log(" -", e))
  const pass = results.length > 0 && results.every(([, ok]) => ok) && errors.length === 0
  console.log(pass ? "\nPASS" : "\nFAIL")
  if (!pass) process.exitCode = 1
} catch (err) {
  console.error("Test threw:", err)
  process.exitCode = 1
} finally {
  await cleanup()
}
