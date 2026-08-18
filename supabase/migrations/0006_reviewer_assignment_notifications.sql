-- Extends submit_abstract() to also notify each reviewer when they're
-- auto-assigned to a submission, not just the author acknowledgement.

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
  v_reviewer record;
  v_assigned_count int := 0;
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

  if v_submission.subtheme_id is not null then
    for v_reviewer in
      select rp.user_id, up.email as reviewer_email
      from reviewer_profiles rp
      join user_profiles up on up.id = rp.user_id
      where rp.subtheme_id = v_submission.subtheme_id
        and rp.conference_id = v_submission.conference_id
        and rp.is_active = true
    loop
      insert into review_assignments (submission_id, reviewer_id, conference_id, status)
      values (p_submission_id, v_reviewer.user_id, v_submission.conference_id, 'pending')
      on conflict (submission_id, reviewer_id) do nothing;

      if found then
        insert into notifications (recipient_id, recipient_email, submission_id, notification_type, subject, status)
        values (
          v_reviewer.user_id,
          v_reviewer.reviewer_email,
          p_submission_id,
          'reviewer_assignment',
          'New abstract assigned for review: ' || v_reference_number,
          'pending'
        );
        v_assigned_count := v_assigned_count + 1;
      end if;
    end loop;
  end if;

  if v_assigned_count > 0 then
    update submissions set status = 'assigned', updated_at = now() where id = p_submission_id;
    insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status, metadata)
    values (
      auth.uid(), v_email, 'reviewers_auto_assigned', 'submission', p_submission_id,
      'submitted', 'assigned', jsonb_build_object('reviewer_count', v_assigned_count)
    );
  else
    update submissions set status = 'screening', updated_at = now() where id = p_submission_id;
  end if;

  return v_reference_number;
end;
$$;
