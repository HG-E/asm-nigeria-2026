-- Stress-test audit finding: deleteDocumentAction's app-layer check validated
-- the CALLER's submission id/ownership/status, but the actual delete only
-- filtered by documentId (now fixed in app code to also scope by
-- submission_id). RLS itself had no backstop either -- authors_delete_documents
-- and authors_update_documents only checked uploaded_by, with no gate on the
-- submission's status, unlike authors_upload_documents (INSERT) which already
-- required status IN ('draft','revision_required'). Bringing DELETE/UPDATE in
-- line with INSERT so an author can never mutate a document belonging to a
-- submission that isn't currently editable, even via a direct API call that
-- bypasses the Next.js server action entirely.
drop policy if exists authors_delete_documents on submission_documents;
create policy authors_delete_documents on submission_documents for delete
using (
  auth_has_role('admin'::user_role)
  or (
    uploaded_by = auth.uid()
    and exists (
      select 1 from submissions s
      where s.id = submission_documents.submission_id
        and s.corresponding_author_id = auth.uid()
        and s.status = any (array['draft'::submission_status, 'revision_required'::submission_status])
    )
  )
);

drop policy if exists authors_update_documents on submission_documents;
create policy authors_update_documents on submission_documents for update
using (
  auth_has_role('admin'::user_role)
  or (
    uploaded_by = auth.uid()
    and exists (
      select 1 from submissions s
      where s.id = submission_documents.submission_id
        and s.corresponding_author_id = auth.uid()
        and s.status = any (array['draft'::submission_status, 'revision_required'::submission_status])
    )
  )
);
