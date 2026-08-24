-- Push to a customer's phone.
--
-- Customer notifications have until now been web push only, which reaches a
-- browser and nothing else. App customers — most of them — could only see a
-- repeat-order reminder by opening the app on the day, and since a missed
-- reminder now costs one of their scheduled deliveries, that is the difference
-- between the feature working and the feature being decorative.
create table if not exists customer_device_tokens (
  token text primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists customer_device_tokens_customer_idx
  on customer_device_tokens (customer_id);

alter table customer_device_tokens enable row level security;

-- No customer policy on purpose. Customers hold our own session tokens rather
-- than Supabase auth, so RLS cannot identify them; registration goes through an
-- edge function on the service role, which is also what stops one customer
-- registering a device against another's id.
create policy "Admins can view customer device tokens"
  on customer_device_tokens for select
  using (is_admin(auth.uid()));

-- Remembering that a reminder went out, so a retry — or a second cron tick —
-- cannot notify the same customer twice for the same day.
alter table scheduled_order_runs
  add column if not exists notified_at timestamptz;
