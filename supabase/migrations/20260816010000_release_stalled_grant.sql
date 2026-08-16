-- Let the server call the release directly, as well as on the cron schedule.
--
-- The scheduling block in the previous migration swallows failures so a missing
-- pg_cron can't block a deploy — which means it could quietly never run. Calling
-- it from place-order too guarantees stalled orders get swept whenever the shop
-- is active, which is exactly when it matters.
grant execute on function release_stalled_orders(integer, integer, integer) to service_role;
