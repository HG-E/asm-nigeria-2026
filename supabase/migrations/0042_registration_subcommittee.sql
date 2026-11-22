-- Which planning subcommittee a committee-member registrant belongs to
-- (see lib/subcommittees.ts). Null for every non-committee-member
-- registration.
alter table conference_registrations
  add column subcommittee text;
