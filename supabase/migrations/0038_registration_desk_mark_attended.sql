-- registration_desk can SELECT conference_registrations but has no UPDATE
-- policy at all -- every write, including marking someone attended at the
-- door, is admin-only. That's too narrow: checking people in IS the job this
-- role exists for. A SECURITY DEFINER function (same pattern as
-- submit_abstract, withdraw_submission, restructure_accepted_abstract)
-- grants exactly that one capability -- flip `attended` -- without opening a
-- blanket UPDATE policy on the row that could later be used to touch
-- payment_status or anything else if an action's code ever had a bug.
create or replace function public.mark_registration_attended(p_registration_id uuid, p_attended boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  select role into v_role from user_profiles where id = auth.uid();

  if v_role is null or v_role not in ('admin', 'super_admin', 'registration_desk') then
    raise exception 'Not authorized to mark attendance';
  end if;

  update conference_registrations
  set attended = p_attended
  where id = p_registration_id;

  if not found then
    raise exception 'Registration not found';
  end if;
end;
$$;

grant execute on function public.mark_registration_attended(uuid, boolean) to authenticated;
