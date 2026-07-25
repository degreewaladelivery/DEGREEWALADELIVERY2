const MSG91_AUTH_KEY = Deno.env.get('MSG91_AUTH_KEY') ?? '';
const MSG91_BASE = 'https://api.msg91.com/api';

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
    const { phone } = await req.json();
    const digits = String(phone ?? '').replace(/\D/g, '');
    if (digits.length !== 10) {
      return json({ ok: false, error: 'Enter a valid 10-digit phone number' });
    }

    const url = `${MSG91_BASE}/sendotp.php?authkey=${MSG91_AUTH_KEY}&mobile=91${digits}&otp_length=6`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.type !== 'success') {
      return json({ ok: false, error: 'Could not send OTP. Please try again.' });
    }

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
