-- FCM/APNs device tokens for the delivery agent mobile app.
--
-- Separate from agent_push_subscriptions because the two channels are genuinely
-- different: Web Push is a per-browser endpoint with encryption keys we sign
-- against, while a device token is an opaque string handed to Google's or
-- Apple's service. Squeezing both into one table would mean nullable columns
-- that only make sense for half the rows.
--
-- An agent may have both — the dashboard on a laptop and the app on a phone —
-- and both should ring.

create table if not exists agent_device_tokens (
  token text primary key,
  user_id uuid not null references delivery_agents (user_id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists agent_device_tokens_user_id_idx
  on agent_device_tokens (user_id);

alter table agent_device_tokens enable row level security;

-- An agent manages only their own devices. The sender runs with the service
-- role and bypasses this.
create policy "Agents manage own device tokens"
  on agent_device_tokens
  for all
  using (is_agent(auth.uid()) and user_id = auth.uid())
  with check (is_agent(auth.uid()) and user_id = auth.uid());

create policy "Admins can view device tokens"
  on agent_device_tokens
  for select
  using (is_admin(auth.uid()));
