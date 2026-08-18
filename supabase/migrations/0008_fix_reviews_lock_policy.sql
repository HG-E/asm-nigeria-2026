-- reviewers_manage_own_reviews had USING/WITH CHECK backwards: WITH CHECK
-- (NOT is_submitted) validates the row's state AFTER the write, so it
-- blocked the legitimate false -> true submit transition itself, not just
-- edits after submission -- a reviewer could never actually submit a
-- review through this policy. The lock needs to gate on the OLD row (via
-- USING, so an already-submitted row stops matching for further writes)
-- rather than the NEW one.

drop policy if exists reviewers_manage_own_reviews on reviews;

create policy reviewers_manage_own_reviews on reviews for all
using (reviewer_id = auth.uid() and not is_submitted)
with check (reviewer_id = auth.uid());
