import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, resolveSession } from '../_shared/session.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

/**
 * Registers (or drops) a customer's phone for push.
 *
 * Has to run server-side: a customer's identity lives in our own session token,
 * which RLS cannot read, so the client cannot be trusted to say which customer a
 * device belongs to. The session decides — passing someone else's id is not
 * possible because no id is passed.
 *
 * Tokens are keyed per device, not per customer: someone with a phone and a
 * tablet should get the reminder on both.
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

    const deviceToken = String(body?.deviceToken ?? '').trim();
    if (!deviceToken) {
      return json({ ok: false, error: 'No device token supplied.' });
    }

    if (body?.action === 'remove') {
      // Scoped to the caller, so signing out cannot unregister someone else's
      // device even if their token were known.
      await admin
        .from('customer_device_tokens')
        .delete()
        .eq('token', deviceToken)
        .eq('customer_id', customerId);
      return json({ ok: true });
    }

    const platform = body?.platform === 'ios' ? 'ios' : 'android';

    // Upsert on the token: the same device signing in as a different customer
    // must move the token across rather than leave the old customer receiving
    // reminders on a phone that is no longer theirs.
    const { error } = await admin.from('customer_device_tokens').upsert(
      {
        token: deviceToken,
        customer_id: customerId,
        platform,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );

    if (error) {
      console.error('save-device-token failed', error);
      return json({ ok: false, error: 'Could not register this device.' });
    }

    return json({ ok: true });
  } catch (error) {
    console.error('save-device-token failed', error);
    return json({ ok: false, error: 'Could not register this device.' });
  }
});
