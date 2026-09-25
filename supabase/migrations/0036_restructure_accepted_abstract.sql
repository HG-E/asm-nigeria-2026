-- Lets an author of an ACCEPTED abstract rewrite it into the four-part
-- Background / Methods / Results / Conclusion structure for the Book of
-- Abstracts (see 0035). Accepted abstracts are otherwise locked to their
-- authors, and this is deliberately the only door.
--
-- The text the committee actually reviewed is never lost: the first time an
-- abstract is restructured, its original abstract_text is copied into
-- abstract_text_original and never overwritten afterwards. Each restructure is
-- written to the audit log, and the admin submission page shows the original
-- beside the new text -- acceptance was based on the original, so anyone can
-- see exactly what changed.
alter table submission_versions add column abstract_text_original text;

create or replace function public.restructure_accepted_abstract(
  p_submission_id uuid,
  p_background text,
  p_methods text,
  p_results text,
  p_conclusion text,
  p_abstract_text text,
  p_word_count int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission record;
  v_version record;
  v_email text;
begin
  select * into v_submission from submissions where id = p_submission_id for update;

  if v_submission is null then
    raise exception 'Submission not found';
  end if;

  if v_submission.corresponding_author_id <> auth.uid() then
    raise exception 'Not authorized to edit this abstract';
  end if;

  if v_submission.status not in ('accepted', 'accepted_oral', 'accepted_poster') then
    raise exception 'Only accepted abstracts can be restructured this way';
  end if;

  if coalesce(trim(p_background), '') = '' or coalesce(trim(p_methods), '') = ''
     or coalesce(trim(p_results), '') = '' or coalesce(trim(p_conclusion), '') = ''
     or coalesce(trim(p_abstract_text), '') = '' then
    raise exception 'All four parts are required';
  end if;

  select * into v_version from submission_versions
  where submission_id = p_submission_id and version_number = v_submission.current_version
  for update;

  if v_version is null then
    raise exception 'Abstract version not found';
  end if;

  update submission_versions
  set abstract_text_original = coalesce(abstract_text_original, abstract_text),
      abstract_background = p_background,
      abstract_methods = p_methods,
      abstract_results = p_results,
      abstract_conclusion = p_conclusion,
      abstract_text = p_abstract_text,
      word_count = p_word_count
  where id = v_version.id;

  select email into v_email from user_profiles where id = auth.uid();

  insert into audit_logs (actor_id, actor_email, action, entity_type, entity_id, previous_status, new_status, metadata)
  values (
    auth.uid(), v_email, 'abstract_restructured', 'submission', p_submission_id,
    v_submission.status::text, v_submission.status::text,
    jsonb_build_object('version_number', v_submission.current_version, 'word_count', p_word_count)
  );
end;
$$;
