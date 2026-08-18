-- The reviewer-visibility policies on submissions, submission_authors,
-- submission_documents, and submission_versions all used
-- `auth_has_role('reviewer')`, which is true for ANY user with reviewer
-- privilege or higher — it does not check whether that specific reviewer
-- was actually assigned to that specific submission. That let any of the
-- 5 reviewers read every submission in the system, not just their own,
-- contradicting the spec's role rule: "Reviewer: Can only access assigned
-- submissions" and the reviewer dashboard being scoped to "Assigned
-- abstracts" only.
--
-- committee/admin/super_admin visibility is unaffected — auth_has_role
-- ('committee') already covers committee and above via the role hierarchy
-- in auth_has_role(), and that branch is untouched here.

create or replace function public.auth_is_assigned_reviewer(p_submission_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from review_assignments ra
    where ra.submission_id = p_submission_id
      and ra.reviewer_id = auth.uid()
      and ra.is_active
  );
$$;

drop policy if exists authors_read_own_submissions on submissions;
create policy authors_read_own_submissions on submissions for select
using (
  corresponding_author_id = auth.uid()
  or auth_has_role('committee'::user_role)
  or (auth_user_role() = 'reviewer'::user_role and auth_is_assigned_reviewer(id))
);

drop policy if exists read_submission_authors on submission_authors;
create policy read_submission_authors on submission_authors for select
using (
  exists (
    select 1 from submissions s
    where s.id = submission_authors.submission_id
      and (
        s.corresponding_author_id = auth.uid()
        or auth_has_role('committee'::user_role)
        or (
          auth_user_role() = 'reviewer'::user_role
          and auth_is_assigned_reviewer(s.id)
          and exists (
            select 1 from conferences c
            where c.id = s.conference_id and c.blind_review_mode <> 'double'::blind_mode
          )
        )
      )
  )
);

drop policy if exists read_submission_documents on submission_documents;
create policy read_submission_documents on submission_documents for select
using (
  exists (
    select 1 from submissions s
    where s.id = submission_documents.submission_id
      and (
        s.corresponding_author_id = auth.uid()
        or auth_has_role('committee'::user_role)
        or (auth_user_role() = 'reviewer'::user_role and auth_is_assigned_reviewer(s.id))
      )
  )
);

drop policy if exists read_submission_versions on submission_versions;
create policy read_submission_versions on submission_versions for select
using (
  exists (
    select 1 from submissions s
    where s.id = submission_versions.submission_id
      and (
        s.corresponding_author_id = auth.uid()
        or auth_has_role('committee'::user_role)
        or (auth_user_role() = 'reviewer'::user_role and auth_is_assigned_reviewer(s.id))
      )
  )
);
