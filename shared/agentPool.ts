/**
 * Keeping every agent's order pool in step, in real time.
 *
 * Polling alone leaves a claimed order sitting on other agents' screens until
 * their next refresh — they tap Accept on a job that is already gone. The
 * database never lets them steal it, but being told "too late" on something you
 * are looking at feels broken.
 *
 * Two channels, because they solve different halves:
 *
 * - New orders arrive as a postgres INSERT. Unclaimed rows are visible to every
 *   agent under RLS, so everyone gets the event.
 * - A claim is an UPDATE that makes the row invisible to everyone else — and
 *   Realtime can't deliver a row the listener is no longer allowed to see. So
 *   the claiming client also broadcasts the id, and peers drop it locally.
 *   Broadcast carries no order data, only an id already on their screen.
 *
 * Polling stays as the backstop: if a socket drops, the pool is still correct
 * within a few seconds.
 */

export const AGENT_POOL_CHANNEL = 'agent-pool';
export const ORDER_CLAIMED_EVENT = 'order-claimed';

/**
 * Minimal shape of the Supabase client bits this needs, so neither platform's
 * client type has to be imported here. `any` rather than `unknown` on the
 * parameters: these are contravariant positions, and `unknown` would reject the
 * real client rather than accept it.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface RealtimeDb {
  channel: (name: string, opts?: any) => any;
  removeChannel: (channel: any) => any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface AgentPoolHandlers {
  /** A new order was placed — refetch the pool. */
  onNewOrder: () => void;
  /** Another agent took this order — drop it from the local list now. */
  onOrderClaimed: (orderId: string) => void;
}

/**
 * Subscribe to pool changes. Returns an unsubscribe function.
 */
export function subscribeToAgentPool(db: RealtimeDb, handlers: AgentPoolHandlers): () => void {
  const channel = db
    .channel(AGENT_POOL_CHANNEL)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'orders' },
      () => handlers.onNewOrder()
    )
    .on('broadcast', { event: ORDER_CLAIMED_EVENT }, (message: { payload?: { orderId?: string } }) => {
      const orderId = message?.payload?.orderId;
      if (orderId) handlers.onOrderClaimed(orderId);
    })
    .subscribe();

  return () => db.removeChannel(channel);
}

/**
 * Tell the other agents an order is taken, so it disappears from their screens
 * straight away. Best effort — the claim itself already succeeded, and their
 * next poll would catch it regardless.
 */
export async function announceClaim(db: RealtimeDb, orderId: string): Promise<void> {
  try {
    const channel = db.channel(AGENT_POOL_CHANNEL);
    await channel.send({
      type: 'broadcast',
      event: ORDER_CLAIMED_EVENT,
      payload: { orderId },
    });
  } catch {
    // Never let a failed announcement surface as a failed claim.
  }
}
