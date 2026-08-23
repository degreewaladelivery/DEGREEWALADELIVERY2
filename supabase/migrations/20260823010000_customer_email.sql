-- Optional contact email.
--
-- Deliberately not unique and not verified: it is a convenience field, not an
-- identity. The phone number is what logs someone in, and a household sharing
-- one email address should not lock the second person out of their account.
--
-- Also deliberately not copied onto orders the way the name is. A name is
-- operational — the agent asks for it at the door — whereas an email is only
-- ever a way to reach the person who owns the account today, so the current
-- value is the right one.
alter table customers
  add column if not exists email text;
