import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

export function LoginScreen() {
  const navigation = useNavigation();
  const [phone, setPhone] = useState('');

  const valid = phone.replace(/\D/g, '').length === 10;

  const onSubmit = () => {
    if (valid) navigation.getParent()?.navigate('Home' as never);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.mark}>🛵</Text>
          <Text style={styles.title}>
            Welcome to Degree<Text style={styles.titleAccent}>wala</Text>
          </Text>
          <Text style={styles.sub}>Enter your phone number to continue</Text>

          <View style={styles.field}>
            <Text style={styles.cc}>+91</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => setPhone(t.replace(/\D/g, ''))}
              placeholder="98765 43210"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, !valid && styles.submitBtnDisabled]}
            activeOpacity={0.9}
            disabled={!valid}
            onPress={onSubmit}
          >
            <Text style={styles.submitText}>Continue</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },

  card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', ...shadows.md },

  mark: { fontSize: 36, marginBottom: spacing.sm },
  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text, textAlign: 'center' },
  titleAccent: { color: colors.brand },
  sub: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.lg, textAlign: 'center' },

  field: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  cc: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  input: { flex: 1, fontSize: fontSizes.md, color: colors.text, paddingVertical: spacing.md },

  submitBtn: { width: '100%', backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  terms: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
});
