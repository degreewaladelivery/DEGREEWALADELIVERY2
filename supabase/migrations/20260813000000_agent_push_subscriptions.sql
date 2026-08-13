-- Web Push subscriptions for delivery agents.
--
-- One row per browser an agent has enabled alerts in — a rider may have the
-- dashboard on a phone and a spare handset, and both should ring.
--
-- The endpoint is issued by the browser vendor's push service and is unique per
-- subscription, so it doubles as the natural key: re-subscribing on the same
-- browser updates the row rather than piling up duplicates that would make one
-- order buzz the same phone several times.

create table if not exists agent_push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists agent_push_subscriptions_user_id_idx
  on agent_push_subscriptions (user_id);

alter table agent_push_subscriptions enable row level security;

-- An agent manages only their own devices. The sending side runs with the
-- service role and bypasses these entirely.
create policy "Agents manage own push subscriptions"
  on agent_push_subscriptions
  for all
  using (is_agent(auth.uid()) and user_id = auth.uid())
  with check (is_agent(auth.uid()) and user_id = auth.uid());

create policy "Admins can view push subscriptions"
  on agent_push_subscriptions
  for select
  using (is_admin(auth.uid()));
