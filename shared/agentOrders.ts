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
  /** Snapshotted at order time. Null on orders placed before we captured it. */
  image_url?: string | null;
}

export type OrderStatus =
  | 'placed'
  | 'claimed'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed';

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
  cash_collected_at: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile {
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  /** Off duty agents keep their account but stop being sent new orders. */
  is_online: boolean;
  vehicle_number: string | null;
  photo_url: string | null;
  licence_number: string | null;
  /** Set once the office has checked the documents. */
  kyc_verified_at: string | null;
  emergency_contact: string | null;
}

/** The slice of supabase-js these queries need, so neither platform's client
 *  type has to be imported here. */
interface Db {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
  rpc: (fn: string, args?: Record<string, unknown>) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
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
    .not('status', 'in', '(delivered,failed,cancelled)')
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
    .update({
      claimed_by: agentId,
      claimed_at: new Date().toISOString(),
      status: 'claimed',
      // Wipe any position left by a previous agent. Without this, an order that
      // changes hands shows the new agent's name against the old agent's pin —
      // the customer watches a stranger's stale location and believes it's
      // their delivery.
      agent_latitude: null,
      agent_longitude: null,
      agent_location_at: null,
    })
    .eq('id', orderId)
    .is('claimed_by', null)
    .select('id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * How long an agent's reported position stays believable.
 *
 * Agents report every 15s while carrying an order. Anything older than this
 * means the app was closed or signal dropped, and drawing that pin would tell
 * the customer their agent is parked somewhere they left long ago.
 */
export const AGENT_LOCATION_FRESH_MS = 10 * 60 * 1000;

export function isAgentLocationFresh(locationAt: string | null | undefined): boolean {
  if (!locationAt) return false;
  const age = Date.now() - new Date(locationAt).getTime();
  return age >= 0 && age < AGENT_LOCATION_FRESH_MS;
}

/** Orders still in flight — anything the customer is waiting on. */
export function isActiveOrder(order: { status: string }): boolean {
  // 'failed' belongs here too: a delivery nobody could complete is finished,
  // and leaving it "active" would keep a tracking bar on the customer's screen
  // for an order that is never arriving.
  return (
    order.status !== 'delivered' &&
    order.status !== 'cancelled' &&
    order.status !== 'failed'
  );
}

const STATUS_LABELS: Record<string, string> = {
  placed: 'Waiting for an agent',
  claimed: 'Agent assigned',
  picked_up: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  failed: 'Could not be delivered',
};

/** Never guess from a boolean — an unfinished order must not read "Delivered"
 *  or "Cancelled" just because it isn't the one being tracked. */
export function orderStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
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

/**
 * Closes a delivery.
 *
 * `cashCollected` is recorded at the same moment rather than later: the agent is
 * standing at the door with the money, and asking them to remember afterwards
 * is how a cash ledger stops matching reality.
 *
 * The database refuses this unless verifyDeliveryOtp has already succeeded for
 * the order, so a failure here means the code was never entered.
 */
export async function markDelivered(
  db: Db,
  orderId: string,
  cashCollected: boolean
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
      cash_collected_at: cashCollected ? new Date().toISOString() : null,
    })
    .eq('id', orderId);
  if (error) throw error;
}

/** True when the code matched. The code itself is never sent to the agent. */
export async function verifyDeliveryOtp(
  db: Db,
  orderId: string,
  otp: string
): Promise<boolean> {
  const { data, error } = await db.rpc('verify_delivery_otp', {
    p_order_id: orderId,
    p_otp: otp,
  });
  if (error) throw error;
  return data === true;
}

/**
 * Records a delivery that could not be completed.
 *
 * The reason is required — "failed" with no explanation leaves the office
 * ringing the agent to ask, which is the call this is meant to save.
 */
export async function reportFailedDelivery(
  db: Db,
  orderId: string,
  reason: string
): Promise<void> {
  const { error } = await db
    .from('orders')
    .update({ status: 'failed', failure_reason: reason })
    .eq('id', orderId);
  if (error) throw error;
}

/**
 * Go on or off duty. Off duty agents are not pushed new orders.
 *
 * Goes through a function rather than updating the row directly so the shift
 * record moves with it — an app that crashed between two separate calls would
 * leave an agent available with no shift open, or a shift running for someone
 * who has gone home.
 */
export async function setAgentOnline(db: Db, online: boolean): Promise<void> {
  const { error } = await db.rpc('set_agent_duty', { p_online: online });
  if (error) throw error;
}

/** Minutes on duty today, including a shift still running. */
export async function getTodayMinutes(db: Db): Promise<number> {
  const { data, error } = await db.rpc('agent_today_minutes');
  if (error) throw error;
  return Number(data) || 0;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

export interface EarningsSummary {
  today: number;
  week: number;
  total: number;
  deliveredToday: number;
  deliveredTotal: number;
  /** Cash taken at the door and not yet handed to the office. */
  cashInHand: number;
}

/**
 * What an agent has earned and what they are holding.
 *
 * Computed from delivered orders rather than a running total, so a corrected
 * order can never leave the figure stale — and an agent who cannot see what
 * they have earned stops trusting the platform.
 */
export async function getEarnings(db: Db, agentId: string): Promise<EarningsSummary> {
  const { data, error } = await db
    .from('orders')
    .select('agent_payout, total, payment_method, delivered_at, cash_collected_at')
    .eq('claimed_by', agentId)
    .eq('status', 'delivered');
  if (error) throw error;

  const rows = (data ?? []) as {
    agent_payout: number;
    total: number;
    payment_method: string;
    delivered_at: string | null;
    cash_collected_at: string | null;
  }[];

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - 6);

  let today = 0;
  let week = 0;
  let total = 0;
  let deliveredToday = 0;
  let cashInHand = 0;

  for (const row of rows) {
    const payout = Number(row.agent_payout) || 0;
    total += payout;
    if (row.payment_method === 'cod' && row.cash_collected_at) {
      cashInHand += Number(row.total) || 0;
    }
    const at = row.delivered_at ? new Date(row.delivered_at) : null;
    if (!at) continue;
    if (at >= startOfWeek) week += payout;
    if (at >= startOfToday) {
      today += payout;
      deliveredToday += 1;
    }
  }

  const { data: settled } = await db
    .from('agent_cash_settlements')
    .select('amount')
    .eq('agent_id', agentId);
  for (const row of (settled ?? []) as { amount: number }[]) {
    cashInHand -= Number(row.amount) || 0;
  }

  return {
    today,
    week,
    total,
    deliveredToday,
    deliveredTotal: rows.length,
    cashInHand,
  };
}

/** Past deliveries, newest first. */
export async function listDeliveryHistory(
  db: Db,
  agentId: string,
  limit = 50
): Promise<OrderRow[]> {
  const { data, error } = await db
    .from('orders')
    .select('*')
    .eq('claimed_by', agentId)
    .in('status', ['delivered', 'failed'])
    .order('delivered_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return data as OrderRow[];
}
