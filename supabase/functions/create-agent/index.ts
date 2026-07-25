import { createClient } from 'jsr:@supabase/supabase-js@2';

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
    const jwt = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!jwt) return json({ ok: false, error: 'Not authenticated' });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: caller, error: callerError } = await admin.auth.getUser(jwt);
    if (callerError || !caller?.user) return json({ ok: false, error: 'Not authenticated' });

    const { data: isAdmin } = await admin.rpc('is_admin', { uid: caller.user.id });
    if (!isAdmin) return json({ ok: false, error: 'Admins only' });

    const { email, password, name, phone } = await req.json();
    const cleanEmail = String(email ?? '').trim().toLowerCase();
    const cleanName = String(name ?? '').trim();
    const cleanPhone = String(phone ?? '').trim();

    if (!cleanEmail || !password || String(password).length < 6 || !cleanName || !cleanPhone) {
      return json({ ok: false, error: 'Enter a valid email, a password of 6+ characters, name, and phone' });
    }

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true,
    });
    if (createError || !created?.user) {
      return json({ ok: false, error: createError?.message ?? 'Could not create agent login' });
    }

    const { error: agentError } = await admin
      .from('delivery_agents')
      .insert({ user_id: created.user.id, name: cleanName, phone: cleanPhone });
    if (agentError) {
      await admin.auth.admin.deleteUser(created.user.id);
      return json({ ok: false, error: 'Could not save agent profile' });
    }

    return json({ ok: true, userId: created.user.id });
  } catch {
    return json({ ok: false, error: 'Something went wrong' });
  }
});
