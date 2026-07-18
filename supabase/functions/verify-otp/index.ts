import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWO_FACTOR_API_KEY = Deno.env.get('TWO_FACTOR_API_KEY') ?? '';
const TWO_FACTOR_BASE = 'https://2factor.in/API/V1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, sessionId, otp } = await req.json();
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length !== 10 || !sessionId || !otp) {
      return json({ ok: false, error: 'Missing phone, session, or OTP' });
    }

    const res = await fetch(`${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/VERIFY/${sessionId}/${otp}`);
    const data = await res.json();

    if (data.Status !== 'Success') {
      return json({ ok: false, error: 'Incorrect or expired OTP' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { data: customer, error } = await admin
      .from('customers')
      .upsert({ phone: digits }, { onConflict: 'phone' })
      .select('id, phone')
      .single();

    if (error || !customer) {
      return json({ ok: false, error: 'Could not create your account' });
    }

    return json({ ok: true, customerId: customer.id, phone: customer.phone });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
