import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';

/**
 * Stores a customer's browser push subscription.
 *
 * Customers authenticate with our own OTP session tokens rather than Supabase
 * Auth, so there is no auth.uid() for an RLS policy to check. The session is
 * resolved here instead, and the write happens with the service role — which is
 * why the table has no client-facing policies at all.
 */

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const customerId = await resolveSession(admin, body.token);
    if (!customerId) {
      return json({ ok: false, error: 'Please sign in again', signedOut: true });
    }

    const sub = body.subscription;
    const endpoint = String(sub?.endpoint ?? '');
    const p256dh = String(sub?.keys?.p256dh ?? '');
    const auth = String(sub?.keys?.auth ?? '');
    if (!endpoint.startsWith('https://') || !p256dh || !auth) {
      return json({ ok: false, error: 'Invalid subscription' });
    }

    // The endpoint is unique per browser, so re-subscribing updates the row
    // rather than stacking duplicates that would buzz one phone repeatedly.
    const { error } = await admin.from('customer_push_subscriptions').upsert(
      {
        endpoint,
        customer_id: customerId,
        p256dh,
        auth,
        user_agent: String(body.userAgent ?? '').slice(0, 300),
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    );
    if (error) return json({ ok: false, error: 'Could not save subscription' });

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
