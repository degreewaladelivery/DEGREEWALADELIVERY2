create table customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table customers enable row level security;

create trigger customers_set_updated_at before update on customers
  for each row execute function set_updated_at();
