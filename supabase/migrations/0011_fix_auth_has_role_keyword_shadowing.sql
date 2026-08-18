-- auth_has_role() declared its local variable as `current_role`, which is a reserved
-- PL/pgSQL/SQL keyword (CURRENT_ROLE, the Postgres session role — always 'authenticated'
-- for PostgREST requests). The CASE expression resolved the keyword instead of the
-- variable, so every WHEN branch failed to match and the function always returned false.
-- This silently broke every RLS policy that relies on it (committee/admin read access
-- via the RLS-scoped client across submissions, reviews, decisions, notifications, etc).
create or replace function public.auth_has_role(required_role user_role)
returns boolean
language plpgsql
stable security definer
set search_path = public, auth
as $$
declare
  caller_role user_role;
begin
  select role into caller_role from public.user_profiles where id = auth.uid();
  return case caller_role
    when 'super_admin' then true
    when 'admin'       then required_role in ('author','reviewer','committee','admin')
    when 'committee'   then required_role in ('author','reviewer','committee')
    when 'reviewer'    then required_role in ('author','reviewer')
    when 'author'      then required_role = 'author'
    else false
  end;
end;
$$;
