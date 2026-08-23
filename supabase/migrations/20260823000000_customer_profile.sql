-- Customers have only ever been a phone number.
--
-- A name is the one profile field that does real work here: the agent arriving
-- at the door currently has nothing to ask for, and every order in the admin
-- list reads as a bare 10-digit number.
alter table customers
  add column if not exists name text;

-- Snapshotted onto the order rather than joined, for the same reason the items
-- and prices are: an order is a record of what happened. Someone correcting
-- their name months later should not silently rewrite who past deliveries went
-- to, and an agent looking at today's job should see the name that was current
-- when it was placed.
alter table orders
  add column if not exists customer_name text;
