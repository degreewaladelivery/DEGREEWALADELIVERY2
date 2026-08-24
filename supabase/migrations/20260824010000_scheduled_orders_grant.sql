-- Let the server open due runs directly, as well as on the daily cron.
--
-- Same reasoning as release_stalled_orders: the scheduling block swallows
-- failures so a missing pg_cron cannot block a deploy, which means the job could
-- quietly never run. Calling it when a customer opens their orders guarantees a
-- reminder appears on the day even if the schedule never fired.
--
-- The previous migration revoked it from public and stopped there, so this call
-- would have failed for the service role too.
grant execute on function open_due_scheduled_orders() to service_role;

-- Not revoked from public: it is a pure date helper with no side effects, and
-- the server needs it when working out a new schedule's first run.
grant execute on function scheduled_order_next_date(date, integer) to service_role;
