-- A flat, one-time fee a non-corresponding co-author pays to unlock their
-- own Certificate of Presentation -- covers every abstract they're listed
-- on as a co-author for the active conference, not charged per abstract.
-- Corresponding authors never need this: they already paid the abstract's
-- own processing fee at submission time (submissions.payment_status).
--
-- Keyed by (conference_id, email) rather than tied to any one submission,
-- since the whole point is that it's one payment covering all of a
-- person's co-authored abstracts in a given conference, not a per-abstract
-- charge. RLS enabled with no policies, same as conference_registrations --
-- every access in app code goes through the service-role admin client,
-- which bypasses RLS entirely, so this blocks the anon/authenticated keys
-- from ever touching it directly.
create table coauthor_certificate_fees (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references conferences(id) on delete cascade,
  email text not null,
  full_name text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'rejected')),
  receipt_path text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references user_profiles(id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (conference_id, email)
);

alter table coauthor_certificate_fees enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('coauthor-fee-receipts', 'coauthor-fee-receipts', false, 1048576,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
