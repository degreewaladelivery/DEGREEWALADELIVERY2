alter table orders
  add column agent_latitude double precision,
  add column agent_longitude double precision,
  add column agent_location_at timestamptz;
