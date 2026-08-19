-- Product owner feedback: reference numbers looked identical across
-- subthemes (just a global running count), but the Book of Abstracts is
-- organized section-by-section by subtheme, so each abstract's number
-- should carry a subtheme code and count within that subtheme --
-- ASM-ABJ-2026-AMR-001, ASM-ABJ-2026-IBA-001, etc, instead of the old
-- ASM-ABJ-2026-00001 shared sequence.
alter table conference_subthemes add column code text;
alter table conference_subthemes add column ref_sequence integer not null default 0;
alter table conference_subthemes add constraint conference_subthemes_code_format
  check (code is null or code ~ '^[A-Z]{2,6}$');
alter table conference_subthemes add constraint conference_subthemes_conference_id_code_key
  unique (conference_id, code);

update conference_subthemes set code = 'AMR' where sort_order = 1;
update conference_subthemes set code = 'ERID' where sort_order = 2;
update conference_subthemes set code = 'FLL' where sort_order = 3;
update conference_subthemes set code = 'IBA' where sort_order = 4;
update conference_subthemes set code = 'BNM' where sort_order = 5;

alter table conference_subthemes alter column code set not null;

drop function if exists public.generate_reference_number(uuid);

create or replace function public.generate_reference_number(p_conference_id uuid, p_subtheme_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_code text;
  v_seq int;
  v_ref text;
begin
  select reference_prefix into v_prefix from conferences where id = p_conference_id;

  update conference_subthemes
  set ref_sequence = ref_sequence + 1
  where id = p_subtheme_id
  returning code, ref_sequence into v_code, v_seq;

  if v_code is null then
    raise exception 'Subtheme % has no reference code configured', p_subtheme_id;
  end if;

  v_ref := v_prefix || '-' || v_code || '-' || LPAD(v_seq::text, 3, '0');
  return v_ref;
end;
$$;

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

  v_reference_number := generate_reference_number(v_submission.conference_id, v_submission.subtheme_id);

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
