-- Generated PDF documents (an "Abstract Acceptance Notification" and a
-- formal signed "Letter of Invitation/Acceptance") tied to a finalized
-- accept-type decision. Delivered via a long, unguessable token link in the
-- acceptance email rather than a short-lived signed URL -- an author may
-- click it months later to show their institution, long after any 10-minute
-- signed URL would have expired. The token route (app/letters/[token])
-- regenerates a fresh short-lived signed URL from storage_path on each
-- visit; the token itself never expires and is never rotated.
create table decision_documents (
  id uuid primary key default gen_random_uuid(),
  decision_id uuid not null references decisions(id) on delete cascade,
  submission_id uuid not null references submissions(id) on delete cascade,
  doc_type text not null check (doc_type in ('notification', 'letter')),
  access_token text not null unique,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create index decision_documents_submission_id_idx on decision_documents (submission_id);

-- RLS enabled with zero policies: nobody gets access via the anon/
-- authenticated API keys, by design. The token route and the finalize
-- action both go through the service-role admin client, which bypasses RLS
-- entirely -- matching how decision-attachments (0030) and every other
-- private-bucket flow in this app already works.
alter table decision_documents enable row level security;

-- Private bucket, same shape as decision-attachments (0030): zero
-- storage.objects RLS policies by design. Every access -- generation at
-- finalize time, read via the token route -- goes through the service-role
-- admin client, never direct browser-to-storage.
insert into storage.buckets (id, name, public, file_size_limit)
values ('decision-documents', 'decision-documents', false, 10485760);
