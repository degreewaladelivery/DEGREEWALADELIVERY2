import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useTabBarSpace } from '../lib/tabBarSpace';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInAgent } from '../agent/supabaseAgent';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

export function AgentLoginScreen({ onSignedIn, onBack }: { onSignedIn: () => void; onBack: () => void }) {
  const tabBarSpace = useTabBarSpace();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 3 && password.length >= 6 && !busy;

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    const result = await signInAgent(email, password);
    setBusy(false);
    if (result.ok) onSignedIn();
    else setError(result.error ?? 'Could not sign in');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={onBack} hitSlop={10}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.card}>
            <Text style={styles.emoji}>🛵</Text>
            <Text style={styles.title}>Delivery Partner</Text>
            <Text style={styles.sub}>Sign in with the details the office gave you.</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="you@degreewala.in"
              placeholderTextColor={colors.textFaint}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••"
              placeholderTextColor={colors.textFaint}
            />

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.btn, !canSubmit && styles.btnDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
              activeOpacity={0.9}
            >
              <Text style={styles.btnText}>{busy ? 'Signing in…' : 'Sign in'}</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Forgot your password? The office has to reset it for you.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 80 },
  back: { color: colors.textMuted, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm },

  card: {
    marginTop: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  emoji: { fontSize: 40, textAlign: 'center' },
  title: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heading,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  sub: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },

  label: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.bold,
    color: colors.textMuted,
    marginBottom: 4,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
    backgroundColor: '#fff',
  },

  error: {
    marginTop: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.md,
    lineHeight: 20,
  },

  btn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    borderRadius: radius.lg,
    paddingVertical: spacing.md + 2,
    alignItems: 'center',
    ...shadows.brand,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  hint: {
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});
