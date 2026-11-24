-- Supports adding the Pre & Post-Conference Hands-On Workshop to an
-- existing conference registration after the fact (app/register-workshop's
-- "add to existing registration" flow). Kept separate from
-- payment_receipt_path so the admin can see both the original registration
-- receipt and the workshop top-up receipt side by side, rather than one
-- overwriting the other.
alter table conference_registrations
  add column workshop_receipt_path text,
  add column workshop_added_at timestamptz;
