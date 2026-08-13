import 'react-native-url-polyfill/auto';
import { createClient, type Session } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * A second Supabase client, for delivery agents only.
 *
 * The customer client deliberately runs with persistSession off — customers
 * authenticate with our own OTP tokens, not Supabase Auth, so it has no session
 * to keep. Agents *are* Supabase Auth users, and an agent who has to type their
 * password every time they reopen the app during a shift would stop using it.
 *
 * Distinct storageKey so the two clients can never tread on each other.
 */

const SUPABASE_URL = 'https://wadztwgejykpnntcyhfg.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZHp0d2dlanlrcG5udGN5aGZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxNTkwMTAsImV4cCI6MjA5ODczNTAxMH0.zcNGe_pZHZ3mQpWl6PlPemeNHZfexXAOgDW_FhELYME';

export const supabaseAgent = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    storageKey: 'dw_agent_auth',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export interface AgentSignInResult {
  ok: boolean;
  error?: string;
}

export async function signInAgent(email: string, password: string): Promise<AgentSignInResult> {
  const { data, error } = await supabaseAgent.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error || !data.session) {
    return { ok: false, error: error?.message ?? 'Could not sign in' };
  }

  // Signing in proves the password, not that this account is a delivery agent —
  // a customer's email would authenticate fine and then see an empty dashboard
  // with no explanation. Check the role here and say so plainly.
  const { data: profile } = await supabaseAgent
    .from('delivery_agents')
    .select('is_active')
    .eq('user_id', data.session.user.id)
    .maybeSingle();

  if (!profile) {
    await supabaseAgent.auth.signOut();
    return { ok: false, error: 'This account is not registered as a delivery agent.' };
  }
  if (!profile.is_active) {
    await supabaseAgent.auth.signOut();
    return { ok: false, error: 'Your account has been deactivated. Contact the office.' };
  }

  return { ok: true };
}

export async function signOutAgent(): Promise<void> {
  await supabaseAgent.auth.signOut();
}

export async function getAgentSession(): Promise<Session | null> {
  const { data } = await supabaseAgent.auth.getSession();
  return data.session;
}
