-- Payment receipts are financial/personal-identifying data, unrelated to
-- the double-blind scientific review -- unlike the abstracts bucket,
-- reviewers and committee get NO access here. Only the uploading author
-- and admin/super_admin can read a receipt.
create policy authors_upload_payment_receipts on storage.objects for insert
with check (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (auth.uid())::text
);

create policy authors_read_own_payment_receipts on storage.objects for select
using (
  bucket_id = 'payment-receipts'
  and (
    (storage.foldername(name))[1] = (auth.uid())::text
    or exists (
      select 1 from user_profiles
      where user_profiles.id = auth.uid()
        and user_profiles.role in ('admin', 'super_admin')
    )
  )
);

create policy authors_delete_own_payment_receipts on storage.objects for delete
using (
  bucket_id = 'payment-receipts'
  and (storage.foldername(name))[1] = (auth.uid())::text
);
