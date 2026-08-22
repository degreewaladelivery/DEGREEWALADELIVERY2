-- A driver has to be able to touch a job before it is theirs.
--
-- The original update policy required driver_id = auth.uid(), which is never
-- true for an open job: driver_id is null until someone accepts it. Every
-- accept would have failed silently, leaving jobs stranded in 'requested'.
--
-- This mirrors how delivery orders are claimed: the policy admits rows that are
-- still unclaimed, and the client's update carries `driver_id is null` in its
-- where clause, so two drivers racing the same job means exactly one update
-- matches and the loser is told the job is gone.
drop policy if exists "Porter drivers update their own jobs" on porter_jobs;

create policy "Porter drivers claim open jobs and update their own"
  on porter_jobs for update
  using (
    is_porter_driver(auth.uid())
    and (driver_id is null or driver_id = auth.uid())
  )
  with check (
    is_porter_driver(auth.uid())
    and (driver_id is null or driver_id = auth.uid())
  );
