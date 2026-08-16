-- Stop orders getting stuck on an agent who accepted and then disappeared.
--
-- Until now nothing ever released a claim. An agent who accepted a job and shut
-- their phone held it forever: no other agent could see it, and the customer
-- watched a delivery that was never coming.
--
-- Two different situations, deliberately handled differently:
--
--   claimed, never picked up  -> safe to return to the pool. Nothing has moved;
--                                another agent can start cleanly.
--   picked up, never delivered -> NOT safe to return. That agent is holding the
--                                goods. Sending a second agent to the shop means
--                                they arrive to find nothing. Flag it for a human.

alter table orders add column if not exists release_count integer not null default 0;
alter table orders add column if not exists stalled_at timestamptz;

comment on column orders.release_count is
  'Times this order returned to the pool after an agent went quiet.';
comment on column orders.stalled_at is
  'Set when an order needs a human: repeatedly abandoned, or picked up and never delivered.';

-- Minutes of silence before we act. Generous enough to survive a long queue at
-- the shop or a patch of no signal.
create or replace function release_stalled_orders(
  pickup_timeout_minutes integer default 30,
  delivery_timeout_minutes integer default 90,
  max_releases integer default 3
)
returns table (released integer, flagged integer)
language plpgsql
-- Runs as owner: this bypasses the agent RLS policies on purpose, because it
-- acts on behalf of nobody.
security definer
set search_path = public
as $$
declare
  released_count integer := 0;
  flagged_count integer := 0;
begin
  -- Accepted but never collected: hand it back.
  with returned as (
    update orders
    set claimed_by = null,
        claimed_at = null,
        status = 'placed',
        release_count = release_count + 1,
        -- The next agent must not inherit the last one's position.
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

  -- Passed around too many times already — putting it back would just repeat.
  with repeatedly_failed as (
    update orders
    set stalled_at = now()
    where status = 'claimed'
      and claimed_at < now() - make_interval(mins => pickup_timeout_minutes)
      and release_count >= max_releases
      and stalled_at is null
    returning 1
  ),
  -- Agent has the goods; only a person can sort this out.
  undelivered as (
    update orders
    set stalled_at = now()
    where status = 'picked_up'
      and picked_up_at < now() - make_interval(mins => delivery_timeout_minutes)
      and stalled_at is null
    returning 1
  )
  select (select count(*) from repeatedly_failed) + (select count(*) from undelivered)
  into flagged_count;

  return query select released_count, flagged_count;
end;
$$;

revoke all on function release_stalled_orders(integer, integer, integer) from public;

-- Run it every minute. pg_cron is available on Supabase; if scheduling fails the
-- function still exists and can be called by hand, so a missing extension
-- doesn't block the migration.
do $$
begin
  create extension if not exists pg_cron with schema extensions;

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
