-- The application-level duplicate check in submitRegistrationAction (check
-- for an existing pending/verified row, then insert) is a check-then-act
-- with no atomicity: two submissions for the same email arriving close
-- together can both pass the check before either has committed, landing
-- two rows for the same person. Confirmed live during testing. A partial
-- unique index makes the DB itself refuse the second insert, closing the
-- race outright, and (via lower(email)) also catches "John@x.com" vs
-- "john@x.com" as the same registrant, which the application-level check
-- did not.
create unique index conference_registrations_email_active_unique
  on conference_registrations (conference_id, lower(email))
  where payment_status <> 'rejected';
