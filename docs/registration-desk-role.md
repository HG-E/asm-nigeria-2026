# Registration-desk role for the registration team

## Context

Two real people who staff registration/accreditation — Dr. Ngozika Okey-Ndeche
(`ngoziokeyndeche@gmail.com`) and Dr. Theresa Ozoude (`ozoudet@veritas.edu.ng`),
both already listed on the site's own Registration & Accreditation Committee —
need to monitor and download the conference registrations list themselves, for
badge printing. The user explicitly chose to build a scoped role for this
rather than granting full admin (which would also expose abstract content,
reviewer identities/scores, decisions, and audit logs) or skipping accounts
entirely.

**Verified from the actual RLS/auth code before designing anything:**
- `user_role` enum (`author < reviewer < committee < admin < super_admin`)
  lives in an untracked base schema; this repo has never added a role via
  migration before, but `ALTER TYPE ... ADD VALUE` is the standard way.
- The real trust boundary is `public.auth_has_role()` (Postgres), a
  **hardcoded list-membership CASE per caller role** (not a numeric/rank
  comparison) — every branch is an explicit `in (...)` list. A brand-new role
  value automatically falls into every branch's implicit `else false`, so it
  gets **zero access to anything currently gated this way** (submissions,
  documents, payments, subthemes, contact messages, and both existing
  `conference_registrations` policies) with **zero risk of widening any
  existing policy** — confirmed by reading the live function body in
  `supabase/migrations/0011_fix_auth_has_role_keyword_shadowing.sql`.
- `conference_registrations` has exactly two RLS policies (migration `0022`),
  both gated on `auth_has_role('admin')`. Multiple permissive `for select`
  policies on one table combine via OR in Postgres, so a new, independent
  read-only policy for the new role doesn't need to touch or repeat those.
- `/admin/exports/[dataset]/route.ts` serves **all 10 export datasets**
  (including review scores, decisions, author emails) behind one blanket
  `requireRole("admin")` with no per-dataset scoping — reusing it for this
  role would leak everything else. A dedicated route hardcoded to the
  `conference-registrations` slug avoids this entirely, and since that route
  uses the session-bound client (not service-role), RLS is a second, real
  backstop even if the route logic were ever copied wrong.
- Real staff-account creation already has a proven pattern:
  `addCommitteeMemberAction` (`app/admin/committee/actions.ts`) —
  `createAdminClient().auth.admin.createUser({ user_metadata: { role: ... } })`
  → (role-specific table insert, not needed here) →
  `sendAccountWelcomeEmail()` (fully generic, `roleLabel` is free text) — a
  Supabase recovery-link email so the person sets their own password.
- Postgres forbids referencing a freshly-added enum value in the same
  transaction that added it, and `scripts/apply-migration.mjs` wraps each
  file in one `BEGIN...COMMIT` — so the enum addition and the policy that
  references it **must** be two separate migration files/invocations.

## Design

A new `registration_desk` role, rank `0` (same tier as `author`) in the
TypeScript-side `ROLE_RANK` floor-check — it must lose every
`requireRole("reviewer"|"committee"|"admin"|"super_admin")` check (every real
call site in the repo uses one of those four), and needs no special slot
since it's granted access "beside" the ladder via a bespoke helper, not
through `requireRole()`'s floor semantics.

One new isolated route tree, `/registration-desk`, outside `/admin` entirely
— a single read-only registrations list (no payment-verify/attended-toggle
controls, since this role has no update rights and shouldn't see buttons
that would just fail) plus a dedicated CSV/XLSX download route hardcoded to
one dataset. Real admins can still reach it too (existing admins already see
`/admin/registrations`).

Account creation reuses the existing "admin adds a staff member" UI pattern
(`/admin/committee`) rather than a one-off script — a page is lower-friction
for any future registration-desk hires and keeps this consistent with how
every other staff role in this app is created.

### 1. `supabase/migrations/0031_add_registration_desk_role.sql` (new, apply first, alone)

