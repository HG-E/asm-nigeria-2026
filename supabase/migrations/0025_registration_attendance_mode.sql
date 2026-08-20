-- Captures whether a registrant plans to attend virtually, physically, or
-- both, as its own explicit question rather than inferring it from
-- participant_category (which conflates fee tier with attendance mode).
alter table conference_registrations
  add column attendance_mode text not null default 'Physical'
    check (attendance_mode in ('Virtual', 'Physical', 'Both'));

alter table conference_registrations
  alter column attendance_mode drop default;
