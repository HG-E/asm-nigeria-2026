-- Certificate of Participation eligibility gate. payment_status = 'verified'
-- only means they paid; it doesn't mean they actually showed up. This is
-- set by an admin after the conference (see the "Mark Attended" control on
-- /admin/registrations), independently of payment status.
alter table conference_registrations
  add column attended boolean not null default false;

create index conference_registrations_attended_idx on conference_registrations (attended);
