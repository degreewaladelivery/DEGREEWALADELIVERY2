import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { sendOtp, verifyOtp, getCustomer, logoutCustomer, saveProfile, type Customer } from '../lib/auth';
import { ProfileScreen } from './ProfileScreen';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

export function LoginScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const onSuccessRoute = route.params?.onSuccessRoute as 'Checkout' | undefined;

  const [checking, setChecking] = useState(true);
  const [customer, setCustomerState] = useState<Customer | null>(null);
  const [step, setStep] = useState<'phone' | 'otp' | 'profile'>('phone');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getCustomer().then((c) => {
      if (!active) return;
      setCustomerState(c);
      setChecking(false);
      if (c && onSuccessRoute) navigation.replace(onSuccessRoute);
    });
    return () => {
      active = false;
    };
  }, []);

  const phoneValid = phone.replace(/\D/g, '').length === 10;
  const otpValid = otp.replace(/\D/g, '').length === 6;

  const onSendOtp = async () => {
    if (!phoneValid) return;
    setLoading(true);
    setError(null);
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async () => {
    if (!otpValid) return;
    setLoading(true);
    setError(null);
    try {
      const { customer: c, needsProfile } = await verifyOtp(phone, otp);
      if (needsProfile) {
        // Asked once, right after the number is proved — the agent at the door
        // has nothing to ask for otherwise, and a customer who gets past this
        // screen rarely goes looking for a profile page.
        setCustomerState(c);
        setStep('profile');
        return;
      }
      setCustomerState(c);
      if (onSuccessRoute) navigation.replace(onSuccessRoute);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect OTP');
    } finally {
      setLoading(false);
    }
  };

  const onSaveProfile = async () => {
    if (!customer || !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await saveProfile(customer.token, { name: name.trim(), email: email.trim() });
      if (onSuccessRoute) navigation.replace(onSuccessRoute);
      else setStep('phone');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = async () => {
    await logoutCustomer();
    setCustomerState(null);
  };

  if (checking) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // Asked once, immediately after the number is proved. An agent at the door
  // has nothing to ask for without a name, and someone who gets past sign-in
  // rarely goes looking for a profile page afterwards.
  if (customer && step === 'profile') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.card}>
            <Text style={styles.mark}>👋</Text>
            <Text style={styles.title}>Almost there</Text>
            <Text style={styles.sub}>Tell us who to hand your deliveries to.</Text>

            <View style={styles.field}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
                autoFocus
                maxLength={60}
                returnKeyType="next"
              />
            </View>

            <View style={[styles.field, styles.fieldSpaced]}>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Email (optional)"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                returnKeyType="done"
                onSubmitEditing={onSaveProfile}
              />
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitBtn, (!name.trim() || loading) && styles.submitBtnDisabled]}
              activeOpacity={0.9}
              disabled={!name.trim() || loading}
              onPress={onSaveProfile}
            >
              <Text style={styles.submitText}>{loading ? 'Saving…' : 'Continue'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // The Account tab and the checkout gate are the same screen with different
  // jobs. Gating a checkout, a signed-in customer is sent straight on; on the
  // Account tab there is nowhere to send them, so this is where their profile
  // lives.
  if (customer && !onSuccessRoute) {
    return <ProfileScreen customer={customer} onLogout={onLogout} />;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <View style={styles.card}>
          <Text style={styles.mark}>🛵</Text>
          <Text style={styles.title}>
            Welcome to Degree<Text style={styles.titleAccent}>wala</Text>
          </Text>
          <Text style={styles.sub}>
            {step === 'phone' ? 'Enter your phone number to continue' : `Enter the OTP sent to +91 ${phone}`}
          </Text>

          {step === 'phone' ? (
            <>
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
              {error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity
                style={[styles.submitBtn, (!phoneValid || loading) && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                disabled={!phoneValid || loading}
                onPress={onSendOtp}
              >
                <Text style={styles.submitText}>{loading ? 'Sending…' : 'Send OTP'}</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.field}>
                <TextInput
                  style={styles.input}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/\D/g, ''))}
                  placeholder="6-digit OTP"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
              {error && <Text style={styles.error}>{error}</Text>}
              <TouchableOpacity
                style={[styles.submitBtn, (!otpValid || loading) && styles.submitBtnDisabled]}
                activeOpacity={0.9}
                disabled={!otpValid || loading}
                onPress={onVerifyOtp}
              >
                <Text style={styles.submitText}>{loading ? 'Verifying…' : 'Verify & Continue'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setStep('phone');
                  setOtp('');
                  setError(null);
                }}
              >
                <Text style={styles.back}>← Change number</Text>
              </TouchableOpacity>
            </>
          )}

          <Text style={styles.terms}>By continuing you agree to our Terms & Privacy Policy.</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },

  card: { width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', ...shadows.md },

  partner: { marginTop: spacing.lg, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  partnerText: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.textMuted },

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
  fieldSpaced: { marginTop: spacing.sm },
  cc: { fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  input: { flex: 1, fontSize: fontSizes.md, color: colors.text, paddingVertical: spacing.md },

  error: { width: '100%', fontSize: fontSizes.sm, color: colors.danger, backgroundColor: '#fdecea', borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.sm },

  submitBtn: { width: '100%', backgroundColor: colors.brand, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  back: { fontSize: fontSizes.sm, fontWeight: fontWeights.semibold, color: colors.textMuted, marginTop: spacing.md },

  logoutBtn: { width: '100%', backgroundColor: colors.surface, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.lg },
  logoutText: { color: colors.text, fontWeight: fontWeights.heading, fontSize: fontSizes.md },

  terms: { fontSize: fontSizes.xs, color: colors.textFaint, textAlign: 'center', marginTop: spacing.md },
});
