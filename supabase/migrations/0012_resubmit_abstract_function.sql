-- Phase: author resubmission after a committee-requested revision (spec
-- section 31). Mirrors submit_abstract()'s shape but for the
-- revision_required -> submitted transition: never overwrites the
-- original (already-reviewed) submission_versions row, just finalizes
-- the next version the author has been drafting into, and resets the
-- SAME reviewer pool for a fresh review round rather than creating a
-- second set of review_assignments rows (submission_id, reviewer_id) is
-- unique, and per product decision this is a "reset", not a new round
-- of independent history). Reviewers who already declared a conflict
-- are left alone -- a conflict doesn't change because the text changed.
create or replace function public.resubmit_abstract(p_submission_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_version record;
  v_email text;
  v_new_version int;
  v_review_deadline timestamptz;
  v_reset_count int := 0;
begin
  select * into v_submission from submissions where id = p_submission_id for update;

  if v_submission is null then
    raise exception 'Submission not found';
  end if;

  if v_submission.corresponding_author_id <> auth.uid() then
    raise exception 'Not authorized to resubmit this abstract';
  end if;

  if v_submission.status <> 'revision_required' then
    raise exception 'This abstract is not open for revision';
  end if;

  v_new_version := v_submission.current_version + 1;

  select * into v_version from submission_versions
  where submission_id = p_submission_id and version_number = v_new_version;

  if v_version is null or coalesce(trim(v_version.abstract_text), '') = '' then
    raise exception 'Add your revised abstract content before submitting';
  end if;

  select email into v_email from user_profiles where id = auth.uid();
  select review_deadline into v_review_deadline from conferences where id = v_submission.conference_id;

  update submissions
  set current_version = v_new_version,
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
  where id = p_submission_id;

  update submission_versions
  set submitted_at = now(),
      change_summary = coalesce(nullif(trim(change_summary), ''), 'Revision ' || (v_new_version - 1))
  where submission_id = p_submission_id and version_number = v_new_version;

  insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status, metadata)
  values (
    auth.uid(), v_email, 'submission_resubmitted', 'submission', p_submission_id,
    'revision_required', 'submitted', jsonb_build_object('version_number', v_new_version)
  );

  update review_assignments
  set status = 'pending',
      accepted_at = null,
      completed_at = null,
      due_date = coalesce(v_review_deadline, due_date),
      updated_at = now()
  where submission_id = p_submission_id
    and is_active = true
    and status <> 'conflict';
  get diagnostics v_reset_count = row_count;

  update reviews r
  set is_submitted = false,
      submitted_at = null
  from review_assignments ra
  where r.assignment_id = ra.id
    and ra.submission_id = p_submission_id
    and ra.is_active = true
    and ra.status = 'pending';

  insert into notifications (recipient_id, recipient_email, submission_id, notification_type, subject, status)
  select
    ra.reviewer_id,
    up.email,
    p_submission_id,
    'reviewer_reassignment',
    'Revised abstract ready for re-review: ' || v_submission.reference_number,
    'pending'
  from review_assignments ra
  join user_profiles up on up.id = ra.reviewer_id
  where ra.submission_id = p_submission_id
    and ra.is_active = true
    and ra.status = 'pending';

  if v_reset_count > 0 then
    update submissions set status = 'assigned', updated_at = now() where id = p_submission_id;
    insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status, metadata)
    values (
      auth.uid(), v_email, 'reviewers_reset_for_revision', 'submission', p_submission_id,
      'submitted', 'assigned', jsonb_build_object('reviewer_count', v_reset_count)
    );
  else
    update submissions set status = 'screening', updated_at = now() where id = p_submission_id;
  end if;
end;
$$;
