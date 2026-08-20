-- Product owner feedback: "In-person" reads better than "Physical" for the
-- attendance-mode question. One real registration already exists with the
-- old value -- drop the old constraint first, backfill, then add the new
-- constraint (updating to 'In-person' while the old constraint is still
-- active would itself violate it).
alter table conference_registrations
  drop constraint conference_registrations_attendance_mode_check;

update conference_registrations set attendance_mode = 'In-person' where attendance_mode = 'Physical';

alter table conference_registrations
  add constraint conference_registrations_attendance_mode_check
    check (attendance_mode in ('Virtual', 'In-person', 'Both'));
