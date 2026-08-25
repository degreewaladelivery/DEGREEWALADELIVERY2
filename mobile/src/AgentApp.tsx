import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabaseAgent } from './agent/supabaseAgent';
import { AgentLoginScreen } from './screens/AgentLoginScreen';
import { AgentOrdersScreen } from './screens/AgentOrdersScreen';
import { colors } from './theme';

/**
 * The whole delivery partner app.
 *
 * No navigator: an agent signs in and works one screen. There is nowhere else
 * to go, and adding a stack would only give them a back button to nowhere.
 */
export function AgentApp() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabaseAgent.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabaseAgent.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  if (!session) {
    // No back button: this is the front door, not a screen reached from
    // somewhere else.
    return <AgentLoginScreen onSignedIn={() => undefined} />;
  }

  return <AgentOrdersScreen agentId={session.user.id} onSignedOut={() => undefined} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
});
