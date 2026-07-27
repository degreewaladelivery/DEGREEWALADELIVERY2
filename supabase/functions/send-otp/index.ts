import { createClient } from 'jsr:@supabase/supabase-js@2';

const TWO_FACTOR_API_KEY = Deno.env.get('TWO_FACTOR_API_KEY') ?? '';
const OTP_TEMPLATE = Deno.env.get('TWO_FACTOR_TEMPLATE') ?? '';
const TSMS_SENDER = Deno.env.get('TWO_FACTOR_TSMS_SENDER') ?? '';
const TSMS_TEMPLATE = Deno.env.get('TWO_FACTOR_TSMS_TEMPLATE') ?? '';
const TWO_FACTOR_BASE = 'https://2factor.in/API/V1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const OTP_TTL_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;

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

function generateCode(): string {
  const [n] = crypto.getRandomValues(new Uint32Array(1));
  return String(n % 1000000).padStart(6, '0');
}

async function sendViaOtpProduct(digits: string) {
  const template = OTP_TEMPLATE ? `/${OTP_TEMPLATE}` : '';
  const res = await fetch(
    `${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/${digits}/AUTOGEN2${template}`
  );
  const data = await res.json();
  return data.Status === 'Success';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { phone } = await req.json();
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length !== 10) {
      return json({ ok: false, error: 'Enter a valid 10-digit phone number' });
    }

    if (!TSMS_SENDER || !TSMS_TEMPLATE) {
      const sent = await sendViaOtpProduct(digits);
      return sent
        ? json({ ok: true })
        : json({ ok: false, error: 'Could not send OTP. Please try again.' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const cooldownSince = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000).toISOString();
    const { data: recent } = await admin
      .from('otp_codes')
      .select('id')
      .eq('phone', digits)
      .gt('created_at', cooldownSince)
      .limit(1);
    if (recent && recent.length > 0) {
      return json({ ok: false, error: 'Please wait a minute before requesting another OTP' });
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000).toISOString();

    const { data: stored, error: storeError } = await admin
      .from('otp_codes')
      .insert({ phone: digits, code_hash: await hashCode(code), expires_at: expiresAt })
      .select('id')
      .single();
    if (storeError || !stored) {
      return json({ ok: false, error: 'Could not send OTP. Please try again.' });
    }

    const res = await fetch(`${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/ADDON_SERVICES/SEND/TSMS`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        From: TSMS_SENDER,
        To: digits,
        TemplateName: TSMS_TEMPLATE,
        VAR1: code,
      }),
    });
    const data = await res.json();

    if (data.Status !== 'Success') {
      await admin.from('otp_codes').delete().eq('id', stored.id);
      return json({ ok: false, error: 'Could not send OTP. Please try again.' });
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