```sql
-- Adds the registration_desk role: two named registration/accreditation
-- staff who need read + CSV/XLSX export access to conference_registrations
-- only -- not submissions, reviews, decisions, committee data, or any other
-- admin surface. This migration ONLY adds the enum label; the RLS policy
-- that references it must be a separate migration/transaction (Postgres
-- forbids using a new enum value in the same transaction that added it).
alter type user_role add value 'registration_desk';
```

Apply with `node --env-file=.env.local scripts/apply-migration.mjs supabase/migrations/0031_add_registration_desk_role.sql`, confirm it commits, **then** apply migration 2 as a fully separate invocation.

### 2. `supabase/migrations/0032_registration_desk_rls.sql` (new, apply second)

```sql
-- Second, independent SELECT policy on conference_registrations for the new
-- registration_desk role. Multiple permissive `for select` policies combine
-- via OR, so this doesn't touch or repeat the existing admin policies (0022)
-- -- admins keep exactly what they have today. No insert/update policy:
-- this role is read-only, matching the scope requested.
create policy registration_desk_read_conference_registrations on conference_registrations for select
using (auth_user_role() = 'registration_desk'::user_role);
```

(`auth_user_role()` already exists and is used for this exact non-hierarchical, exact-role-match shape elsewhere, e.g. migration `0002`'s reviewer checks.)

### 3. `types/database.ts` — hand-edit (no codegen script in this repo)

Extend the `user_role` union (currently `"author" | "reviewer" | "committee" | "admin" | "super_admin"`) to append `| "registration_desk"`.

### 4. `lib/auth.ts`

- Add `registration_desk: 0,` to `ROLE_RANK`.
- Add a bespoke helper (not `requireRole()`, since this role needs access "beside" the linear floor, not "at or above" it):
```ts
export async function requireRegistrationAccess() {
  const session = await requireAuth()
  const role = session.profile.role
  if (role !== "registration_desk" && ROLE_RANK[role] < ROLE_RANK.admin) {
    redirect("/")
  }
  return session
}
```

### 5. `lib/validations/registration-desk.ts` (new)

```ts
import { z } from "zod"

export const addRegistrationDeskMemberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.email("Enter a valid email address"),
  institution: z.string().trim().optional().or(z.literal("")),
})
export type AddRegistrationDeskMemberInput = z.infer<typeof addRegistrationDeskMemberSchema>
```

### 6. `app/admin/registration-desk/actions.ts` (new)

Mirror `addCommitteeMemberAction` (`app/admin/committee/actions.ts`) closely:
- `requireRole("admin")`.
- Validate via the new schema.
- `createAdminClient().auth.admin.createUser({ email, password: <generateTempPassword()>, email_confirm: true, user_metadata: { first_name, last_name, role: "registration_desk", institution: institution || "" } })`.
- On `createError?.code === "email_exists"`, return `{ error: "A user with this email already exists." }`.
- **No** auxiliary table insert (no `committee_members` equivalent — `user_profiles.role` alone is sufficient here, no subtheme/conference-scoping metadata needed).
- `sendAccountWelcomeEmail({ admin, email, firstName, roleLabel: "registration desk", origin })` (fully generic already, reused as-is).
- `revalidatePath("/admin/registration-desk")`, return `{ success: true, emailSent }`.

### 7. `app/admin/registration-desk/page.tsx` (new) + `components/admin/add-registration-desk-form.tsx` (new)

Mirror `app/admin/committee/page.tsx` + `components/admin/add-committee-form.tsx`:
- `requireRole("admin")`, query `user_profiles` where `role = 'registration_desk'`, list name/email/institution/created_at.
- Form: first name, last name, email, institution (optional) — no ASM ID, no title fields.
- No deactivate/delete control in v1 (YAGNI — nothing currently needs an `is_active` toggle for this role; revoking later is a one-line `update user_profiles set role = 'author'` if ever needed).

### 8. `app/admin/layout.tsx`

Add `{ href: "/admin/registration-desk", label: "Registration Desk" }` to `NAV`, after `"Committee"`.

### 9. `app/registration-desk/layout.tsx` (new)

Minimal header mirroring `app/admin/layout.tsx` (brand mark, user name, logout form) but gated with `requireRegistrationAccess()`, no nav links (this role has exactly one page).

### 10. `app/registration-desk/page.tsx` (new)

Trimmed copy of `app/admin/registrations/page.tsx`'s query/search/filter shape (`q`, `status` search params; signed URLs for receipt/photo/certificate via `createAdminClient()`, since that storage bucket has no client-reachable RLS at all — matches the admin page's own pattern exactly) — gated by `requireRegistrationAccess()` instead of `requireRole("admin")`. **Omit** `AttendedToggle` and `RegistrationVerificationPanel` entirely. Two download links (styled like `/admin/exports`'s cards) pointing at `/registration-desk/export?format=csv` / `?format=xlsx` — not the general admin exports route.

### 11. `app/registration-desk/export/route.ts` (new)

```ts
import { NextResponse } from "next/server"
import { toCsv, toXlsx } from "@/lib/exports/format"
import { getDataset } from "@/lib/exports/datasets"
import { requireRegistrationAccess } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  await requireRegistrationAccess()
  const dataset = getDataset("conference-registrations")! // hardcoded -- never accepts a slug param
  const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
  const supabase = await createClient()
  const { headers, rows } = await dataset.fetch(supabase)
  const filename = `asm-nigeria-2026-conference-registrations.${format}`
  if (format === "xlsx") {
    const buffer = await toXlsx(headers, rows, dataset.label)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  }
  const csv = toCsv(headers, rows)
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"` },
  })
}
```

Uses the session-bound `createClient()` (matching the general exports route) — RLS (migration `0032`) is what actually scopes the rows, so even a future copy-paste mistake here can't leak other data.

### Real account creation

No script. After deploying, log into `/admin/registration-desk` in a browser and submit the form twice:
- `ngoziokeyndeche@gmail.com` — Ngozika / Okey-Ndeche, Veritas University Abuja
- `ozoudet@veritas.edu.ng` — Theresa / Ozoude, Veritas University

## Verification

1. `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` — clean (this is what catches a missed `ROLE_RANK.registration_desk` entry once `types/database.ts` is extended).
2. Apply migrations `0031` then `0032` as two **separate** invocations against the real project.
3. Policy check: confirm `conference_registrations` now has three policies (`admin_read...`, `admin_update...`, `registration_desk_read...`) with the new one's `qual` showing `auth_user_role() = 'registration_desk'::user_role`.
4. Live RLS check with a **disposable** test account (`*@example.com`, per `scripts/check-test-data.mjs`'s existing patterns — never the two real people): create via `createAdminClient().auth.admin.createUser` with `user_metadata.role: "registration_desk"`, confirm it can read `conference_registrations` but gets zero rows (not an error) from `submissions`/`reviews`/`decisions`/`committee_members`/`audit_logs`, and that an `update conference_registrations` attempt is rejected.
5. Browser check with that same disposable account: `/registration-desk` renders the list with no action buttons; `/registration-desk/export?format=csv` and `?format=xlsx` download correctly; any `/admin/*` page redirects to `/`.
6. Confirm the welcome email path works unchanged with `roleLabel: "registration desk"` (same code as committee/reviewer, just a different label string).
7. Delete the disposable test account (`admin.auth.admin.deleteUser`), then run `node --env-file=.env.local scripts/check-test-data.mjs` to confirm clean. **Do not** touch the two real accounts — they're the actual deliverable, not test data.
8. Commit, push, wait for Vercel deploy, verify live: confirm `/registration-desk` and `/admin/registration-desk` both compile/redirect correctly (unauthenticated → login), then create the two real accounts through the live admin UI.
