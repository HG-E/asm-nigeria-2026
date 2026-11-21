-- Oral presenters (especially virtual ones) submit their slide deck
-- externally (Google Form -> presenter's own Google Drive), not through this
-- app's storage -- a single PPTX routinely runs 20-100MB+ with embedded
-- media, versus the ~1-2MB caps everything else here uses, and this project
-- doesn't have budget for that in its own storage. This just holds the link
-- to that external form so it can be shown on the author's page and changed
-- from admin without a code deploy.
alter table conferences add column presentation_upload_form_url text;
