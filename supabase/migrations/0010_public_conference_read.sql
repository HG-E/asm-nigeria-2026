-- conferences SELECT was scoped to `authenticated` only, so the public
-- homepage (unauthenticated visitors) got zero rows back and could never
-- show the conference name/theme/tagline -- exactly the audience a landing
-- page needs to reach. Conference name, dates, theme, tagline etc. are
-- public marketing info with no reason to be login-gated; widen to anon too.

drop policy if exists authenticated_read_conferences on conferences;
create policy public_read_conferences on conferences for select
using (true);
