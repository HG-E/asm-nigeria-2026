-- reviewers_manage_own_reviews was a single FOR ALL policy with
-- USING (reviewer_id = auth.uid() AND NOT is_submitted) and
-- WITH CHECK (reviewer_id = auth.uid()). For UPDATE, Postgres applies a
-- FOR ALL policy's USING qualifier to determine row visibility for BOTH
-- the pre-image (to find candidate rows) and, empirically, the resulting
-- row -- so flipping is_submitted false -> true via UPDATE always failed
-- RLS (42501), regardless of WITH CHECK. This was never caught because
-- a reviewer's very first "Submit Review" click INSERTs the row (no
-- existing review yet), which has no USING clause to violate -- the
-- UPDATE path only gets exercised on a second write to the same row,
-- e.g. "Save Progress" followed later by "Submit Review", or (the
-- motivating case) round 2 of a review after resubmit_abstract() resets
-- is_submitted back to false for a fresh round.
--
-- Fix: split into command-specific policies so the UPDATE policy's own
-- USING (gates the OLD row only) and WITH CHECK (gates the NEW row
-- only, and doesn't repeat the is_submitted condition) are independent.
drop policy if exists reviewers_manage_own_reviews on reviews;

create policy reviewers_select_own_reviews on reviews for select
using (reviewer_id = auth.uid());

create policy reviewers_insert_own_reviews on reviews for insert
with check (reviewer_id = auth.uid());

create policy reviewers_update_own_reviews on reviews for update
using (reviewer_id = auth.uid() and not is_submitted)
with check (reviewer_id = auth.uid());

create policy reviewers_delete_own_reviews on reviews for delete
using (reviewer_id = auth.uid() and not is_submitted);
