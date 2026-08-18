-- Web Push subscriptions for customers.
--
-- Separate from agent_push_subscriptions because customers are not Supabase Auth
-- users — they sign in with our own OTP tokens, so there is no auth.uid() to
-- write an RLS policy against. Nothing may touch this table directly; it is
-- written only by the save-push-subscription function, which resolves the
-- customer's session server-side first.

create table if not exists customer_push_subscriptions (
  endpoint text primary key,
  customer_id uuid not null references customers (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists customer_push_subscriptions_customer_id_idx
  on customer_push_subscriptions (customer_id);

alter table customer_push_subscriptions enable row level security;

-- No policies for anon or authenticated on purpose: a customer's push endpoint
-- is theirs alone, and the only legitimate access is through an edge function
-- running with the service role.
create policy "Admins can view customer push subscriptions"
  on customer_push_subscriptions
  for select
  using (is_admin(auth.uid()));
