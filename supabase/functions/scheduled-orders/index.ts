import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';
import { createOrder } from '../_shared/createOrder.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const NOTIFY_AGENTS_SECRET = Deno.env.get('NOTIFY_AGENTS_SECRET') ?? '';

const MAX_OCCURRENCES = 24;

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

/** Everything the customer's own screens need about their schedules. */
async function listForCustomer(admin: SupabaseClient, customerId: string) {
  // Opening due runs here as well as on the cron means a customer who opens the
  // app on the day sees the reminder even if the schedule never ran — the same
  // belt-and-braces place-order uses for releasing stalled orders.
  await admin.rpc('open_due_scheduled_orders').then(
    () => undefined,
    () => undefined
  );

  const { data: schedules } = await admin
    .from('scheduled_orders')
    .select(
      'id, items, shop_id, delivery_address, day_of_month, occurrences_total, occurrences_done, next_run_on, status, created_at'
    )
    .eq('customer_id', customerId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false });

  const ids = (schedules ?? []).map((s) => s.id);
  const { data: runs } = ids.length
    ? await admin
        .from('scheduled_order_runs')
        .select('id, scheduled_order_id, due_on, status, order_id')
        .in('scheduled_order_id', ids)
        .eq('status', 'awaiting')
    : { data: [] };

  return {
    schedules: schedules ?? [],
    awaiting: runs ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, body?.token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const action = String(body?.action ?? 'list');

    // ---------------------------------------------------------------- create --
    if (action === 'create') {
      const items = Array.isArray(body.items) ? body.items : [];
      if (items.length === 0) {
        return json({ ok: false, error: 'Nothing to repeat.' });
      }

      const dayOfMonth = Math.floor(Number(body.dayOfMonth));
      if (!Number.isFinite(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
        return json({ ok: false, error: 'Pick a day of the month between 1 and 31.' });
      }

      const occurrences = Math.floor(Number(body.occurrences));
      if (!Number.isFinite(occurrences) || occurrences < 1 || occurrences > MAX_OCCURRENCES) {
        return json({
          ok: false,
          error: `Choose between 1 and ${MAX_OCCURRENCES} deliveries.`,
        });
      }

      const address = String(body.address ?? '').trim();
      const latitude = Number(body.latitude);
      const longitude = Number(body.longitude);
      if (address.length < 6 || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return json({ ok: false, error: 'A delivery address is required.' });
      }

      // Only what is needed to rebuild the basket later. Prices are deliberately
      // not stored — they are read from the catalogue when each run is
      // confirmed, because a price cannot be held for months.
      const basket = items
        .map((entry: { id?: unknown; quantity?: unknown; name?: unknown }) => ({
          id: String(entry?.id ?? ''),
          quantity: Math.max(1, Math.floor(Number(entry?.quantity)) || 1),
          name: String(entry?.name ?? ''),
        }))
        .filter((entry: { id: string }) => entry.id);

      if (basket.length === 0) {
        return json({ ok: false, error: 'Nothing to repeat.' });
      }

      // The first run is the next occurrence of that day that has not passed —
      // setting up a repeat on the 20th for "the 5th" should mean next month,
      // not a delivery that was already due a fortnight ago.
      const { data: firstRun } = await admin.rpc('scheduled_order_next_date', {
        from_date: new Date().toISOString().slice(0, 10),
        day: dayOfMonth,
      });
      let nextRunOn = firstRun as string | null;
      if (!nextRunOn || nextRunOn <= new Date().toISOString().slice(0, 10)) {
        const nextMonth = new Date();
        nextMonth.setUTCDate(1);
        nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
        const { data: bumped } = await admin.rpc('scheduled_order_next_date', {
          from_date: nextMonth.toISOString().slice(0, 10),
          day: dayOfMonth,
        });
        nextRunOn = bumped as string | null;
      }

      const { data: created, error } = await admin
        .from('scheduled_orders')
        .insert({
          customer_id: customerId,
          items: basket,
          shop_id: body.shopId ? String(body.shopId) : null,
          delivery_address: address,
          delivery_latitude: latitude,
          delivery_longitude: longitude,
          day_of_month: dayOfMonth,
          occurrences_total: occurrences,
          next_run_on: nextRunOn,
        })
        .select('id, next_run_on')
        .single();

      if (error || !created) {
        console.error('scheduled-orders create failed', error);
        return json({ ok: false, error: 'Could not set up that repeat.' });
      }

      return json({ ok: true, scheduleId: created.id, nextRunOn: created.next_run_on });
    }

    // ---------------------------------------------------------------- cancel --
    if (action === 'cancel') {
      const scheduleId = String(body.scheduleId ?? '');
      if (!scheduleId) return json({ ok: false, error: 'Which repeat?' });

      // Scoped to the caller, so an id alone is not enough to cancel someone
      // else's standing order.
      const { error } = await admin
        .from('scheduled_orders')
        .update({ status: 'cancelled' })
        .eq('id', scheduleId)
        .eq('customer_id', customerId);
      if (error) {
        return json({ ok: false, error: 'Could not cancel that repeat.' });
      }
      await admin
        .from('scheduled_order_runs')
        .update({ status: 'skipped', resolved_at: new Date().toISOString() })
        .eq('scheduled_order_id', scheduleId)
        .eq('status', 'awaiting');

      return json({ ok: true, ...(await listForCustomer(admin, customerId)) });
    }

    // --------------------------------------------------------------- confirm --
    if (action === 'confirm') {
      const runId = String(body.runId ?? '');
      if (!runId) return json({ ok: false, error: 'Which delivery?' });

      const { data: run } = await admin
        .from('scheduled_order_runs')
        .select('id, status, scheduled_order_id')
        .eq('id', runId)
        .maybeSingle();
      if (!run || run.status !== 'awaiting') {
        return json({ ok: false, error: 'That delivery is no longer waiting for confirmation.' });
      }

      const { data: schedule } = await admin
        .from('scheduled_orders')
        .select(
          'id, customer_id, items, shop_id, delivery_address, delivery_latitude, delivery_longitude'
        )
        .eq('id', run.scheduled_order_id)
        .eq('customer_id', customerId)
        .maybeSingle();
      if (!schedule) {
        return json({ ok: false, error: 'That repeat could not be found.' });
      }

      const { data: customer } = await admin
        .from('customers')
        .select('id, phone, name')
        .eq('id', customerId)
        .single();
      if (!customer) {
        return json({ ok: false, error: 'Please sign in again', signedOut: true });
      }

      // Priced now, not when the schedule was created — same code path as a
      // normal checkout, so the two can never disagree.
      const result = await createOrder(admin, {
        customerId: customer.id,
        customerPhone: customer.phone,
        customerName: customer.name ?? null,
        items: (schedule.items as { id: string; quantity: number }[]) ?? [],
        address: schedule.delivery_address,
        latitude: schedule.delivery_latitude,
        longitude: schedule.delivery_longitude,
        shopId: schedule.shop_id,
      });

      if (!result.ok) {
        // The run stays awaiting: the customer can fix the problem — an item
        // withdrawn since, say — and confirm again before the day is out.
        return json(result);
      }

      await admin
        .from('scheduled_order_runs')
        .update({
          status: 'confirmed',
          order_id: result.orderId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', runId);

      // The count is not touched here. A schedule counts dates, not deliveries,
      // and open_due_scheduled_orders already counted this one when it opened
      // the run — otherwise a skipped month would be repaid with an extra one
      // and a customer who never answered would be asked forever.

      notifyAgents().catch(() => undefined);
      admin.rpc('release_stalled_orders').then(
        () => undefined,
        () => undefined
      );

      return json({
        ok: true,
        orderId: result.orderId,
        total: result.total,
        deliveryFee: result.deliveryFee,
      });
    }

    // ------------------------------------------------------------------ list --
    return json({ ok: true, ...(await listForCustomer(admin, customerId)) });
  } catch (error) {
    console.error('scheduled-orders failed', error);
    return json({ ok: false, error: 'Something went wrong.' });
  }
});
