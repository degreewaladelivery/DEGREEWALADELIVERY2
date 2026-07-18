const TWO_FACTOR_API_KEY = Deno.env.get('TWO_FACTOR_API_KEY') ?? '';
const TWO_FACTOR_BASE = 'https://2factor.in/API/V1';

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

    const res = await fetch(`${TWO_FACTOR_BASE}/${TWO_FACTOR_API_KEY}/SMS/${digits}/AUTOGEN2`);
    const data = await res.json();

    if (data.Status !== 'Success') {
      return json({ ok: false, error: 'Could not send OTP. Please try again.' });
    }

    return json({ ok: true, sessionId: data.Details });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
