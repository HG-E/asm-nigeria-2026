# ASM Nigeria 2026 — Implementation Plan

## 1. Current project state

**GitHub repo** (`HG-E/asm-nigeria-2026`): was empty prior to this session — no commits, no branches. All application code in this repo was scaffolded from scratch in this session (Next.js 16, TypeScript, Tailwind v4, shadcn/ui `base-nova` style, Supabase client/server/admin helpers, `proxy.ts` route gate).

**Supabase project** (`ykkgzqeicyqfglvnzrri`, `eu-west-1`): substantially pre-built, independently of this repo, before this session started. Verified by direct schema introspection:

- 13 tables (`user_profiles`, `conferences`, `conference_subthemes`, `reviewer_profiles`, `committee_members`, `submissions`, `submission_versions`, `submission_documents`, `submission_authors`, `review_assignments`, `reviews`, `decisions`, `notifications`, `audit_logs`), all with RLS enabled.
- Role hierarchy via `auth_has_role()` / `auth_user_role()` (author < reviewer < committee < admin < super_admin).
- `handle_new_user()` trigger auto-creates a `user_profiles` row (role `author`) on signup.
- `generate_reference_number()` atomically issues `ASM-ABJ-2026-00001`-style references per conference.
- Private `abstracts` storage bucket (10MB limit, pdf/doc/docx only) with owner-scoped RLS policies.
- Real seed data: **First ASM Nigeria Conference** (theme *"ONE HEALTH IN ACTION"*), Abuja, Nov 22–25 2026, with 5 real subthemes — confirmed accurate by the project owner.
- Zero registered users, zero reviewers, zero submissions.

**Fixes applied this session** (both captured as migrations in `supabase/migrations/`, already run against the live DB):

1. `0001_fix_handle_new_user_search_path.sql` — registration was completely broken (`Database error creating new user` on every signup). Root cause: `supabase_auth_admin`'s `search_path` is locked to `auth` only, and `handle_new_user()` referenced the `user_role` enum unqualified, so the cast failed silently under GoTrue's session. Fixed by pinning the function's own `search_path`. Verified end-to-end with a disposable test signup.
2. `0002_scope_reviewer_access_to_assignments.sql` — the SELECT policies on `submissions`, `submission_authors`, `submission_documents`, and `submission_versions` granted **any** reviewer read access to **every** submission, not just their assigned ones (violates spec §43: "Reviewer: Can only access assigned submissions"). Added `auth_is_assigned_reviewer()` and tightened all four policies. Committee/admin/super_admin visibility is unaffected.

## 2. Missing / not yet configured

- All application code (this is the bulk of the remaining work — see phases below).
- Email: no SMTP credentials configured yet (spec requires free-tier SMTP).
- Auth → URL Configuration (Site URL / Redirect URLs) not yet verified for `http://localhost:3000` and the eventual Vercel production URL.
- `conferences.website` currently holds a placeholder (`https://www.asm.org`) — needs the real conference site or removal.
- 5 reviewers and committee members not yet created (need real names/emails from the project owner — not invented, per spec §57).
- `SUPABASE_SERVICE_ROLE_KEY` obtained and stored in `.env.local` (git-ignored); Vercel env vars not yet configured (no deployment yet).

## 3. Proposed architecture

