import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_NAME_LENGTH = 60;

/**
 * Reads and updates the signed-in customer's profile.
 *
 * Customers authenticate with our own session tokens rather than Supabase auth,
 * so RLS can't see them and every read has to come through here on the service
 * role. The session decides whose row is touched — the client never names a
 * customer id, so a stolen id is worth nothing without the token.
 *
 * The phone number is deliberately not editable. It is the login identity, and
 * changing it here would either hand someone another person's account or leave
 * this one unreachable by OTP.
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
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    if (body?.action === 'update') {
      const raw = String(body?.name ?? '').trim().replace(/\s+/g, ' ');
      if (raw.length > MAX_NAME_LENGTH) {
        return json({ ok: false, error: `Please keep your name under ${MAX_NAME_LENGTH} characters.` });
      }
      // Clearing the field is allowed — someone who filled it in by mistake
      // should be able to take it back out.
      const { error } = await admin
        .from('customers')
        .update({ name: raw || null })
        .eq('id', customerId);
      if (error) {
        console.error('customer-profile update failed', error);
        return json({ ok: false, error: 'Could not save your details.' });
      }
    }

    const { data: customer } = await admin
      .from('customers')
      .select('id, name, phone, created_at')
      .eq('id', customerId)
      .single();

    if (!customer) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const { count } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    return json({
      ok: true,
      profile: {
        name: customer.name ?? '',
        phone: customer.phone,
        memberSince: customer.created_at,
        orderCount: count ?? 0,
      },
    });
  } catch (error) {
    console.error('customer-profile failed', error);
    return json({ ok: false, error: 'Could not load your profile.' });
  }
});
