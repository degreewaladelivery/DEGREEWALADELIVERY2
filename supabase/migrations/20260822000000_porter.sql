-- Porter goods transport (Part Two).
--
-- Economically the opposite of delivery: the customer pays the driver directly
-- and in full, and DegreeWala takes a commission off the driver afterwards.
-- Nothing about the fare passes through us, so the commission is a debt the
-- driver accrues and settles later — which is why this schema carries a ledger
-- rather than a payout column.

-- ---------------------------------------------------------------- rate card --
-- Rates live here rather than in code: they have already changed once since the
-- pricing deck, and the next change should be a form field, not a deploy.
create table porter_vehicle_types (
  code text primary key,
  name text not null,
  base_fare numeric(10, 2) not null check (base_fare >= 0),
  per_km numeric(10, 2) not null check (per_km >= 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into porter_vehicle_types (code, name, base_fare, per_km, sort_order) values
  ('two_wheeler', 'Two-wheeler',      99,  15, 1),
  ('auto',        'Auto / 3-wheeler', 199, 37, 2),
  ('mini_tempo',  'Mini tempo',       299, 45, 3);

alter table porter_vehicle_types enable row level security;

-- Customers must see the rate card before booking, so reads are public. Writes
-- are admin-only: this table sets what every customer is charged.
create policy "Public can view porter vehicle types"
  on porter_vehicle_types for select using (true);

create policy "Admins manage porter vehicle types"
  on porter_vehicle_types for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

alter table app_settings
  add column if not exists porter_commission_percent numeric(5, 2) not null default 10
  check (porter_commission_percent >= 0 and porter_commission_percent <= 100);

-- ------------------------------------------------------------------ drivers --
-- Separate from delivery_agents on purpose. A delivery agent is paid by
-- DegreeWala; a porter driver owes DegreeWala. Sharing one table would put two
-- opposite money flows behind the same row and invite paying someone who should
-- be billed.
create table porter_drivers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  phone text not null,
  vehicle_type_code text not null references porter_vehicle_types (code),
  vehicle_number text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table porter_drivers enable row level security;

create or replace function is_porter_driver(uid uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from porter_drivers
    where user_id = uid and is_active
  );
$$;

create policy "Porter drivers read their own row"
  on porter_drivers for select using (auth.uid() = user_id);

create policy "Admins manage porter drivers"
  on porter_drivers for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- --------------------------------------------------------------------- jobs --
create table porter_jobs (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  customer_phone text not null,

  -- Unlike a delivery, both ends are chosen per job: there is no shop to start
  -- from and no saved home address to finish at.
  pickup_address text not null,
  pickup_latitude double precision not null,
  pickup_longitude double precision not null,
  drop_address text not null,
  drop_latitude double precision not null,
  drop_longitude double precision not null,

  goods_note text,
  vehicle_type_code text not null references porter_vehicle_types (code),
  distance_km numeric(10, 2) not null,

  -- The fare is snapshotted, not recomputed. An admin editing the rate card
  -- must never change what an already-quoted job costs.
  base_fare numeric(10, 2) not null,
  distance_fare numeric(10, 2) not null,
  fare_total numeric(10, 2) not null,

  -- Likewise the commission: the rate that applied the day the job ran is the
  -- rate the driver owes, whatever the setting says later.
  commission_percent numeric(5, 2) not null,
  commission_amount numeric(10, 2) not null,

  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'arrived', 'loaded', 'delivered', 'cancelled')),
  cancel_reason text,

  driver_id uuid references porter_drivers (user_id) on delete set null,
  accepted_at timestamptz,
  arrived_at timestamptz,
  loaded_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index porter_jobs_open_idx on porter_jobs (created_at desc) where status = 'requested';
create index porter_jobs_driver_idx on porter_jobs (driver_id, created_at desc);
create index porter_jobs_customer_idx on porter_jobs (customer_id, created_at desc);

create trigger porter_jobs_set_updated_at before update on porter_jobs
  for each row execute function set_updated_at();

alter table porter_jobs enable row level security;

-- Customers authenticate with our own session tokens rather than Supabase auth,
-- so their reads arrive through edge functions using the service role. Only
-- drivers and admins are addressed here.
create policy "Porter drivers see open and own jobs"
  on porter_jobs for select
  using (
    is_porter_driver(auth.uid())
    and (status = 'requested' or driver_id = auth.uid())
  );

create policy "Porter drivers update their own jobs"
  on porter_jobs for update
  using (is_porter_driver(auth.uid()) and driver_id = auth.uid())
  with check (is_porter_driver(auth.uid()) and driver_id = auth.uid());

create policy "Admins manage porter jobs"
  on porter_jobs for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- -------------------------------------------------------------- settlements --
-- Money handed to DegreeWala offline — cash or UPI — recorded so a driver's
-- outstanding balance falls. There is no payment gateway behind this yet, so it
-- is deliberately a record of something that happened in person.
create table porter_settlements (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references porter_drivers (user_id) on delete cascade,
  amount numeric(10, 2) not null check (amount > 0),
  note text,
  recorded_by uuid references auth.users (id) on delete set null,
  settled_at timestamptz not null default now()
);

create index porter_settlements_driver_idx on porter_settlements (driver_id, settled_at desc);

alter table porter_settlements enable row level security;

create policy "Porter drivers read their own settlements"
  on porter_settlements for select
  using (auth.uid() = driver_id);

create policy "Admins manage porter settlements"
  on porter_settlements for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- What each driver still owes: commission earned on delivered jobs, less what
-- has been handed over. Derived rather than stored, so a corrected settlement
-- can never leave a running total stale.
create view porter_driver_balances
with (security_invoker = true) as
select
  d.user_id as driver_id,
  d.name,
  d.phone,
  coalesce(j.commission_owed, 0) as commission_owed,
  coalesce(s.settled, 0) as settled,
  coalesce(j.commission_owed, 0) - coalesce(s.settled, 0) as outstanding,
  j.jobs_delivered
from porter_drivers d
left join (
  select driver_id, sum(commission_amount) as commission_owed, count(*) as jobs_delivered
  from porter_jobs
  where status = 'delivered'
  group by driver_id
) j on j.driver_id = d.user_id
left join (
  select driver_id, sum(amount) as settled
  from porter_settlements
  group by driver_id
) s on s.driver_id = d.user_id;
