import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendPush } from '../_shared/webpush.ts';

/**
 * Rings every delivery agent's registered browser when a new order lands in the
 * pool. Called by place-order, never by a client.
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
    // Not configured yet — say so plainly instead of pretending we notified.
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

    // Only agents who are still active should be woken up.
    const { data: subscriptions, error } = await admin
      .from('agent_push_subscriptions')
      .select('endpoint, user_id, delivery_agents!inner(is_active)')
      .eq('delivery_agents.is_active', true);

    if (error) return json({ ok: false, error: error.message }, 200);
    if (!subscriptions || subscriptions.length === 0) return json({ ok: true, sent: 0 });

    const vapid = {
      publicKey: VAPID_PUBLIC_KEY,
      privateKey: VAPID_PRIVATE_KEY,
      subject: VAPID_SUBJECT,
    };

    const results = await Promise.all(
      subscriptions.map((row) => sendPush({ endpoint: row.endpoint }, vapid))
    );

    // Drop subscriptions the push service has retired, so the table doesn't
    // fill with dead browsers that slow every future send.
    const dead = results.filter((r) => r.gone).map((r) => r.endpoint);
    if (dead.length > 0) {
      await admin.from('agent_push_subscriptions').delete().in('endpoint', dead);
    }

    const sent = results.filter((r) => r.status >= 200 && r.status < 300).length;
    return json({ ok: true, sent, removed: dead.length, tried: results.length });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'failed' }, 200);
  }
});
