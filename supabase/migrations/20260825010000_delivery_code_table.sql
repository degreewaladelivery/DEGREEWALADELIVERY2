-- Move the delivery code out of the orders row.
--
-- The previous migration put it on orders and revoked SELECT on that one
-- column. That does not work: Supabase grants `authenticated` table-level
-- SELECT on public tables, and in Postgres a column-level REVOKE only removes
-- column-level grants — the table-level one still covers every column. An agent
-- reading their own order would have read the code they are supposed to be
-- asking the customer for, which makes the whole check theatre.
--
-- A separate table with no policy for agents cannot be got at by accident.
-- Customers receive the code through track-order, which runs on the service
-- role, and the agent's app only ever submits a guess.
create table if not exists order_delivery_codes (
  order_id uuid primary key references orders (id) on delete cascade,
  code text not null,
  created_at timestamptz not null default now()
);

alter table order_delivery_codes enable row level security;

-- Deliberately no policy for agents, and none for customers either: every read
-- of this table happens on the service role. Admins can look, because someone
-- has to be able to read a code out over the phone.
create policy "Admins can view delivery codes"
  on order_delivery_codes for select
  using (is_admin(auth.uid()));

-- Carry over anything the first attempt generated, then take the column away.
insert into order_delivery_codes (order_id, code)
select id, delivery_otp from orders
where delivery_otp is not null
on conflict (order_id) do nothing;

drop trigger if exists orders_set_delivery_otp on orders;
drop function if exists set_delivery_otp();
alter table orders drop column if exists delivery_otp;

-- Four digits, read aloud at a doorstep. Generated after insert so every order
-- has one however it was created — checkout, a repeat, or anything added later.
create or replace function issue_delivery_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into order_delivery_codes (order_id, code)
  values (new.id, lpad((floor(random() * 10000))::int::text, 4, '0'))
  on conflict (order_id) do nothing;
  return new;
end;
$$;

drop trigger if exists orders_issue_delivery_code on orders;
create trigger orders_issue_delivery_code after insert on orders
  for each row execute function issue_delivery_code();

-- Any in-flight order that still has no code.
insert into order_delivery_codes (order_id, code)
select id, lpad((floor(random() * 10000))::int::text, 4, '0')
from orders
where status in ('placed', 'claimed', 'picked_up')
on conflict (order_id) do nothing;

/**
 * Checks the code the customer gave and records that it matched.
 *
 * security definer so it can read a table the caller cannot, and scoped to the
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
  update orders o
  set otp_verified_at = now()
  from order_delivery_codes c
  where o.id = p_order_id
    and c.order_id = o.id
    and o.claimed_by = auth.uid()
    and c.code = regexp_replace(coalesce(p_otp, ''), '\D', '', 'g')
  returning true into matched;

  return coalesce(matched, false);
end;
$$;

revoke all on function verify_delivery_otp(uuid, text) from public;
grant execute on function verify_delivery_otp(uuid, text) to authenticated;
