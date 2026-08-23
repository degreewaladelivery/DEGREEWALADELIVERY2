-- Customers had row level security on with no policy behind it, so the table
-- was readable only by the service role. Everything customer-facing goes
-- through edge functions, so nothing was broken by that — but it also meant an
-- admin could not see who had signed up, and the name and email now collected
-- on the profile had nowhere to be read.
--
-- Read-only, and only for admins. Nobody edits a customer's details from the
-- office: the phone number is the login identity, and the name and email belong
-- to the person who entered them.
create policy "Admins can view customers"
  on customers for select
  using (is_admin(auth.uid()));
