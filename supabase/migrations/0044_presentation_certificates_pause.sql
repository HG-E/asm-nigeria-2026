-- Lets the admin pause the self-serve Certificate of Presentation flow for
-- the public (both corresponding authors and co-authors) while the
-- co-author certificate fee and its verification flow are rolled out,
-- without needing a redeploy to flip it. Defaults to false (paused) so
-- applying this migration itself immediately closes public access; an admin
-- preview token (see PRESENTATION_CERTIFICATE_PREVIEW_TOKEN) bypasses this
-- for testing while it's off.
alter table conferences
  add column presentation_certificates_open boolean not null default false;
