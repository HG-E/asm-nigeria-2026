-- In-app conference (attendance) registration, replacing the plan to link
-- out to a Google Form. Deliberately no-login, like the abstract fee flow's
-- bank-details are already public on the landing page: a visitor fills the
-- form and uploads their transfer receipt in one step, no account needed.
-- All writes go through the registration server action using the
-- service-role admin client (never a public client insert), so there's no
-- public RLS write policy to reason about -- same shape as contact_messages.
create table conference_registrations (
  id uuid primary key default gen_random_uuid(),
  conference_id uuid not null references conferences(id),
  reference_number text unique,
  full_name text not null,
  email text not null,
  phone text,
  institution text,
  participant_category text not null,
  registration_period text not null check (registration_period in ('early', 'late')),
  amount_expected text not null,
  payment_currency text not null check (payment_currency in ('NGN', 'USD')),
  payment_receipt_path text not null,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'verified', 'rejected')),
  payment_verified_by uuid references user_profiles(id),
  payment_verified_at timestamptz,
  payment_rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conference_registrations_conference_idx on conference_registrations (conference_id);
create index conference_registrations_email_idx on conference_registrations (email);
create index conference_registrations_status_idx on conference_registrations (payment_status);

alter table conference_registrations enable row level security;

create policy admin_read_conference_registrations on conference_registrations for select
using (auth_has_role('admin'::user_role));

create policy admin_update_conference_registrations on conference_registrations for update
using (auth_has_role('admin'::user_role))
with check (auth_has_role('admin'::user_role));

-- Reference numbers (e.g. REG-ASM-ABJ-2026-001) via a dedicated per-conference
-- counter -- conferences.ref_sequence exists but is unused legacy from before
-- 0014 moved abstract reference numbering to a per-subtheme counter, so a
-- fresh column keeps this unambiguous rather than repurposing that one.
alter table conferences add column registration_ref_sequence integer not null default 0;

create or replace function public.generate_registration_reference(p_conference_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_seq int;
begin
  update conferences
  set registration_ref_sequence = registration_ref_sequence + 1
  where id = p_conference_id
  returning reference_prefix, registration_ref_sequence into v_prefix, v_seq;

  if v_prefix is null then
    raise exception 'Conference % not found', p_conference_id;
  end if;

  return 'REG-' || v_prefix || '-' || LPAD(v_seq::text, 3, '0');
end;
$$;

-- Private bucket, same shape as payment-receipts. All access (write from the
-- registration action, read from the admin page) goes through the
-- service-role client, so no storage.objects policies are needed here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('registration-receipts', 'registration-receipts', false, 1048576,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']);
