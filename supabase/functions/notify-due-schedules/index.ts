import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { getAccessToken, sendFcm, type ServiceAccount } from '../_shared/fcm.ts';
import { sendPush } from '../_shared/webpush.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? '';

const TITLE = 'Your repeat delivery is due today';
const BODY = 'Open DegreeWala to confirm it — otherwise this month is skipped.';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Ring one customer's phones. Dead tokens are dropped as they are found. */
async function pushToPhones(admin: SupabaseClient, customerIds: string[]): Promise<number> {
  if (!FCM_SERVICE_ACCOUNT || customerIds.length === 0) return 0;

  let account: ServiceAccount;
  try {
    account = JSON.parse(FCM_SERVICE_ACCOUNT);
  } catch {
    return 0;
  }

  const { data: devices } = await admin
    .from('customer_device_tokens')
    .select('token')
    .in('customer_id', customerIds);
  if (!devices || devices.length === 0) return 0;

  const accessToken = await getAccessToken(account);
  const results = await Promise.all(
    devices.map((row) => sendFcm(account, accessToken, row.token as string, TITLE, BODY))
  );

  const dead = results.filter((r) => r.gone).map((r) => r.token);
  if (dead.length > 0) {
    await admin.from('customer_device_tokens').delete().in('token', dead);
  }
  return results.filter((r) => r.ok).length;
}

/** And their browsers, for customers who use the website. */
async function pushToBrowsers(admin: SupabaseClient, customerIds: string[]): Promise<number> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || customerIds.length === 0) return 0;

  const { data: subs } = await admin
    .from('customer_push_subscriptions')
    .select('endpoint, p256dh, auth')
    .in('customer_id', customerIds);
  if (!subs || subs.length === 0) return 0;

  const payload = JSON.stringify({ title: TITLE, body: BODY, url: '/track' });
  const results = await Promise.all(
    subs.map((row) =>
      sendPush(
        {
          endpoint: row.endpoint as string,
          keys: { p256dh: row.p256dh as string, auth: row.auth as string },
        },
        { publicKey: VAPID_PUBLIC_KEY, privateKey: VAPID_PRIVATE_KEY, subject: VAPID_SUBJECT },
        900,
        payload
      )
    )
  );

  const dead = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (dead.length > 0) {
    await admin.from('customer_push_subscriptions').delete().in('endpoint', dead);
  }
  return results.filter((r) => r.status >= 200 && r.status < 300).length;
}

/**
 * Tells customers a repeat delivery is waiting for confirmation today.
 *
 * Opens any run that is due before looking, so this is the whole job in one
 * call — the daily cron has nothing to sequence and a missed tick catches up on
 * the next.
 *
 * Deliberately callable without a session. It reveals nothing, takes no input,
 * and marks what it has sent, so calling it repeatedly does nothing on the
 * second attempt. That is worth more than an auth check here: a reminder that
 * silently fails to send is the exact failure this exists to prevent.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    await admin.rpc('open_due_scheduled_orders').then(
      () => undefined,
      () => undefined
    );

    // Only today's, and only those not already told.
    const today = new Date().toISOString().slice(0, 10);
    const { data: runs } = await admin
      .from('scheduled_order_runs')
      .select('id, scheduled_order_id, scheduled_orders!inner(customer_id)')
      .eq('status', 'awaiting')
      .eq('due_on', today)
      .is('notified_at', null);

    if (!runs || runs.length === 0) {
      return json({ ok: true, runs: 0, phones: 0, browsers: 0 });
    }

    const customerIds = [
      ...new Set(
        runs
          .map((row) => (row.scheduled_orders as { customer_id?: string } | null)?.customer_id)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const [phones, browsers] = await Promise.all([
      pushToPhones(admin, customerIds).catch(() => 0),
      pushToBrowsers(admin, customerIds).catch(() => 0),
    ]);

    // Marked whatever the channels managed. A customer with no device
    // registered cannot be reached by retrying, and leaving the run unmarked
    // would have every later tick try them again.
    await admin
      .from('scheduled_order_runs')
      .update({ notified_at: new Date().toISOString() })
      .in(
        'id',
        runs.map((row) => row.id)
      );

    return json({ ok: true, runs: runs.length, customers: customerIds.length, phones, browsers });
  } catch (error) {
    console.error('notify-due-schedules failed', error);
    return json({ ok: false, error: 'Could not send reminders.' });
  }
});
