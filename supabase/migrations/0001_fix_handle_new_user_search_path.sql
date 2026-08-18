-- Fixes registration: the `supabase_auth_admin` role (used internally by
-- GoTrue to insert into auth.users) has search_path locked to `auth` only.
-- handle_new_user() referenced the `user_role` enum unqualified, so its
-- cast silently failed under that search_path, and every signup returned
-- "Database error creating new user". Pinning the function's own
-- search_path fixes it without touching the trigger or table.
--
-- Applied directly against the project on 2026-08-18 and verified with a
-- disposable test signup. Kept here so the fix is reproducible if the
-- schema is ever rebuilt from these migrations.

alter function public.handle_new_user() set search_path = public, auth;
