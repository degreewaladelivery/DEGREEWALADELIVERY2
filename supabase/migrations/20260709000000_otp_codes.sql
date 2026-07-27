create table otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code_hash text not null,
  attempts integer not null default 0,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table otp_codes enable row level security;

create index otp_codes_phone_idx on otp_codes (phone, created_at desc);
