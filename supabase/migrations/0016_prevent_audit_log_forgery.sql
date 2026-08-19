-- Stress-test audit finding: system_insert_audit_logs had WITH CHECK true
-- for any authenticated session, so a valid JWT could insert arbitrary
-- audit_logs rows via a direct API call -- forged actor_id/action/status
-- history bypassing every server action that legitimately writes here.
-- Every real call site (grepped across app/**/actions.ts) always sets
-- actor_id to the caller's own session id, so requiring that in WITH CHECK
-- closes the forgery gap without touching any legitimate write path.
-- (The submit_abstract/resubmit_abstract SECURITY DEFINER functions write
-- audit_logs too, but SECURITY DEFINER bypasses RLS entirely and is
-- unaffected by this policy.)
drop policy if exists system_insert_audit_logs on audit_logs;
create policy system_insert_audit_logs on audit_logs for insert
with check (actor_id = auth.uid());
