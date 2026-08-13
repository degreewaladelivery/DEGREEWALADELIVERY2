import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { Session } from '@supabase/supabase-js';
import { AgentLoginScreen } from './AgentLoginScreen';
import { AgentOrdersScreen } from './AgentOrdersScreen';
import { getAgentSession, supabaseAgent } from '../agent/supabaseAgent';
import { colors } from '../theme';

/**
 * Decides whether a delivery partner sees the sign-in form or their orders.
 *
 * Subscribing to auth changes rather than only reading once means signing in
 * and signing out both land in the right place without either screen having to
 * navigate anywhere.
 */
export function AgentGateScreen() {
  const navigation = useNavigation();
  // undefined = still reading the stored session; null = signed out.
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getAgentSession().then((current) => {
      if (active) setSession(current);
    });

    const { data } = supabaseAgent.auth.onAuthStateChange((_event, next) => {
      if (active) setSession(next);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!session) {
    return (
      <AgentLoginScreen onSignedIn={() => undefined} onBack={() => navigation.goBack()} />
    );
  }

  return <AgentOrdersScreen agentId={session.user.id} onSignedOut={() => undefined} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgSoft },
});
