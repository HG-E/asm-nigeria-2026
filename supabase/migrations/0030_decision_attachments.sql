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
