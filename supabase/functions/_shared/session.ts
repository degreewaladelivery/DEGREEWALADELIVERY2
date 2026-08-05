import type { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

export const SESSION_DAYS = 30;

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return toHex(new Uint8Array(digest));
}

export function generateToken(): string {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function issueSession(
  admin: SupabaseClient,
  customerId: string
): Promise<string | null> {
  const token = generateToken();
  const { error } = await admin.from('customer_sessions').insert({
    customer_id: customerId,
    token_hash: await hashToken(token),
    expires_at: new Date(Date.now() + SESSION_DAYS * 86400000).toISOString(),
  });
  return error ? null : token;
}

export async function resolveSession(
  admin: SupabaseClient,
  token: unknown
): Promise<string | null> {
  const raw = String(token ?? '');
  if (raw.length !== 64) return null;

  const { data } = await admin
    .from('customer_sessions')
    .select('customer_id')
    .eq('token_hash', await hashToken(raw))
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  return data?.customer_id ?? null;
}

export async function revokeSession(admin: SupabaseClient, token: unknown): Promise<void> {
  const raw = String(token ?? '');
  if (raw.length !== 64) return;
  await admin.from('customer_sessions').delete().eq('token_hash', await hashToken(raw));
}
