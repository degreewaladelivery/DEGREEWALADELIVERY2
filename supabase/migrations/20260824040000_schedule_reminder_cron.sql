-- Send the reminder, once a morning.
--
-- pg_cron can only run SQL, so pg_net is used to call the edge function that
-- does the sending. The function opens any due runs itself before looking, so
-- this single job is the whole daily task and a missed tick catches up on the
-- next one.
--
-- 02:30 UTC is 08:00 in India: a reminder that has to be acted on before
-- midnight should arrive at breakfast, not while the customer is asleep. The
-- existing 03:00 UTC job that only opens runs stays as a backstop, so runs still
-- appear in the app even if pg_net or the function is unavailable.
--
-- The URL is the project's public API host — the same one embedded in the web
-- bundle and the APK — and the function is deployed without JWT verification on
-- purpose: it takes no input, reveals nothing, and marks what it has sent, so
-- calling it twice does nothing the second time. A reminder that silently fails
-- to send is the failure this whole path exists to prevent, and an auth secret
-- in a migration would be a worse trade.
do $$
begin
  create extension if not exists pg_net with schema extensions;

  perform cron.unschedule('notify-due-schedules')
  where exists (select 1 from cron.job where jobname = 'notify-due-schedules');

  perform cron.schedule(
    'notify-due-schedules',
    '30 2 * * *',
    $cron$
      select net.http_post(
        url := 'https://wadztwgejykpnntcyhfg.supabase.co/functions/v1/notify-due-schedules',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
      );
    $cron$
  );
exception
  when others then
    raise notice 'Could not schedule notify-due-schedules: %', sqlerrm;
end
$$;
