import { createClient } from 'jsr:@supabase/supabase-js@2';

const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY') ?? '';
const MSG91_BASE = 'https://api.msg91.com/api';
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
    const { phone, otp } = await req.json();
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length !== 10 || !otp) {
      return json({ ok: false, error: 'Missing phone or OTP' });
    }

    const url = `${MSG91_BASE}/verifyRequestOTP.php?authkey=${MSG91_AUTH_KEY}&mobile=91${digits}&otp=${otp}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.type !== 'success') {
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
