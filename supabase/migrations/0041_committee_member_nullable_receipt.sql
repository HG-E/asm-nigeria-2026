-- Committee members register for free via a private ?committee=1 link and
-- have no payment receipt to upload (see app/register-conference/actions.ts
-- and lib/registration-fees.ts's "Committee Member" category). Every other
-- category still always has a receipt -- this only relaxes the column to
-- allow that one case.
alter table conference_registrations
  alter column payment_receipt_path drop not null;
