import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/session.ts';
import { PorterQuoteError, quotePorterJob, readLatLng } from '../_shared/porter.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Prices a porter job before anyone commits to it.
 *
 * Open to signed-out callers on purpose — a customer deciding whether to move a
 * sofa should see the price before being asked to log in. What it never returns
 * is the commission: that is between DegreeWala and the driver, and showing a
 * customer that a slice of their payment is skimmed invites them to book the
 * driver off-platform next time.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const pickup = readLatLng(body?.pickup);
    const drop = readLatLng(body?.drop);
    if (!pickup || !drop) {
      return json({ ok: false, error: 'Pick both a pickup and a drop point.' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const quote = await quotePorterJob(admin, pickup, drop, body?.vehicleCode);

    return json({
      ok: true,
      vehicleCode: quote.vehicle.code,
      vehicleName: quote.vehicle.name,
      distanceKm: quote.distanceKm,
      baseFare: quote.baseFare,
      distanceFare: quote.distanceFare,
      fareTotal: quote.fareTotal,
    });
  } catch (error) {
    if (error instanceof PorterQuoteError) {
      return json({ ok: false, error: error.message });
    }
    console.error('porter-quote failed', error);
    return json({ ok: false, error: 'Could not price that trip.' });
  }
});
