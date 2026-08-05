create table customer_sessions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table customer_sessions enable row level security;

create index customer_sessions_token_hash_idx on customer_sessions (token_hash);
create index customer_sessions_customer_idx on customer_sessions (customer_id);

drop policy "Anyone can place an order" on orders;
