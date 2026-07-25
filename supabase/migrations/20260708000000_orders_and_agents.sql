create table delivery_agents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table delivery_agents enable row level security;

create or replace function is_agent(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from delivery_agents where user_id = uid and is_active);
$$;

create or replace function am_i_agent()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select is_agent(auth.uid());
$$;

grant execute on function am_i_agent() to authenticated;

create policy "Agents can view own profile"
  on delivery_agents for select
  using (auth.uid() = user_id);

create policy "Admins can manage agents"
  on delivery_agents for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create table orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id),
  customer_phone text not null,
  pickup_label text not null,
  pickup_latitude double precision,
  pickup_longitude double precision,
  delivery_address text not null,
  delivery_latitude double precision,
  delivery_longitude double precision,
  distance_km numeric,
  items jsonb not null,
  subtotal numeric not null,
  delivery_fee numeric not null,
  taxes numeric not null,
  total numeric not null,
  agent_payout numeric not null,
  payment_method text not null default 'cod',
  status text not null default 'placed',
  claimed_by uuid references delivery_agents (user_id),
  claimed_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (status in ('placed', 'claimed', 'picked_up', 'delivered', 'cancelled'))
);

alter table orders enable row level security;

create policy "Anyone can place an order"
  on orders for insert
  with check (true);

create policy "Agents can view open pool and own claims"
  on orders for select
  using (
    is_agent(auth.uid())
    and (claimed_by is null or claimed_by = auth.uid())
  );

create policy "Agents can claim and update their own orders"
  on orders for update
  using (is_agent(auth.uid()) and (claimed_by is null or claimed_by = auth.uid()))
  with check (is_agent(auth.uid()) and (claimed_by is null or claimed_by = auth.uid()));

create policy "Admins can manage all orders"
  on orders for all
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger orders_set_updated_at before update on orders
  for each row execute function set_updated_at();

create index orders_open_pool_idx on orders (status) where claimed_by is null;
create index orders_claimed_by_idx on orders (claimed_by);
