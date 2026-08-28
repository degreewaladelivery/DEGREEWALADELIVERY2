-- Agent identity documents, and a record of when they were working.

-- ------------------------------------------------------------------- KYC --
-- Deliberately no Aadhaar number column.
--
-- Storing Aadhaar numbers carries obligations under the Aadhaar Act that a
-- delivery service has no business taking on, and it is not needed: what the
-- office actually wants is confidence that a real, identifiable person is
-- carrying customers' goods and cash. A driving licence number and a photograph
-- of the documents do that. If an Aadhaar card is what an agent brings, the
-- photograph is enough — the number does not need transcribing.
alter table delivery_agents
  add column if not exists licence_number text,
  add column if not exists id_proof_url text,
  add column if not exists licence_url text,
  add column if not exists kyc_verified_at timestamptz,
  add column if not exists kyc_verified_by uuid references auth.users (id) on delete set null,
  add column if not exists emergency_contact text;

-- --------------------------------------------------------------- shifts --
-- One row per stretch of being on duty, so attendance is a record of what
-- happened rather than a single "last seen" that the next login overwrites.
create table if not exists agent_shifts (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references delivery_agents (user_id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create index if not exists agent_shifts_agent_idx
  on agent_shifts (agent_id, started_at desc);

-- At most one shift open per agent, so a crash or a second device cannot leave
-- two running and double-count the hours.
create unique index if not exists agent_shifts_one_open_idx
  on agent_shifts (agent_id) where ended_at is null;

alter table agent_shifts enable row level security;

create policy "Agents read their own shifts"
  on agent_shifts for select
  using (auth.uid() = agent_id);

create policy "Admins manage agent shifts"
  on agent_shifts for all
  using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

/**
 * Goes on or off duty, and keeps the attendance record in step.
 *
 * Both happen together here rather than in two client calls: an app that
 * crashed between them would leave an agent marked available with no shift
 * open, or a shift running for someone who has gone home.
 */
create or replace function set_agent_duty(p_online boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_agent(auth.uid()) then
    raise exception 'Not a delivery agent';
  end if;

  update delivery_agents
  set is_online = p_online,
      went_online_at = case when p_online then now() else null end
  where user_id = auth.uid();

  if p_online then
    -- Does nothing if a shift is already open, which is the right answer for a
    -- reconnect or a second device.
    insert into agent_shifts (agent_id)
    select auth.uid()
    where not exists (
      select 1 from agent_shifts
      where agent_id = auth.uid() and ended_at is null
    );
  else
    update agent_shifts
    set ended_at = now()
    where agent_id = auth.uid() and ended_at is null;
  end if;
end;
$$;

revoke all on function set_agent_duty(boolean) from public;
grant execute on function set_agent_duty(boolean) to authenticated;

/** Hours worked today, and the shift currently running if there is one. */
create or replace function agent_today_minutes()
returns integer
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    sum(
      extract(epoch from (coalesce(ended_at, now()) - greatest(started_at, date_trunc('day', now()))))
    )::int / 60,
    0
  )
  from agent_shifts
  where agent_id = auth.uid()
    and coalesce(ended_at, now()) >= date_trunc('day', now());
$$;

revoke all on function agent_today_minutes() from public;
grant execute on function agent_today_minutes() to authenticated;
