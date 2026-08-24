-- "3 times" means three dates, not three deliveries.
--
-- The counter previously advanced only on confirmation, so a skipped month did
-- not use one up and the schedule kept asking until three had actually arrived.
-- A customer who stopped responding would be asked every month indefinitely —
-- "3 times" could become twelve reminders, which is not what anyone agreed to.
--
-- Counting the dates instead makes a schedule finite the moment it is created:
-- pick the 5th three times on 24 August and it runs on 5 September, 5 October
-- and 5 November, whatever happens in between. A skipped month is a missed
-- delivery, not a deferred one.
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

  -- Count the date and move on. Running twice in a day is harmless: the first
  -- call pushes next_run_on into next month, so the second matches nothing.
  update scheduled_orders
  set
    occurrences_done = occurrences_done + 1,
    next_run_on = case
      when occurrences_done + 1 >= occurrences_total then null
      else scheduled_order_next_date(
        (date_trunc('month', current_date) + interval '1 month')::date,
        day_of_month
      )
    end,
    status = case
      when occurrences_done + 1 >= occurrences_total then 'finished'
      else status
    end
  where status = 'active'
    and next_run_on is not null
    and next_run_on <= current_date
    and occurrences_done < occurrences_total;

  return opened;
end;
$$;

revoke all on function open_due_scheduled_orders() from public;
grant execute on function open_due_scheduled_orders() to service_role;
