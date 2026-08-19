-- Same reasoning as migration 0010 (public conference read): the new
-- landing page shows subtheme names/descriptions to anonymous visitors
-- deciding whether to register, but authenticated_read_subthemes was
-- scoped to the `authenticated` Postgres role, so anonymous visitors got
-- zero rows and the section silently disappeared. Subtheme content isn't
-- sensitive -- it's shown to every author during submission regardless.
drop policy if exists authenticated_read_subthemes on conference_subthemes;
create policy public_read_active_subthemes on conference_subthemes for select
using (is_active = true or auth_has_role('admin'::user_role));
