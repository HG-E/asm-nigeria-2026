// Drives the app end-to-end in a real browser: home -> register -> submit ->
// login -> confirms unauthenticated /author/dashboard redirects to /login.
// Requires `npm run dev` running on :3000 first.
//
// Uses playwright-core against a locally installed Chrome/Edge instead of
// Playwright's bundled Chromium, since downloading that binary is blocked in
// this environment. Update CHROME_PATH if Chrome isn't at the default
// Windows install location, or point it at msedge.exe instead.
//
// Note: Supabase's built-in free-tier email sender rate-limits after a
// handful of sends per hour. If registration hangs at "email rate limit
// exceeded", that's Supabase's quota, not an app bug -- wait or configure
// custom SMTP (see IMPLEMENTATION_PLAN.md).
import { chromium } from "playwright-core"
import { mkdirSync } from "node:fs"

const CHROME_PATH = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"

const outDir = "scripts/.smoke-screenshots"
mkdirSync(outDir, { recursive: true })

const testEmail = `smoke-test-${Date.now()}@asm-nigeria-smoketest.dev`
const errors = []

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
})
const page = await browser.newPage()
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(`[console] ${msg.text()}`)
})
page.on("pageerror", (err) => errors.push(`[pageerror] ${err.message}`))
page.on("requestfailed", (req) => {
  errors.push(`[requestfailed] ${req.method()} ${req.url()} - ${req.failure()?.errorText}`)
})

async function shot(name) {
  await page.screenshot({ path: `${outDir}/${name}.png`, fullPage: true })
  console.log(`Screenshot: ${outDir}/${name}.png`)
}

console.log("--- Home page ---")
await page.goto("http://localhost:3000")
await page.waitForSelector("text=Abstract Management System")
await shot("01-home")

console.log("--- Register page ---")
await page.getByRole("link", { name: "Register as an author" }).click()
await page.waitForSelector("text=Create an author account")
await shot("02-register-empty")

await page.fill('input[name="firstName"]', "Amaka")
await page.fill('input[name="lastName"]', "Okafor")
await page.fill('input[name="email"]', testEmail)
await page.fill('input[name="password"]', "TestPassword123!")
await page.fill('input[name="confirmPassword"]', "TestPassword123!")
await page.fill('input[name="professionalTitle"]', "Research Scientist")
await page.fill('input[name="institution"]', "University of Abuja")
await page.fill('input[name="department"]', "Microbiology")
await page.fill('input[name="country"]', "Nigeria")
await page.fill('input[name="phone"]', "+2348012345678")
await shot("03-register-filled")

await page.getByText("I agree to the conference terms").click()
await page.getByText("I acknowledge the privacy").click()

console.log(`--- Submitting registration for ${testEmail} ---`)
await page.getByRole("button", { name: "Register" }).click()
try {
  await page.waitForSelector("text=Check your email", { timeout: 30000 })
  await shot("04-register-success")
} catch {
  await shot("04-register-FAILED-timeout")
  console.log("!!! Did not see 'Check your email' within 30s. Page text:")
  console.log(await page.locator("body").innerText())
}

console.log("--- Login page ---")
try {
  await page.getByRole("button", { name: "Go to login" }).click()
  await page.waitForSelector("text=Log in", { timeout: 10000 })
} catch {
  await page.goto("http://localhost:3000/login")
  await page.waitForSelector("text=Log in")
}
await shot("05-login")

console.log("--- Unauthenticated dashboard access ---")
await page.goto("http://localhost:3000/author/dashboard")
await page.waitForURL(/\/login/, { timeout: 10000 })
await shot("06-dashboard-redirected-to-login")

await browser.close()

console.log("\n=== RESULT ===")
console.log("Test email used:", testEmail)
console.log("Final URL after unauthenticated dashboard visit:", page.url())
console.log("Console/network errors captured:", errors.length)
errors.forEach((e) => console.log(" -", e))
