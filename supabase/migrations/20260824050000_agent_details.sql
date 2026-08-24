-- Who is actually bringing the order.
--
-- A customer waiting at the door was told a name, a distance and given a Call
-- button. What they could not do is recognise the person arriving: the agent
-- record held no vehicle and no face, so "someone on a bike" was the whole
-- description. In a town where deliveries arrive at gates and shared entrances,
-- a registration number is the difference between spotting your order and
-- phoning to ask where it is.
alter table delivery_agents
  add column if not exists vehicle_number text,
  add column if not exists photo_url text;
