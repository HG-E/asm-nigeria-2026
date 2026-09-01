# Committee-attached corrected abstracts + registration export

## Context

Product owner feedback (relayed by the convener) raised two gaps:

1. **Abstract review loop**: reviewers can only leave text comments today — there's no way to hand an author back an annotated/corrected copy of their file. She wants: reviewer/committee uploads a corrected version → author sees it, fixes their abstract, resubmits. (Confirmed separately: authors already see clear accept/reject/revision status on their dashboard — no work needed there.)
2. **Registration data**: the registration team needs the live attendee list in a spreadsheet they can pull themselves, to compile and print event badges — without duplicates. Duplicate prevention already exists at signup (unique-email constraint). The admin export tool already produces both CSV and XLSX, just not for registrations yet.

Investigated the existing codebase before proposing anything — both features are additive to systems that already exist and work, not new subsystems.

**Confirmed with the user:** a committee-attached file should follow the *same visibility gate* the existing `author_message` already uses — invisible to the author until the committee's decision is **finalized** by an admin (`decisions.is_final = true`), not the moment a reviewer/committee member uploads it. This preserves the app's existing two-stage review privacy model (individual reviewer comments never leak to the author; only one finalized, committee-owned message does).

## Part 1 — Committee decision attachment

**Design summary:** a decision (`decisions` row) gets two new nullable columns, `attachment_path` / `attachment_file_name`. A committee member uploads via a Server Action (matching every other mutation in this codebase — `proposeDecisionAction`, `finalizeDecisionAction` are the pattern, not a Route Handler) into a **policy-less, service-role-only** storage bucket `decision-attachments` — the same shape as the existing `registration-receipts` bucket (zero `storage.objects` RLS; all reads/writes go through `createAdminClient()`, downloads served as server-signed URLs). This sidesteps needing to write any new RLS at all: the `decisions` table's row-level policies are untracked in migrations but already proven (via `proposeDecisionAction`) to let committee insert/update rows, and adding *columns* doesn't touch RLS.

Reusing the existing `abstracts` bucket / `submission_documents` table was considered and rejected — that table's RLS is entirely author-shaped (`uploaded_by = auth.uid()` AND submission status `draft`/`revision_required`), which never holds true during the review/decision phase, and it already carries a single-current-document invariant meant for the author's own file.

Because the attachment lives on the `decisions` row (not `submissions`), it automatically scopes itself per revision cycle for free: `proposeDecisionAction` already starts a **fresh** decision row once the prior one is finalized, so a new round never inherits the old round's attachment.

### 1. `supabase/migrations/0030_decision_attachments.sql`

```sql
-- Lets committee attach a corrected/annotated file to a decision. Scoped to
-- the decisions row (not submissions), so it automatically follows the same
-- per-revision-cycle scoping author_message/revision_deadline already have:
-- proposeDecisionAction starts a fresh decisions row once the prior one is
-- is_final, so a new round never inherits the old round's attachment.
alter table decisions
  add column attachment_path text,
  add column attachment_file_name text;

-- Private bucket, same shape as registration-receipts (0022): zero
-- storage.objects RLS policies by design. Every access -- committee upload,
-- admin/author read via signed URL -- goes through the service-role admin
-- client, never direct browser-to-storage, so there's no RLS to write here.
-- No allowed_mime_types restriction: accepted extensions are governed by
-- conferences.allowed_file_types at the application layer (same as the
-- abstracts bucket), not fixed at the bucket level. file_size_limit is a
-- hard backstop above the per-conference max_file_size_mb app check.
insert into storage.buckets (id, name, public, file_size_limit)
values ('decision-attachments', 'decision-attachments', false, 26214400);
```

### 2. `types/database.ts` — hand-edit `decisions`

Added `attachment_path: string | null` / `attachment_file_name: string | null` to `Row`, `Insert`, and `Update` (optional `?` on Insert/Update, matching the existing style for nullable columns like `author_message`).

### 3. `app/committee/submissions/[id]/actions.ts` — new action

`uploadDecisionAttachmentAction(submissionId: string, formData: FormData): Promise<ActionResult>`:
- `requireRole("committee")`.
- Reads `formData.get("file")`, rejects if not a non-empty `File`.
- Looks up the submission's latest `decisions` row (`select id, is_final, attachment_path`, order by `created_at desc`, `limit(1)`); errors "Save the decision before attaching a file." if none exists; errors "This decision has already been finalized and can no longer be changed." if `is_final`.
- Validates extension against `getActiveConference()`'s `allowed_file_types` and size against `max_file_size_mb * 1024 * 1024` (same rule as author uploads in `recordDocumentAction`).
- Uploads via `createAdminClient().storage.from("decision-attachments")` to path `${submissionId}/${draft.id}-${Date.now()}-${sanitizeForPath(file.name)}` (sanitize only the path component — strip to `[a-zA-Z0-9._-]`, cap length; keeps the **original** filename in `attachment_file_name` for display/download-as).
- Updates the `decisions` row's two new columns via the normal session-bound `createClient()`.
- If replacing an existing attachment, deletes the old storage object after the DB update succeeds (best-effort).
- Inserts an `audit_logs` row: `action: "decision_attachment_uploaded"`, `entity_type: "submission"`, `entity_id: submissionId`, `metadata: { decision_id, file_name }`.
- `revalidatePath` both `/committee/submissions/${submissionId}` and `/admin/submissions/${submissionId}`.

