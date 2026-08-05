import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, json, revokeSession } from '../_shared/session.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token } = await req.json();
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    await revokeSession(admin, token);
    return json({ ok: true });
  } catch {
    return json({ ok: true });
  }
});
