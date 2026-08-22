import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/session.ts';
import { resolvePickup, routeDistanceKm } from '../_shared/pickup.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * The delivery distance a customer is quoted, measured the same way and by the
 * same code that place-order charges on. Doing it here rather than in the app
 * keeps the two from ever disagreeing, and keeps the routing key server-side —
 * shipped in a web bundle or an APK it is readable by anyone.
 *
 * Only the destination comes from the caller; the pickup point is read from the
 * database, so this can't be turned into a free routing service for arbitrary
 * origins.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const shopId = typeof body?.shopId === 'string' ? body.shopId : null;
    const latitude = Number(body?.latitude);
    const longitude = Number(body?.longitude);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return json({ ok: false, error: 'A delivery latitude and longitude are required.' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const pickup = await resolvePickup(admin, shopId);
    if (!pickup) {
      return json({ ok: false, error: 'No pickup point is configured yet.' });
    }

    const { km, source } = await routeDistanceKm(pickup, latitude, longitude);

    return json({
      ok: true,
      pickup,
      distanceKm: km,
      source,
    });
  } catch (error) {
    console.error('route-distance failed', error);
    return json({ ok: false, error: 'Could not measure the delivery distance.' });
  }
});
