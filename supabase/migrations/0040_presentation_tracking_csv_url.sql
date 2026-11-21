-- The companion to presentation_upload_form_url (migration 0039): once that
-- Google Form's responses are flowing into a Google Sheet, publishing that
-- sheet to the web as CSV (File -> Share -> Publish to web -> CSV) gives a
-- plain, public, unauthenticated URL this app can fetch directly -- no
-- Google API credentials or OAuth needed, and no storage cost here either,
-- just a read-only cross-reference against who's actually submitted.
alter table conferences add column presentation_tracking_csv_url text;
