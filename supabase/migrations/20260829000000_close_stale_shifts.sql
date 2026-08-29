-- A shift left open never ends.
--
-- Going on duty opens one; only the toggle closed it. An agent who switched on,
-- closed the app and went home kept a shift running — so their hours grew
-- overnight and every day afterwards, and the attendance figure stopped meaning
-- anything.
--
-- A shift still open from a previous day was forgotten, not worked. It is
-- closed at the end of the day it started, and the agent is taken off duty.
-- That end time is an approximation and deliberately generous, but it is
-- bounded, which an open shift is not.
create or replace function close_stale_agent_shifts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  closed integer := 0;
begin
  with stale as (
    update agent_shifts
    set ended_at = date_trunc('day', started_at) + interval '1 day' - interval '1 second'
    where ended_at is null
      and started_at < date_trunc('day', now())
    returning agent_id
  )
  select count(*) into closed from stale;

  -- Someone whose shift was abandoned yesterday is not on duty now.
  update delivery_agents
  set is_online = false, went_online_at = null
  where user_id in (
    select agent_id from agent_shifts
    where ended_at = date_trunc('day', started_at) + interval '1 day' - interval '1 second'
      and started_at < date_trunc('day', now())
  )
  and is_online
  and not exists (
    -- Unless they have since started a fresh one today.
    select 1 from agent_shifts s
    where s.agent_id = delivery_agents.user_id and s.ended_at is null
  );

  return closed;
end;
$$;

revoke all on function close_stale_agent_shifts() from public;
grant execute on function close_stale_agent_shifts() to service_role;

do $$
begin
  create extension if not exists pg_cron with schema extensions;

  perform cron.unschedule('close-stale-agent-shifts')
  where exists (select 1 from cron.job where jobname = 'close-stale-agent-shifts');

  -- Just after midnight India time (18:35 UTC), so a shift is tidied up before
  -- the next day's figure is read.
  perform cron.schedule(
    'close-stale-agent-shifts',
    '35 18 * * *',
    $cron$select close_stale_agent_shifts()$cron$
  );
exception
  when others then
    raise notice 'Could not schedule close_stale_agent_shifts: %', sqlerrm;
end
$$;
