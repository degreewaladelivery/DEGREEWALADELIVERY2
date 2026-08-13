import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPush } from '../_shared/webpush.ts';
import { getAccessToken, sendFcm, type ServiceAccount } from '../_shared/fcm.ts';

/**
 * Rings every delivery agent's registered browser when a new order lands in the
 * pool. Called by place-order, never by a client.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@degreewala.in';
const FCM_SERVICE_ACCOUNT = Deno.env.get('FCM_SERVICE_ACCOUNT') ?? '';

const TITLE = 'New delivery available';
const BODY = 'Tap to accept it before another agent does.';

/** Ring every registered browser. Returns how many got through. */
async function pushToBrowsers(
  admin: ReturnType<typeof createClient>
): Promise<{ sent: number; removed: number; tried: number }> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return { sent: 0, removed: 0, tried: 0 };

  // Only agents who are still active should be woken up.
  const { data: subscriptions } = await admin
    .from('agent_push_subscriptions')
    .select('endpoint, delivery_agents!inner(is_active)')
    .eq('delivery_agents.is_active', true);

  if (!subscriptions || subscriptions.length === 0) return { sent: 0, removed: 0, tried: 0 };

  const vapid = {
    publicKey: VAPID_PUBLIC_KEY,
    privateKey: VAPID_PRIVATE_KEY,
    subject: VAPID_SUBJECT,
  };

  const results = await Promise.all(
    subscriptions.map((row) => sendPush({ endpoint: row.endpoint as string }, vapid))
  );

  // Drop subscriptions the push service has retired, so the table doesn't fill
  // with dead browsers that slow every future send.
  const dead = results.filter((r) => r.gone).map((r) => r.endpoint);
  if (dead.length > 0) {
    await admin.from('agent_push_subscriptions').delete().in('endpoint', dead);
  }

  return {
    sent: results.filter((r) => r.status >= 200 && r.status < 300).length,
    removed: dead.length,
    tried: results.length,
  };
}

/** Ring every registered phone. Returns how many got through. */
async function pushToPhones(
  admin: ReturnType<typeof createClient>
): Promise<{ sent: number; removed: number; tried: number }> {
  if (!FCM_SERVICE_ACCOUNT) return { sent: 0, removed: 0, tried: 0 };

  let account: ServiceAccount;
  try {
    account = JSON.parse(FCM_SERVICE_ACCOUNT);
  } catch {
    return { sent: 0, removed: 0, tried: 0 };
  }

  const { data: devices } = await admin
    .from('agent_device_tokens')
    .select('token, delivery_agents!inner(is_active)')
    .eq('delivery_agents.is_active', true);

  if (!devices || devices.length === 0) return { sent: 0, removed: 0, tried: 0 };

  const accessToken = await getAccessToken(account);
  const results = await Promise.all(
    devices.map((row) => sendFcm(account, accessToken, row.token as string, TITLE, BODY))
  );

  const dead = results.filter((r) => r.gone).map((r) => r.token);
  if (dead.length > 0) {
    await admin.from('agent_device_tokens').delete().in('token', dead);
  }

  return {
    sent: results.filter((r) => r.ok).length,
    removed: dead.length,
    tried: results.length,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  if (!VAPID_PUBLIC_KEY && !FCM_SERVICE_ACCOUNT) {
    // Neither channel configured — say so plainly rather than pretending we
    // notified anyone.
    return json({ ok: false, error: 'Push is not configured' }, 200);
  }

  try {
    // Only trusted server-side callers may ring every agent at once.
    const secret = req.headers.get('x-notify-secret') ?? '';
    const expected = Deno.env.get('NOTIFY_AGENTS_SECRET') ?? '';
    if (!expected || secret !== expected) {
      return json({ ok: false, error: 'Not authorised' }, 401);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Both channels always run: an agent may have the dashboard open on a
    // laptop and the app on their phone, and either could be the one they see.
    // Settled rather than awaited in sequence so a failure in one — or an
    // unconfigured channel — can't stop the other.
    const [web, phones] = await Promise.allSettled([
      pushToBrowsers(admin),
      pushToPhones(admin),
    ]);

    const webResult = web.status === 'fulfilled' ? web.value : { sent: 0, removed: 0, tried: 0 };
    const phoneResult =
      phones.status === 'fulfilled' ? phones.value : { sent: 0, removed: 0, tried: 0 };

    return json({
      ok: true,
      sent: webResult.sent + phoneResult.sent,
      web: webResult,
      phones: phoneResult,
      // With nobody registered yet, "sent 0" looks the same whether a channel
      // is switched off or simply has no devices. Say which it is, so a silent
      // channel can be diagnosed without reading the deploy config.
      configured: {
        web: Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY),
        phones: Boolean(FCM_SERVICE_ACCOUNT),
      },
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'failed' }, 200);
  }
});
