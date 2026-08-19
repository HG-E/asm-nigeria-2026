-- Self-service withdrawal (spec allowed it via schema's 'withdrawn' status
-- from the start, but no path to reach it existed -- authors had to email
-- the secretariat, per the Terms page's now-outdated clause 9).
-- Same shape as submit_abstract/resubmit_abstract: SECURITY DEFINER since
-- the author's own session can't UPDATE a non-draft row (RLS) or INSERT
-- into audit_logs, with its own ownership/state check standing in for RLS.
create or replace function public.withdraw_submission(p_submission_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_email text;
begin
  select * into v_submission from submissions where id = p_submission_id for update;

  if v_submission is null then
    raise exception 'Submission not found';
  end if;

  if v_submission.corresponding_author_id <> auth.uid() then
    raise exception 'Not authorized to withdraw this submission';
  end if;

  if v_submission.status in ('draft', 'accepted', 'accepted_oral', 'accepted_poster', 'rejected', 'withdrawn') then
    raise exception 'This submission can no longer be withdrawn';
  end if;

  select email into v_email from user_profiles where id = auth.uid();

  update submissions
  set status = 'withdrawn',
      updated_at = now()
  where id = p_submission_id;

  insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status, metadata)
  values (
    auth.uid(), v_email, 'submission_withdrawn', 'submission', p_submission_id,
    v_submission.status::text, 'withdrawn',
    case when p_reason is not null then jsonb_build_object('reason', p_reason) else null end
  );

  insert into notifications (recipient_id, recipient_email, submission_id, notification_type, subject, status)
  values (
    auth.uid(), v_email, p_submission_id, 'submission_withdrawn',
    'Submission withdrawn: ' || coalesce(v_submission.reference_number, v_submission.title),
    'pending'
  );
end;
$$;

grant execute on function public.withdraw_submission(uuid, text) to authenticated;
