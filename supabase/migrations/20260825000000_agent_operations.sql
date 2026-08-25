-- The agent side of a delivery: being on duty, proving arrival, handling cash,
-- and reporting a delivery that could not be made.

-- ------------------------------------------------------------ on/off duty --
-- Every active agent was pushed every order, at any hour, with no way to say
-- "not tonight". Defaulting to false would silence the agents already working,
-- so existing rows start online and can switch off.
alter table delivery_agents
  add column if not exists is_online boolean not null default true,
  add column if not exists went_online_at timestamptz;

-- ------------------------------------------------------------ delivery OTP --
-- A code the customer reads out at the door.
--
-- Kept out of reach of the agent: revoking the column from authenticated means
-- the app cannot read it even though the agent can read the rest of the order.
-- Customers receive it through track-order, which runs on the service role and
-- is unaffected.
alter table orders
  add column if not exists delivery_otp text,
  add column if not exists otp_verified_at timestamptz,
  add column if not exists cash_collected_at timestamptz,
  add column if not exists failure_reason text;

revoke select (delivery_otp) on orders from anon, authenticated;

-- Four digits, read aloud at a doorstep. Generated here rather than in the
-- application so every order has one however it was created — checkout, a
-- repeat, or anything added later.
create or replace function set_delivery_otp()
returns trigger
language plpgsql
as $$
begin
  if new.delivery_otp is null then
    new.delivery_otp := lpad((floor(random() * 10000))::int::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_delivery_otp on orders;
create trigger orders_set_delivery_otp before insert on orders
  for each row execute function set_delivery_otp();

-- Existing orders that are still in flight need one too.
update orders
set delivery_otp = lpad((floor(random() * 10000))::int::text, 4, '0')
where delivery_otp is null and status in ('placed', 'claimed', 'picked_up');

/**
 * Checks the code the customer gave and records that it matched.
 *
 * security definer so it can read a column the caller cannot, and scoped to the
 * agent holding the order — knowing an order id is not enough to close someone
 * else's delivery.
 */
create or replace function verify_delivery_otp(p_order_id uuid, p_otp text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  matched boolean;
begin
  update orders
  set otp_verified_at = now()
  where id = p_order_id
    and claimed_by = auth.uid()
    and delivery_otp = regexp_replace(coalesce(p_otp, ''), '\D', '', 'g')
  returning true into matched;

  return coalesce(matched, false);
end;
$$;

revoke all on function verify_delivery_otp(uuid, text) from public;
grant execute on function verify_delivery_otp(uuid, text) to authenticated;

/**
 * A delivery cannot be closed without the code.
 *
 * Enforced in the database, not the app: an agent holds real credentials and
 * could otherwise mark an order delivered with a direct API call from anywhere.
 * Without this the OTP would be decoration.
 *
 * Admins are exempt, because someone has to be able to close an order when a
 * customer has lost the code or the phone is dead.
 */
create or replace function require_otp_before_delivered()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'delivered'
     and coalesce(old.status, '') <> 'delivered'
     and new.otp_verified_at is null
     and not is_admin(auth.uid())
  then
    raise exception 'Enter the customer''s delivery code first';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_require_otp on orders;
create trigger orders_require_otp before update on orders
  for each row execute function require_otp_before_delivered();

-- --------------------------------------------------------- failed delivery --
-- Nobody home, wrong address, customer refused. Previously an order like that
-- simply sat in 'picked_up' for ever with nothing to say why.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('placed', 'claimed', 'picked_up', 'delivered', 'cancelled', 'failed'));

-- ------------------------------------------------------------ cash ledger --
-- Cash on delivery means agents carry the shop's money. What they have
-- collected and what they have handed over were both unrecorded, which is a
-- ledger kept in people's heads.
create table if not exists agent_cash_settlements (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references delivery_agents (user_id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  recorded_by uuid references auth.users (id) on delete set null,
  settled_at timestamptz not null default now()
);

create index if not exists agent_cash_settlements_agent_idx
  on agent_cash_settlements (agent_id, settled_at desc);

alter table agent_cash_settlements enable row level security;

create policy "Agents read their own settlements"
  on agent_cash_settlements for select
  using (auth.uid() = agent_id);

create policy "Admins manage agent settlements"
  on agent_cash_settlements for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- What each agent is holding: cash taken at the door, less what has been handed
-- in. Derived rather than stored, so a corrected settlement can never leave a
-- running total stale.
create or replace view agent_cash_balances
with (security_invoker = true) as
select
  a.user_id as agent_id,
  a.name,
  a.phone,
  coalesce(c.collected, 0) as collected,
  coalesce(s.settled, 0) as settled,
  coalesce(c.collected, 0) - coalesce(s.settled, 0) as outstanding
from delivery_agents a
left join (
  select claimed_by, sum(total) as collected
  from orders
  where status = 'delivered'
    and payment_method = 'cod'
    and cash_collected_at is not null
  group by claimed_by
) c on c.claimed_by = a.user_id
left join (
  select agent_id, sum(amount) as settled
  from agent_cash_settlements
  group by agent_id
) s on s.agent_id = a.user_id;