- **Next.js 16 App Router**, TypeScript, Server Components by default; Client Components only where interactivity requires it (multi-step form, live word count, file upload).
- **Route protection**: `proxy.ts` (Next 16 renamed `middleware.ts`) refreshes the Supabase session and redirects unauthenticated users away from `/author`, `/reviewer`, `/committee`, `/admin`. Actual **role** authorization happens server-side per page/action via `lib/auth.ts` (never trust client-declared role — matches spec §42/43) — RLS is the final backstop either way.
- **Data access**: Server Components and Server Actions use `lib/supabase/server.ts` (RLS-scoped, user's own session). Privileged operations (exports, admin reassignment, sending notifications) use `lib/supabase/admin.ts` (service role, bypasses RLS) — server-only, never imported into client code.
- **Validation**: Zod schemas in `lib/validations/`, shared between client-side React Hook Form and server-side re-validation in Server Actions (never trust client validation alone).
- **File uploads**: direct-to-Supabase-Storage from the client using a short-lived signed upload URL issued by a Server Action; downloads via signed URLs generated on demand, never public bucket URLs.
- **Next.js 16 specifics this build must respect**: `cookies()`/`params`/`searchParams` are async everywhere; route-gating file is `proxy.ts` (not `middleware.ts`) exporting `proxy()`.

## 4. Database schema plan

No new tables planned — the existing schema already covers the spec. Two structural notes carried forward from the existing design (not spec-required, but reasonable, and cheaper to build against than to fight):

- Declarations are fixed boolean/text columns on `submissions` (`no_conflict_of_interest`, `ethical_approval_obtained`, `funding_declaration`, `originality_confirmed`) rather than a separate configurable-declarations table. Matches spec §15's MVP allowance ("implement the required declarations as configured for the conference").
- `reviewer_profiles` links one reviewer to one subtheme per row (not a many-to-many join table) — a reviewer covering multiple subthemes gets multiple rows. Fine for 5 reviewers.

## 5. Authentication plan (Phase 1)

- Supabase Auth, email/password, email confirmation required before login.
- Register → Supabase `signUp()` with `user_metadata` (first/last name, professional title, institution, department, country, phone, ORCID) → `handle_new_user()` trigger creates the `user_profiles` row.
- Only the `author` role self-registers. Reviewer/committee/admin/super_admin accounts are created directly by an admin (Phase 3 admin UI), matching spec §21 ("the actual names... should be stored in the database... rather than hard-coded").
- Login, logout, forgot-password/reset via Supabase Auth's standard flows.

## 6. Role/permission plan

Enforced in three layers, outermost to innermost:
1. `proxy.ts` — authenticated vs. not, per route prefix.
2. Server Component/Action guards (`lib/auth.ts`) — fetch `user_profiles.role`, reject if the page/action requires a higher role.
3. RLS policies (already in place, tightened this session) — the actual trust boundary; layers 1–2 exist for UX (clean redirects/errors) and to fail closed even if a layer above has a bug.

## 7. Submission workflow (Phase 2)

Multi-step form (`/author/submissions/new`) per spec §11–19: Abstract Info → Authors → Content (live word count against `conferences.abstract_word_limit`) → Declarations → Document Upload → Review & Submit. Draft autosave on each step. On final submit: validate everything server-side again, call `generate_reference_number()`, flip status `draft → submitted`, write an audit log row, insert a `notifications` row (acknowledgement). A `submission_client_token`-style idempotency guard is needed for the submit action to prevent double-submit on refresh/double-click (not yet present in the schema — will add as a small migration when building this phase, or dedupe via a unique partial index / advisory lock at submit time).

## 8. Reviewer workflow (Phase 4)

Reviewer dashboard shows only `review_assignments` rows for `auth.uid()`. Conflict-of-interest declaration locks the assignment and notifies admin/committee for reassignment (spec §26). Double-blind: reviewer-facing queries never select author/institution columns for `blind_review_mode = 'double'` conferences (already enforced at the RLS layer as of migration 0002). Review form: 5 criteria × 1–5, `average_score` is a generated column; recommendation reuses `decision_type` enum; submitting a review sets `is_submitted = true` and the RLS `WITH CHECK` prevents further edits.

## 9. Decision workflow (Phase 5)

Committee creates a `decisions` row (`is_final = false`) with recommendation + notes; only `admin`/`super_admin` can flip `is_final = true` per the existing RLS `WITH CHECK` — read as "committee proposes, admin/super_admin countersigns," a reasonable tightening of spec §30's "committee decision is authoritative" for a 5-reviewer/small-committee conference. Revision requests never overwrite `submission_versions`; a new version row is appended and the author is routed back to a revision-scoped submit flow.

## 10. Notification workflow (Phase 6)

Free-tier SMTP (need credentials from project owner — Gmail SMTP, Brevo, or similar). Every send recorded in `notifications` (already schema'd: recipient, subject, status, error, retry_count). Triggers: submission acknowledgement, reviewer assignment, revision required, final decision. Failed sends never block or delete the underlying submission (spec §33).

## 11. Deployment plan (Phase 8)

Vercel, connected to `HG-E/asm-nigeria-2026`. Env vars mirrored from `.env.local` (public Supabase URL/anon key as `NEXT_PUBLIC_*`, service role key and SMTP creds as server-only Vercel env vars, never in client bundle). Supabase Auth Site URL/Redirect URLs updated to the production domain before go-live.

## 12. Testing plan (Phase 8)

Follow spec §47 checklist as each phase lands, rather than deferring all testing to the end: registration + duplicate-email + verification on Phase 1/2, submission + draft + duplicate-submit protection on Phase 2, routing + conflict-of-interest + reassignment on Phase 4, cross-role unauthorized-access attempts (author→author, author→reviewer, reviewer→reviewer, reviewer→admin) on every phase that adds a new role surface, since RLS is the real backstop and is cheapest to verify incrementally.

## 13. Immediate next steps (this session, pending approval)

Phase 1 foundation (scaffold, Supabase clients, `proxy.ts`, DB fixes above) is done. Next: build the auth pages (register/login/verify-email/forgot-password) and wire the author dashboard shell, since that's the critical path to a working end-to-end demo and doesn't require reviewer names or SMTP to be useful.
