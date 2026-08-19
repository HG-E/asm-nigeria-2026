-- Product owner feedback: authors pay a fixed submission fee (currently
-- NGN 3,000 or a USD equivalent to be set) by bank transfer to a
-- designated account, then upload proof of payment (receipt/screenshot)
-- when submitting each abstract. Submission proceeds immediately on
-- upload; admin verifies the receipt against the bank statement
-- afterward, in parallel, without blocking review.

create type payment_status as enum ('pending', 'verified', 'rejected');

alter table submissions
  add column payment_status payment_status not null default 'pending',
  add column payment_currency text,
  add column payment_receipt_path text,
  add column payment_receipt_uploaded_at timestamptz,
  add column payment_verified_by uuid references user_profiles(id),
  add column payment_verified_at timestamptz,
  add column payment_rejection_reason text;

alter table submissions add constraint submissions_payment_currency_check
  check (payment_currency is null or payment_currency in ('NGN', 'USD'));

-- Conference-level fee configuration + the bank details shown to authors
-- during the payment step. USD amount and account details are left null
-- here (not invented) -- admin fills them in via Conference Settings
-- before authors start submitting.
alter table conferences
  add column submission_fee_ngn numeric,
  add column submission_fee_usd numeric,
  add column payment_account_details text;

update conferences set submission_fee_ngn = 3000 where is_active = true;

-- Both admin and author connect as the same Postgres `authenticated` role
-- in Supabase (role distinction is app-layer, via user_profiles.role
-- checked in RLS predicates) -- so RLS alone cannot let an author update
-- payment_receipt_path on their own draft row while forbidding them from
-- also setting payment_status='verified' in the same request; Postgres
-- RLS policies gate whole rows, not individual columns. A trigger is the
-- correct tool for column-level write protection: block any change to the
-- verification columns unless it comes from the service-role client
-- (used by all real admin actions) or a session whose own role is admin.
create or replace function public.protect_payment_verification_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (
    new.payment_status is distinct from old.payment_status
    or new.payment_verified_by is distinct from old.payment_verified_by
    or new.payment_verified_at is distinct from old.payment_verified_at
    or new.payment_rejection_reason is distinct from old.payment_rejection_reason
  ) and auth.role() <> 'service_role' and not auth_has_role('admin'::user_role) then
    raise exception 'Only admin can update payment verification status';
  end if;
  return new;
end;
$$;

create trigger trg_protect_payment_verification_columns
before update on submissions
for each row execute function protect_payment_verification_columns();
