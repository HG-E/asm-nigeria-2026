-- Follow-up to 0022: conference_registrations was missing an ip_address
-- column, so the registration action could only do a weak global
-- recent-volume check instead of real per-IP rate limiting (same pattern
-- contact_messages already uses).
alter table conference_registrations add column ip_address text;
create index conference_registrations_ip_created_idx on conference_registrations (ip_address, created_at);
