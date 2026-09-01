-- Adds the registration_desk role: two named registration/accreditation
-- staff who need read + CSV/XLSX export access to conference_registrations
-- only -- not submissions, reviews, decisions, committee data, or any other
-- admin surface. This migration ONLY adds the enum label; the RLS policy
-- that references it must be a separate migration/transaction (Postgres
-- forbids using a new enum value in the same transaction that added it).
alter type user_role add value 'registration_desk';
