/**
 * Delivery agent order operations, shared by the web dashboard and the mobile
 * app.
 *
 * Takes the Supabase client rather than importing one, because each platform
 * builds its own (different storage, different auth persistence). Keeping the
 * queries in one place means the two surfaces can't drift into disagreeing
 * about what "my deliveries" means — the same drift that once had the cart and
 * checkout showing different delivery fees.
 */

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string | null;
}

export type OrderStatus = 'placed' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';

export interface OrderRow {
  id: string;
  customer_phone: string;
  pickup_label: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_km: number | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  taxes: number;
  total: number;
  agent_payout: number;
  payment_method: string;
  status: OrderStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile {
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
}

/** The slice of supabase-js these queries need, so neither platform's client
 *  type has to be imported here. */
interface Db {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export async function getMyProfile(db: Db): Promise<AgentProfile> {
  const { data, error } = await db.from('delivery_agents').select('*').single();
  if (error) throw error;
  return data;
}

/**
 * The unclaimed pool, newest first — a new order lands at the top where an
 * agent is looking, instead of below everything already sitting there.
 *
 * Claimed orders are excluded here, and the RLS policy on `orders` enforces the
 * same rule, so one agent can't see another's job even if this filter were
 * wrong.
 */
export async function listOpenOrders(db: Db): Promise<OrderRow[]> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .is('claimed_by', null)
    .eq('status', 'placed')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as OrderRow[];
}

export async function listMyDeliveries(db: Db, agentId: string): Promise<OrderRow[]> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('claimed_by', agentId)
    .neq('status', 'delivered')
    .order('claimed_at', { ascending: true });
  if (error) throw error;
  return data as OrderRow[];
}

/**
 * Returns false when another agent got there first — the `is('claimed_by', null)`
 * guard means the loser's update matches no rows rather than stealing the job.
 */
export async function claimOrder(db: Db, orderId: string, agentId: string): Promise<boolean> {
  const { data, error } = await db
    .from('orders')
    .update({ claimed_by: agentId, claimed_at: new Date().toISOString(), status: 'claimed' })
    .eq('id', orderId)
    .is('claimed_by', null)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function updateAgentLocation(
  db: Db,
  orderIds: string[],
  latitude: number,
  longitude: number
): Promise<void> {
  if (orderIds.length === 0) return;
  const { error } = await db
    .from('orders')
    .update({
      agent_latitude: latitude,
      agent_longitude: longitude,
      agent_location_at: new Date().toISOString(),
    })
    .in('id', orderIds);
  if (error) throw error;
}

export async function markPickedUp(db: Db, orderId: string): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({ status: 'picked_up', picked_up_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export async function markDelivered(db: Db, orderId: string): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}
