-- Repeat orders: "send me this again on the 5th, three times".
--
-- Deliberately not a standing order that delivers by itself. On each due date a
-- run is opened and the customer is asked to confirm; nothing reaches an agent
-- until they do. A monthly delivery that arrives unasked, paid in cash at the
-- door, is a complaint waiting to happen — someone travelling for a fortnight
-- would come back to deliveries nobody accepted.

create table scheduled_orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,

  -- What to reorder. Names and quantities are snapshotted so the schedule still
  -- reads correctly months later, but the price is NOT: it is recomputed at
  -- confirmation, because nobody can hold a price for six months.
  items jsonb not null,

  -- Carried from the order this was created from, so the pickup label matches.
  shop_id uuid,

  delivery_address text not null,
  delivery_latitude double precision not null,
  delivery_longitude double precision not null,

  -- 1–31. Months are shorter than 31 days, so the run date is clamped to the
  -- last day when the month cannot hold it — asking for the 31st means "the
  -- 31st, or the end of the month".
  day_of_month integer not null check (day_of_month between 1 and 31),

  occurrences_total integer not null check (occurrences_total between 1 and 24),
  occurrences_done integer not null default 0,

  next_run_on date,

  status text not null default 'active'
    check (status in ('active', 'finished', 'cancelled')),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scheduled_orders_due_idx on scheduled_orders (next_run_on)
  where status = 'active';
create index scheduled_orders_customer_idx on scheduled_orders (customer_id, created_at desc);

create trigger scheduled_orders_set_updated_at before update on scheduled_orders
  for each row execute function set_updated_at();

-- One row per due date. Keeping runs separate from the schedule means a missed
-- month is recorded as missed rather than vanishing, and the customer can see
-- what happened.
create table scheduled_order_runs (
  id uuid primary key default gen_random_uuid(),
  scheduled_order_id uuid not null references scheduled_orders (id) on delete cascade,
  due_on date not null,
  status text not null default 'awaiting'
    check (status in ('awaiting', 'confirmed', 'skipped')),
  -- Set once the customer confirms and a real order exists.
  order_id uuid references orders (id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (scheduled_order_id, due_on)
);

create index scheduled_order_runs_awaiting_idx on scheduled_order_runs (due_on)
  where status = 'awaiting';

alter table scheduled_orders enable row level security;
alter table scheduled_order_runs enable row level security;

-- Customers authenticate with our own session tokens, which RLS cannot see, so
-- every customer-facing read goes through an edge function on the service role.
-- Only admins are addressed here.
create policy "Admins manage scheduled orders"
  on scheduled_orders for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

create policy "Admins manage scheduled order runs"
  on scheduled_order_runs for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

/**
 * The next date on or after `from_date` that falls on `day`, clamped to the end
 * of the month. Asking for the 31st in February means the 28th (or 29th).
 */
create or replace function scheduled_order_next_date(from_date date, day integer)
returns date
language sql
immutable
as $$
  select make_date(
    extract(year from from_date)::int,
    extract(month from from_date)::int,
    least(day, extract(day from (date_trunc('month', from_date) + interval '1 month - 1 day'))::int)
  );
$$;

/**
 * Opens a run for every schedule due today, and closes yesterday's unanswered
 * ones.
 *
 * An unanswered run is skipped, never delivered: the customer said what they
 * wanted on the day they set it up, not what they want today, and silence is
 * not consent to a cash delivery. The schedule itself survives — one missed
 * month should not cancel a standing arrangement.
 */
create or replace function open_due_scheduled_orders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  opened integer := 0;
begin
  -- Yesterday's unanswered runs are done with.
  update scheduled_order_runs
  set status = 'skipped', resolved_at = now()
  where status = 'awaiting' and due_on < current_date;

  -- Open today's.
  with due as (
    select id from scheduled_orders
    where status = 'active'
      and next_run_on is not null
      and next_run_on <= current_date
      and occurrences_done < occurrences_total
  ), created as (
    insert into scheduled_order_runs (scheduled_order_id, due_on)
    select id, current_date from due
    on conflict (scheduled_order_id, due_on) do nothing
    returning scheduled_order_id
  )
  select count(*) into opened from created;

  -- Move every schedule that was due on to next month, whether or not a run was
  -- inserted, so a duplicate run can never leave one stuck on today's date.
  update scheduled_orders
  set next_run_on = scheduled_order_next_date(
        (date_trunc('month', current_date) + interval '1 month')::date,
        day_of_month
      )
  where status = 'active'
    and next_run_on is not null
    and next_run_on <= current_date
    and occurrences_done < occurrences_total;

  return opened;
end;
$$;

revoke all on function open_due_scheduled_orders() from public;

-- Once a day, early, so the reminder arrives in the morning rather than
-- overnight. As with release_stalled_orders, a failure to schedule must not
-- block the migration — the function still exists and can be called directly.
do $$
begin
  create extension if not exists pg_cron with schema extensions;

  perform cron.unschedule('open-due-scheduled-orders')
  where exists (select 1 from cron.job where jobname = 'open-due-scheduled-orders');

  perform cron.schedule(
    'open-due-scheduled-orders',
    '30 3 * * *',
    $cron$select open_due_scheduled_orders()$cron$
  );
exception
  when others then
    raise notice 'Could not schedule open_due_scheduled_orders: %', sqlerrm;
end
$$;
