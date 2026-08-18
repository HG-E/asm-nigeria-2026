-- Closes an RLS gap found while building the submission flow: the
-- submissions UPDATE policy had no WITH CHECK, so an author's own session
-- could set status to anything (e.g. straight to 'accepted') via a raw
-- REST call, not just the draft edits the UI exposes. Direct author
-- updates are now locked to staying in 'draft' on their own row; the
-- actual draft -> submitted transition goes through submit_abstract()
-- below instead of a raw client-side UPDATE.

drop policy if exists authors_update_own_draft_submissions on submissions;
create policy authors_update_own_draft_submissions on submissions for update
using (
  ((corresponding_author_id = auth.uid()) and (status = 'draft'::submission_status))
  or auth_has_role('admin'::user_role)
  or (auth_has_role('committee'::user_role) and (status <> 'draft'::submission_status))
)
with check (
  (status = 'draft'::submission_status and corresponding_author_id = auth.uid())
  or auth_has_role('admin'::user_role)
  or auth_has_role('committee'::user_role)
);

-- Official submission (spec section 19). Runs as the author's own request
-- but needs privileges their session doesn't have directly (notifications
-- and audit_logs both require elevated INSERT rights), so this is
-- SECURITY DEFINER with its own ownership/state check standing in for RLS.
-- Reviewer auto-routing is deliberately NOT done here yet -- that's Phase 4
-- work once reviewers actually exist to route to (there are none yet).
create or replace function public.submit_abstract(p_submission_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_reference_number text;
  v_email text;
begin
  select * into v_submission from submissions where id = p_submission_id for update;

  if v_submission is null then
    raise exception 'Submission not found';
  end if;

  if v_submission.corresponding_author_id <> auth.uid() then
    raise exception 'Not authorized to submit this abstract';
  end if;

  if v_submission.status <> 'draft' then
    raise exception 'This abstract has already been submitted';
  end if;

  select email into v_email from user_profiles where id = auth.uid();

  v_reference_number := generate_reference_number(v_submission.conference_id);

  update submissions
  set status = 'submitted',
      reference_number = v_reference_number,
      submitted_at = now(),
      updated_at = now()
  where id = p_submission_id;

  insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status)
  values (auth.uid(), v_email, 'submission_submitted', 'submission', p_submission_id, 'draft', 'submitted');

  insert into notifications (recipient_id, recipient_email, submission_id, notification_type, subject, status)
  values (
    auth.uid(),
    v_email,
    p_submission_id,
    'submission_acknowledgement',
    'Abstract received: ' || v_reference_number,
    'pending'
  );

  return v_reference_number;
end;
$$;

grant execute on function public.submit_abstract(uuid) to authenticated;
