alter table shops
  add column latitude double precision,
  add column longitude double precision;

create table app_settings (
  id boolean primary key default true,
  pickup_latitude double precision,
  pickup_longitude double precision,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id)
);

insert into app_settings (id) values (true);

alter table app_settings enable row level security;

create policy "Public can view app settings"
  on app_settings for select
  using (true);

create policy "Admins can update app settings"
  on app_settings for update
  using (is_admin(auth.uid()))
  with check (is_admin(auth.uid()));

create trigger app_settings_set_updated_at before update on app_settings
  for each row execute function set_updated_at();
