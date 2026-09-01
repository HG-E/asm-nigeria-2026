-- Second, independent SELECT policy on conference_registrations for the new
-- registration_desk role. Multiple permissive `for select` policies combine
-- via OR, so this doesn't touch or repeat the existing admin policies (0022)
-- -- admins keep exactly what they have today. No insert/update policy:
-- this role is read-only, matching the scope requested.
create policy registration_desk_read_conference_registrations on conference_registrations for select
using (auth_user_role() = 'registration_desk'::user_role);
