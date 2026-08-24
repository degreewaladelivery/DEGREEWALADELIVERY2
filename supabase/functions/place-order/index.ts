import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';
import { createOrder } from '../_shared/createOrder.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const NOTIFY_AGENTS_SECRET = Deno.env.get('NOTIFY_AGENTS_SECRET') ?? '';

/**
 * Ask notify-agents to push every agent's registered browser. Fails quietly:
 * an order that is already in the database must not be reported as failed
 * because a notification didn't go out.
 */
async function notifyAgents(): Promise<void> {
  if (!NOTIFY_AGENTS_SECRET) return;
  await fetch(`${SUPABASE_URL}/functions/v1/notify-agents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'x-notify-secret': NOTIFY_AGENTS_SECRET,
    },
    body: '{}',
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, body.token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const { data: customer } = await admin
      .from('customers')
      .select('id, phone, name')
      .eq('id', customerId)
      .single();
    if (!customer) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const result = await createOrder(admin, {
      customerId: customer.id,
      customerPhone: customer.phone,
      customerName: customer.name ?? null,
      items: Array.isArray(body.items) ? body.items : [],
      address: String(body.address ?? ''),
      latitude: Number(body.latitude),
      longitude: Number(body.longitude),
      shopId: body.shopId ? String(body.shopId) : null,
    });

    if (!result.ok) return json(result);

    // Wake the agents. Deliberately not awaited and deliberately swallowed: the
    // customer's order is already placed, and a push service having a bad day
    // must never turn a successful order into an error on their screen.
    notifyAgents().catch(() => undefined);

    // Sweep orders abandoned by an agent back into the pool. Also runs on a
    // cron, but doing it here means it still happens if that schedule was never
    // created — and a new order is the moment agents are looking anyway.
    admin.rpc('release_stalled_orders').then(
      () => undefined,
      () => undefined
    );

    return json({
      ok: true,
      orderId: result.orderId,
      total: result.total,
      deliveryFee: result.deliveryFee,
      distanceKm: result.distanceKm,
    });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
