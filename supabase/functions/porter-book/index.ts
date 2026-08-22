import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';
import { PorterQuoteError, quotePorterJob, readLatLng } from '../_shared/porter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Books a porter job.
 *
 * The fare is re-quoted here rather than trusted from the request. The client
 * already has a price on screen, but accepting that number would let anyone
 * name their own fare — and since the driver is paid that amount in cash by the
 * customer, a forged quote is money out of the driver's pocket, not ours.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, body?.token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in to book a Porter trip.' });
    }

    const pickup = readLatLng(body?.pickup);
    const drop = readLatLng(body?.drop);
    if (!pickup || !drop) {
      return json({ ok: false, error: 'Pick both a pickup and a drop point.' });
    }

    const pickupAddress = String(body?.pickupAddress ?? '').trim();
    const dropAddress = String(body?.dropAddress ?? '').trim();
    if (!pickupAddress || !dropAddress) {
      return json({ ok: false, error: 'Both addresses are required.' });
    }

    const { data: customer } = await admin
      .from('customers')
      .select('phone')
      .eq('id', customerId)
      .single();
    if (!customer?.phone) {
      return json({ ok: false, error: 'Could not read your account.' });
    }

    const quote = await quotePorterJob(admin, pickup, drop, body?.vehicleCode);

    const { data: job, error } = await admin
      .from('porter_jobs')
      .insert({
        customer_id: customerId,
        customer_phone: customer.phone,
        pickup_address: pickupAddress,
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        drop_address: dropAddress,
        drop_latitude: drop.latitude,
        drop_longitude: drop.longitude,
        goods_note: String(body?.goodsNote ?? '').trim() || null,
        vehicle_type_code: quote.vehicle.code,
        distance_km: quote.distanceKm,
        base_fare: quote.baseFare,
        distance_fare: quote.distanceFare,
        fare_total: quote.fareTotal,
        commission_percent: quote.commissionPercent,
        commission_amount: quote.commissionAmount,
      })
      .select('id')
      .single();

    if (error || !job) {
      console.error('porter-book insert failed', error);
      return json({ ok: false, error: 'Could not book that trip.' });
    }

    return json({
      ok: true,
      jobId: job.id,
      distanceKm: quote.distanceKm,
      fareTotal: quote.fareTotal,
      vehicleName: quote.vehicle.name,
    });
  } catch (error) {
    if (error instanceof PorterQuoteError) {
      return json({ ok: false, error: error.message });
    }
    console.error('porter-book failed', error);
    return json({ ok: false, error: 'Could not book that trip.' });
  }
});
