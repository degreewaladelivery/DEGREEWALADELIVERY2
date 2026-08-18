/**
 * Tell the customer their order moved.
 *
 * Called after a status change succeeds, never before — a customer told their
 * order was delivered when the update actually failed is worse than a customer
 * told nothing. Failures here are swallowed: the status change is already done,
 * and a push service having a bad day must not surface as a failed delivery.
 */
/* Structural, and loose on purpose: supabase-js types invoke() with its own
   options shape, and a stricter signature here rejects the real client. */
/* eslint-disable @typescript-eslint/no-explicit-any */
interface Functions {
  functions: {
    invoke: (name: string, options: any) => Promise<any>;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function notifyCustomer(client: Functions, orderId: string): Promise<void> {
  try {
    await client.functions.invoke('notify-customer', { body: { orderId } });
  } catch {
    // Deliberately silent.
  }
}
