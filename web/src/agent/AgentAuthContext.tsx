import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AgentAuthState {
  session: Session | null | undefined;
  isAgent: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AgentAuthContext = createContext<AgentAuthState | null>(null);

export function AgentAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [isAgent, setIsAgent] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAgent(nextSession: Session | null) {
      if (!nextSession) {
        if (!cancelled) setIsAgent(false);
        return;
      }
      const { data, error } = await supabase.rpc('am_i_agent');
      if (!cancelled) setIsAgent(!error && data === true);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      checkAgent(data.session);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      checkAgent(nextSession);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // Off duty first, while the session still authorises it. Signing out
    // otherwise left the shift running and the agent marked available.
    await supabase.rpc('set_agent_duty', { p_online: false }).then(
      () => undefined,
      () => undefined
    );
    await supabase.auth.signOut();
  };

  return (
    <AgentAuthContext.Provider value={{ session, isAgent, signIn, signOut }}>
      {children}
    </AgentAuthContext.Provider>
  );
}

export function useAgentAuth() {
  const ctx = useContext(AgentAuthContext);
  if (!ctx) throw new Error('useAgentAuth must be used inside AgentAuthProvider');
  return ctx;
}
