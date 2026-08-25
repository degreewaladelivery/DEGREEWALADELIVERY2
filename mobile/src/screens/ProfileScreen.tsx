import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { fetchProfile, saveProfile, type Customer, type CustomerProfile } from '../lib/auth';
import { SignedOutError } from '../lib/tracking';
import { useTabBarSpace } from '../lib/tabBarSpace';
import { APP_VERSION } from '../lib/appVersion';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

function initialFor(profile: CustomerProfile | null): string {
  const letter = profile?.name?.trim()?.[0];
  return letter ? letter.toUpperCase() : '👤';
}

function memberSince(iso: string | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
}

export function ProfileScreen({
  customer,
  onLogout,
}: {
  customer: Customer;
  onLogout: () => void;
}) {
  const navigation = useNavigation<any>();
  const bottomSpace = useTabBarSpace();

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Held in a ref so the fetch below depends only on the token. The parent
  // rebuilds this callback every render, and depending on it directly would
  // refetch the profile on each one.
  const onLogoutRef = useRef(onLogout);
  useEffect(() => {
    onLogoutRef.current = onLogout;
  });

  useEffect(() => {
    let cancelled = false;
    fetchProfile(customer.token)
      .then((next) => {
        if (cancelled) return;
        setProfile(next);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoading(false);
        if (err instanceof SignedOutError) {
          onLogoutRef.current();
          return;
        }
        setError('Could not load your profile.');
      });
    return () => {
      cancelled = true;
    };
  }, [customer.token]);

  const startEditing = () => {
    setDraft(profile?.name ?? '');
    setEmailDraft(profile?.email ?? '');
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const next = await saveProfile(customer.token, { name: draft, email: emailDraft });
      setProfile(next);
      setEditing(false);
    } catch (err) {
      if (err instanceof SignedOutError) {
        onLogout();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  const name = profile?.name?.trim() ?? '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomSpace }]}>
        <Text style={styles.heading}>My Account</Text>

        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initialFor(profile)}</Text>
          </View>

          {editing ? (
            <>
              <TextInput
                style={styles.input}
                value={draft}
                onChangeText={setDraft}
                placeholder="Your name"
                placeholderTextColor={colors.textFaint}
                autoFocus
                maxLength={60}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.input, styles.inputSpaced]}
                value={emailDraft}
                onChangeText={setEmailDraft}
                placeholder="Email (optional)"
                placeholderTextColor={colors.textFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={254}
                returnKeyType="done"
                onSubmitEditing={save}
              />
              <View style={styles.editRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, styles.flex]}
                  onPress={() => setEditing(false)}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, styles.flex, saving && styles.disabled]}
                  onPress={save}
                  disabled={saving}
                  activeOpacity={0.9}
                >
                  <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save'}</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={name ? styles.name : styles.namePlaceholder}>
                {name || 'Add your name'}
              </Text>
              <Text style={styles.phone}>+91 {profile?.phone ?? customer.phone}</Text>
              {!!profile?.email && <Text style={styles.phone}>{profile.email}</Text>}
              <TouchableOpacity onPress={startEditing} activeOpacity={0.8}>
                <Text style={styles.editLink}>{name ? 'Edit details' : 'Add your details'}</Text>
              </TouchableOpacity>
            </>
          )}

          {error && <Text style={styles.error}>{error}</Text>}
        </View>

        {/* A name is not decoration here — it is what the agent asks for at the
            door, so it is worth saying why before someone dismisses the field. */}
        {!name && !editing && (
          <Text style={styles.nudge}>
            Adding your name helps your delivery agent find you at the door.
          </Text>
        )}

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile?.orderCount ?? 0}</Text>
            <Text style={styles.statLabel}>
              {profile?.orderCount === 1 ? 'Order' : 'Orders'}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{memberSince(profile?.memberSince)}</Text>
            <Text style={styles.statLabel}>Member since</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.row}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Cart', { screen: 'Track' })}
        >
          <Text style={styles.rowIcon}>📦</Text>
          <Text style={styles.rowLabel}>My Orders</Text>
          <Text style={styles.rowChevron}>›</Text>
        </TouchableOpacity>


        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.9} onPress={onLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version {APP_VERSION}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: spacing.lg, gap: spacing.md },

  heading: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.heading,
    color: colors.text,
    marginBottom: spacing.xs,
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 30, fontWeight: fontWeights.heading, color: colors.brand },

  name: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  namePlaceholder: { fontSize: fontSizes.lg, fontWeight: fontWeights.semibold, color: colors.textFaint },
  phone: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: spacing.xs },
  editLink: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.bold,
    color: colors.brand,
    marginTop: spacing.md,
  },

  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSizes.md,
    color: colors.text,
  },
  inputSpaced: { marginTop: spacing.sm },
  editRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginTop: spacing.md },
  flex: { flex: 1 },
  primaryBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
  secondaryBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  secondaryText: { color: colors.text, fontWeight: fontWeights.heading, fontSize: fontSizes.md },
  disabled: { opacity: 0.5 },

  error: {
    width: '100%',
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.sm,
    marginTop: spacing.md,
  },

  nudge: {
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },

  statsRow: { flexDirection: 'row', gap: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statValue: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  statLabel: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    ...shadows.sm,
  },
  rowIcon: { fontSize: 18 },
  rowLabel: { flex: 1, fontSize: fontSizes.md, fontWeight: fontWeights.semibold, color: colors.text },
  rowChevron: { fontSize: fontSizes.lg, color: colors.textFaint },

  logoutBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  version: {
    fontSize: fontSizes.xs,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { color: colors.danger, fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
