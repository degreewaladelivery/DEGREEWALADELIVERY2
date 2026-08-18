import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useTabBarSpace } from '../lib/tabBarSpace';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { CartStackParamList } from '../navigation/types';
import { formatRupees } from '../lib/format';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const STEPS = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

export function OrderSuccessScreen() {
  const tabBarSpace = useTabBarSpace();
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<CartStackParamList, 'OrderSuccess'>>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}>
        <View style={styles.card}>
          <View style={styles.check}>
            <Text style={styles.checkMark}>✓</Text>
          </View>
          <Text style={styles.title}>Order Placed!</Text>
          <Text style={styles.msg}>
            Thank you — your order is confirmed and the shop is getting it ready.
          </Text>

          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Order ID</Text>
            <Text style={styles.idValue}>#{params.orderId}</Text>
          </View>
          <View style={styles.idRow}>
            <Text style={styles.idLabel}>Amount</Text>
            <Text style={styles.idValue}>{formatRupees(params.total)} · Cash on Delivery</Text>
          </View>

          <View style={styles.track}>
            {STEPS.map((step, i) => (
              <View key={step} style={styles.trackStep}>
                <View style={[styles.trackDot, i === 0 && styles.trackDotDone]} />
                <Text style={[styles.trackLabel, i === 0 && styles.trackLabelDone]}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Track' as never)}
            >
              <Text style={styles.primaryBtnText}>Track Order</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.lightBtn}
              activeOpacity={0.9}
              onPress={() => navigation.getParent()?.navigate('Home' as never)}
            >
              <Text style={styles.lightBtnText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  content: { padding: spacing.lg, paddingBottom: 60, flexGrow: 1, justifyContent: 'center' },

  card: { backgroundColor: '#fff', borderRadius: radius.lg, padding: spacing.xl, alignItems: 'center', ...shadows.md },

  check: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  checkMark: { color: '#fff', fontSize: 32, fontWeight: fontWeights.heading },

  title: { fontSize: fontSizes.xl, fontWeight: fontWeights.heading, color: colors.text },
  msg: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, marginBottom: spacing.lg },

  idRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  idLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  idValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },

  track: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.lg },
  trackStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trackDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
  trackDotDone: { backgroundColor: colors.success },
  trackLabel: { fontSize: fontSizes.xs, color: colors.textFaint },
  trackLabelDone: { color: colors.success, fontWeight: fontWeights.semibold },

  actions: { width: '100%', gap: spacing.sm },
  primaryBtn: { backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
  lightBtn: { backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, alignItems: 'center' },
  lightBtnText: { color: colors.text, fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
