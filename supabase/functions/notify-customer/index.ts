import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPush } from '../_shared/webpush.ts';
import { describeStatusChange } from '../../../shared/orderAlerts.ts';

/**
 * Pushes an order update to the customer's registered browsers.
 *
 * Called by the agent app when it advances an order, and by the admin panel
 * when a stuck order is resolved. The caller's own JWT is checked and they must
 * actually be connected to that order — otherwise anyone signed in could buzz
 * any customer's phone by guessing order ids.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@degreewala.in';

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

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return json({ ok: false, error: 'Push is not configured' });
  }

  try {
    const { orderId } = await req.json();
    if (!orderId) return json({ ok: false, error: 'Missing orderId' });

    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: caller } = await admin.auth.getUser(jwt);
    if (!caller?.user) return json({ ok: false, error: 'Not authorised' }, 401);

    const { data: order } = await admin
      .from('orders')
      .select('customer_id, claimed_by, status')
      .eq('id', orderId)
      .maybeSingle();
    if (!order) return json({ ok: false, error: 'No such order' });

    // Either the agent carrying this order, or an admin sorting it out.
    const { data: isAdmin } = await admin.rpc('is_admin', { uid: caller.user.id });
    if (!isAdmin && order.claimed_by !== caller.user.id) {
      return json({ ok: false, error: 'Not authorised' }, 403);
    }

    const { data: subscriptions } = await admin
      .from('customer_push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('customer_id', order.customer_id);

    if (!subscriptions || subscriptions.length === 0) return json({ ok: true, sent: 0 });

    const vapid = {
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
      subject: VAPID_SUBJECT,
    };

    // The exact same wording the in-app alerts use, so a customer who sees both
    // isn't told two different things.
    const change = describeStatusChange(orderId, order.status);
    const payload = change ? JSON.stringify({ title: change.title, body: change.body }) : undefined;

    const results = await Promise.all(
      subscriptions.map((row) =>
        sendPush(
          {
            endpoint: row.endpoint as string,
            keys: { p256dh: row.p256dh as string, auth: row.auth as string },
          },
          vapid,
          900,
          payload
        )
      )
    );

    // Clear out browsers the push service has retired.
    const dead = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (dead.length > 0) {
      await admin.from('customer_push_subscriptions').delete().in('endpoint', dead);
    }

    return json({
      ok: true,
      sent: results.filter((r) => r.status >= 200 && r.status < 300).length,
      removed: dead.length,
    });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'failed' });
  }
});
