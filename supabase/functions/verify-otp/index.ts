import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWO_FACTOR_API_KEY = Deno.env.get('TWO_FACTOR_API_KEY') ?? '';
const TWO_FACTOR_BASE = 'https://2factor.in/API/V1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const MAX_ATTEMPTS = 5;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function verifyViaOtpProduct(digits: string, code: string): Promise<boolean> {
  const res = await fetch(`${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/VERIFY3/${digits}/${code}`);
  const data = await res.json();
  return data.Status === 'Success';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone, otp } = await req.json();
    const digits = String(phone ?? '').replace(/\D/g, '');
    const code = String(otp ?? '').replace(/\D/g, '');
    if (digits.length !== 10 || code.length !== 6) {
      return json({ ok: false, error: 'Missing phone or OTP' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: pending } = await admin
      .from('otp_codes')
      .select('id, code_hash, attempts')
      .eq('phone', digits)
      .is('consumed_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pending) {
      if (pending.attempts >= MAX_ATTEMPTS) {
        return json({ ok: false, error: 'Too many incorrect attempts. Please request a new OTP.' });
      }
      if (pending.code_hash !== (await hashCode(code))) {
        await admin
          .from('otp_codes')
          .update({ attempts: pending.attempts + 1 })
          .eq('id', pending.id);
        return json({ ok: false, error: 'Incorrect or expired OTP' });
      }
      await admin
        .from('otp_codes')
        .update({ consumed_at: new Date().toISOString() })
        .eq('id', pending.id);
    } else if (!(await verifyViaOtpProduct(digits, code))) {
      return json({ ok: false, error: 'Incorrect or expired OTP' });
    }

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
