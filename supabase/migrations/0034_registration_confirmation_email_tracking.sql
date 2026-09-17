-- The registration confirmation email (app/register-conference/actions.ts)
-- was a bare sendMail() call inside after() with its failure silently
-- swallowed -- unlike every other email in the app (see the `notifications`
-- table), there was no record of whether it ever actually sent, and no way
-- for an admin to retry one that failed. `notifications.recipient_id` has a
-- hard NOT NULL FK to user_profiles, which registrants never get (no
-- account/login involved), so this can't just reuse that table -- tracking
-- lives directly on the registration row instead, one row per registration.
alter table conference_registrations
  add column confirmation_email_status notification_status not null default 'pending',
  add column confirmation_email_error text,
  add column confirmation_email_sent_at timestamptz;
