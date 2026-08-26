// Scans the live database for leftover test/smoke-test artifacts -- run
// this after any testing session that wrote to the real (not local-only)
// Supabase project, to catch what a script's own cleanup missed rather
// than trusting it silently succeeded.
//
// Usage: node --env-file=.env.local scripts/check-test-data.mjs
// Exit code 0 = clean, 1 = stray data found (also prints what and where).

import { createClient } from "@supabase/supabase-js"

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Patterns real ASM Nigeria data would never legitimately match --
// every disposable account/row created during testing this project uses
// one of these markers (see e.g. the `smoke-*@example.com` convention).
const EMAIL_LIKE = "%smoke%,%@example.com,%test-fixture%"
const REF_LIKE = "%TEST%,%SMOKE%"

let strayCount = 0

async function reportRows(label, query) {
  const { data, error } = await query
  if (error) {
    console.log(`[ERROR] ${label}: ${error.message}`)
    return
  }
  if (data && data.length > 0) {
    strayCount += data.length
    console.log(`\n[FOUND] ${label} (${data.length}):`)
    console.log(JSON.stringify(data, null, 2))
  }
}

await reportRows(
  "conference_registrations by email",
  admin.from("conference_registrations").select("id, reference_number, email, created_at").or(
    EMAIL_LIKE.split(",").map((p) => `email.ilike.${p}`).join(",")
  )
)

await reportRows(
  "submissions by reference_number",
  admin.from("submissions").select("id, reference_number, created_at").or(
    REF_LIKE.split(",").map((p) => `reference_number.ilike.${p}`).join(",")
  )
)

await reportRows(
  "user_profiles by email",
  admin.from("user_profiles").select("id, email, role, created_at").or(
    EMAIL_LIKE.split(",").map((p) => `email.ilike.${p}`).join(",")
  )
)

await reportRows(
  "notifications by recipient_email",
  admin.from("notifications").select("id, notification_type, recipient_email, created_at").or(
    EMAIL_LIKE.split(",").map((p) => `recipient_email.ilike.${p}`).join(",")
  )
)

console.log(strayCount === 0 ? "\nClean -- no stray test data found." : `\n${strayCount} stray row(s) found above -- clean these up before treating the DB as production-accurate.`)
process.exit(strayCount === 0 ? 0 : 1)