No "remove attachment" action for v1 — replacing via re-upload already overwrites path/filename and deletes the old object.

### 4. `components/committee/decision-attachment-upload.tsx` (new client component)

Small file-input control, calls the Server Action directly. Props: `submissionId`, `decisionId: string | null`, `currentFileName: string | null`, `downloadUrl: string | null`. If `decisionId` is null, renders only: "Save the decision below before attaching a corrected file." Otherwise shows current filename (linked to `downloadUrl` if present) with a note that it isn't visible to the author until finalized; a button opens a hidden `<input type="file">`; toast + `router.refresh()` on success.

### 5. `app/committee/submissions/[id]/page.tsx` — wired in

After computing `draftDecision`, if it has `attachment_path`, signs a URL (`createAdminClient()`, 10 min, matching `app/admin/registrations/page.tsx`'s convention). Renders `<DecisionAttachmentUpload />` as a sibling next to `<DecisionForm />`, keyed off `draftDecision` (never the read-only finalized one).

### 6. `app/admin/submissions/[id]/page.tsx` + `components/admin/decision-finalize-panel.tsx` — visible before finalizing

Admin page also has its own "Propose Decision (as Committee)" section (single-person admin workflow, admin role already satisfies `requireRole("committee")`) — the attachment upload was added there too, not just the read-only Finalize-panel display, so a solo admin isn't locked out of attaching a file. `DecisionFinalizePanel` extended with `attachmentFileName` / `attachmentUrl` props, rendering a link next to the existing `authorMessage` paragraph.

### 7. `app/author/submissions/[id]/page.tsx` — gated author download

Two separate decision-display blocks needed updating: the primary `revision_required` block (the main use case — this is where an author actually needs the corrected file to act on) and the terminal accepted/rejected block. Both extended to select `attachment_path, attachment_file_name`, sign a URL, and render "Download reviewer's corrected file" — reusing the *exact* existing `is_final` gate already on each query, no new visibility logic.

## Part 2 — Conference registrations export

Purely additive to `lib/exports/datasets.ts` — no RLS changes needed (`admin_read_conference_registrations` policy from migration `0022` already covers this read), no changes to `app/admin/exports/page.tsx` or the route handler (both already iterate `EXPORT_DATASETS` generically).

```ts
{
  slug: "conference-registrations",
  label: "Conference Registrations",
  description: "All conference attendance registrations, for badge printing and check-in.",
  async fetch(supabase) {
    const { data } = await supabase
      .from("conference_registrations")
      .select(
        "reference_number, full_name, email, phone, institution, participant_category, attendance_mode, payment_status, attended, created_at"
      )
      .order("created_at")
    const headers = [
      "Reference Number", "Full Name", "Email", "Phone", "Institution",
      "Participant Category", "Attendance Mode", "Payment Status", "Attended", "Registered At",
    ]
    const rows = (data ?? []).map((r): ExportCell[] => [
      r.reference_number, r.full_name, r.email, r.phone, r.institution,
      r.participant_category, r.attendance_mode, r.payment_status,
      r.attended ? "Yes" : "No", r.created_at,
    ])
    return { headers, rows }
  },
},
```

## Verification (as executed)

1. `npx tsc --noEmit -p .`, `npm run lint`, `npm run build` — all clean.
2. Migration `0030` applied against the real Supabase project.
3. Live E2E via disposable accounts (`npm run test:decision-attachment`, `scripts/decision-attachment-e2e-test.mjs`): drives a real abstract through the 7-step wizard (including the payment step), jumps status to `decision_pending` directly, then as committee/admin proposes a decision, attaches a file, confirms it's visible pre-finalize in the Finalize panel, finalizes, then as author confirms the download link appears (and was absent pre-finalize) and resolves to the correct bytes.
4. Registrations export verified manually via `/admin/exports` (CSV + XLSX download, spot-checked against a known record).
5. `node --env-file=.env.local scripts/check-test-data.mjs` confirmed clean after test runs.
6. Committed, pushed, deployed, verified live: homepage 200, `/admin/exports` redirects (307) rather than erroring, `/certificate` unaffected.

**Status: shipped and live.** This document is kept as a record of the design decisions (especially the committee-gate visibility rule and the storage-bucket/RLS reasoning) for future reference.
