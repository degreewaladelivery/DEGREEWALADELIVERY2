-- Every order must reach an end. None may sit waiting on somebody forever.
--
-- The previous sweep handled agents who abandoned a job, but left the biggest
-- hole open: an order nobody ever accepts stays in the pool indefinitely, and
-- the customer waits with no idea that nothing is coming. Flagged orders were
-- also a dead end — the flag was set and then nothing ever acted on it.
--
-- Terminal outcomes, by situation:
--
--   nobody accepted it            -> cancelled automatically. Nothing was
--                                    collected, so no one is left holding goods,
--                                    and an unstaffed hour shouldn't strand a
--                                    customer overnight.
--   bounced between agents        -> cancelled automatically, same reasoning.
--   picked up, never delivered    -> flagged for a person, never auto-cancelled.
--                                    The agent physically has the goods; only a
--                                    human knows whether it arrived, got lost or
--                                    needs refunding.

alter table orders add column if not exists cancel_reason text;

comment on column orders.cancel_reason is
  'Why an order ended without delivery, when the system closed it rather than a person.';

create or replace function release_stalled_orders(
  pickup_timeout_minutes integer default 30,
  delivery_timeout_minutes integer default 90,
  max_releases integer default 3,
  unclaimed_timeout_minutes integer default 45
)
returns table (released integer, cancelled integer, flagged integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  released_count integer := 0;
  cancelled_count integer := 0;
  flagged_count integer := 0;
begin
  -- Accepted but never collected: hand it back, wiping the last agent's
  -- position so the next one doesn't inherit it.
  with returned as (
    update orders
    set claimed_by = null,
        claimed_at = null,
        status = 'placed',
        release_count = release_count + 1,
        agent_latitude = null,
        agent_longitude = null,
        agent_location_at = null
    where status = 'claimed'
      and claimed_at < now() - make_interval(mins => pickup_timeout_minutes)
      and release_count < max_releases
      and stalled_at is null
    returning 1
  )
  select count(*) into released_count from returned;

  -- Nobody took it, or it went round the agents and came back every time.
  -- Nothing has been collected in either case, so closing it is safe and
  -- honest: better a customer told no one is coming than one left waiting.
  with gave_up as (
    update orders
    set status = 'cancelled',
        cancel_reason = 'No delivery agent was available',
        stalled_at = coalesce(stalled_at, now())
    where status = 'placed'
      and (
        created_at < now() - make_interval(mins => unclaimed_timeout_minutes)
        or release_count >= max_releases
      )
    returning 1
  )
  select count(*) into cancelled_count from gave_up;

  -- Agent is holding the goods. Never closed automatically — a person has to
  -- find out what actually happened.
  with undelivered as (
    update orders
    set stalled_at = now()
    where status = 'picked_up'
      and picked_up_at < now() - make_interval(mins => delivery_timeout_minutes)
      and stalled_at is null
    returning 1
  )
  select count(*) into flagged_count from undelivered;

  return query select released_count, cancelled_count, flagged_count;
end;
$$;

revoke all on function release_stalled_orders(integer, integer, integer, integer) from public;
grant execute on function release_stalled_orders(integer, integer, integer, integer) to service_role;

-- Re-point the schedule at the new signature.
do $$
begin
  perform cron.unschedule('release-stalled-orders')
  where exists (select 1 from cron.job where jobname = 'release-stalled-orders');

  perform cron.schedule(
    'release-stalled-orders',
    '* * * * *',
    $cron$select release_stalled_orders()$cron$
  );
exception
  when others then
    raise notice 'Could not schedule release_stalled_orders: %', sqlerrm;
end
$$;

-- The old three-argument version would otherwise linger and could still be
-- called with the previous behaviour.
drop function if exists release_stalled_orders(integer, integer, integer);
