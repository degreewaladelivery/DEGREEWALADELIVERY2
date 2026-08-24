import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const ORDER_FIELDS = [
  'id',
  'status',
  'pickup_label',
  'pickup_latitude',
  'pickup_longitude',
  'delivery_address',
  'delivery_latitude',
  'delivery_longitude',
  'agent_latitude',
  'agent_longitude',
  'agent_location_at',
  'distance_km',
  'items',
  'subtotal',
  'delivery_fee',
  'taxes',
  'total',
  'payment_method',
  'claimed_by',
  'stalled_at',
  'cancel_reason',
  'created_at',
  'claimed_at',
  'picked_up_at',
  'delivered_at',
].join(',');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const { data: orders, error } = await admin
      .from('orders')
      .select(ORDER_FIELDS)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return json({ ok: false, error: 'Could not load your orders' });
    }

    const agentIds = [
      ...new Set((orders ?? []).map((order) => order.claimed_by).filter(Boolean)),
    ] as string[];

    const agents = new Map<
      string,
      { name: string; phone: string; vehicle_number: string | null; photo_url: string | null }
    >();
    if (agentIds.length > 0) {
      const { data: agentRows } = await admin
        .from('delivery_agents')
        .select('user_id, name, phone, vehicle_number, photo_url')
        .in('user_id', agentIds);
      for (const agent of agentRows ?? []) {
        agents.set(agent.user_id, {
          name: agent.name,
          phone: agent.phone,
          vehicle_number: agent.vehicle_number ?? null,
          photo_url: agent.photo_url ?? null,
        });
      }
    }

    const withAgents = (orders ?? []).map((order) => {
      const { claimed_by, ...rest } = order;
      return { ...rest, agent: claimed_by ? agents.get(claimed_by) ?? null : null };
    });

    return json({ ok: true, orders: withAgents, serverTime: new Date().toISOString() });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
