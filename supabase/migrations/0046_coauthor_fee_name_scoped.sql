-- Widens the uniqueness of coauthor_certificate_fees from (conference_id,
-- email) to (conference_id, email, full_name). Live data confirmed real
-- abstracts where two genuinely different co-authors share one listed
-- email (the corresponding author didn't have the real co-author's email
-- at submission time and typed in someone else's) -- under the old
-- constraint, a second distinct person submitting a fee payment under that
-- same email would silently overwrite the first person's row instead of
-- creating their own. getCoauthorFeeStatus already does a fuzzy name match
-- on top of the email match (see lib/presentation-certificate.ts), so each
-- person's own row is still found correctly regardless of how many share
-- an email.
alter table coauthor_certificate_fees drop constraint coauthor_certificate_fees_conference_id_email_key;
alter table coauthor_certificate_fees add constraint coauthor_certificate_fees_conference_id_email_full_name_key
  unique (conference_id, email, full_name);
