-- Two small follow-ups while building the reviewer workflow:
--
-- 1. review_assignments.due_date was never populated, so "overdue reviews"
--    (spec section 24) had nothing to compare against. Set it from the
--    conference's review_deadline when a submission is auto-routed.
--
-- 2. The storage read policy for the abstracts bucket granted ANY reviewer
--    read access to EVERY file in the bucket (matched by role, not by
--    assignment) -- the same class of gap fixed for table RLS in migration
--    0002, just at the storage layer. Object paths are random UUIDs so this
--    was not practically enumerable, but it's still wider than intended.
--    Tightened to require an actual assignment to the submission that file
--    belongs to.

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
  v_review_deadline timestamptz;
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
  select review_deadline into v_review_deadline from conferences where id = v_submission.conference_id;

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
      insert into review_assignments (submission_id, reviewer_id, conference_id, status, due_date)
      values (p_submission_id, v_reviewer.user_id, v_submission.conference_id, 'pending', v_review_deadline)
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

drop policy if exists authors_read_own_abstracts on storage.objects;
create policy authors_read_own_abstracts on storage.objects for select
using (
  bucket_id = 'abstracts'
  and (
    (storage.foldername(name))[1] = (auth.uid())::text
    or exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
        and user_profiles.role in ('admin', 'super_admin', 'committee')
    )
    or exists (
      select 1
      from submission_documents sd
      join review_assignments ra on ra.submission_id = sd.submission_id
      where sd.storage_path = storage.objects.name
        and ra.reviewer_id = auth.uid()
        and ra.is_active
    )
  )
);
