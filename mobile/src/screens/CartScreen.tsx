import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const DELIVERY_FEE = 30;
const TAX_RATE = 0.05;

export function CartScreen() {
  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  const lines = Object.values(items);
  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const total = subtotal + (count > 0 ? DELIVERY_FEE : 0) + taxes;

  if (count === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>Add some items from your favourite shops.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Your Cart</Text>

        {lines.map((line) => (
          <View key={line.product.id} style={styles.line}>
            <View style={styles.lineInfo}>
              <Text style={styles.lineName}>{line.product.name}</Text>
              <Text style={styles.linePrice}>{formatRupees(line.product.price)}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => decrement(line.product.id)} hitSlop={8}>
                <Text style={styles.stepBtn}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qty}>{line.quantity}</Text>
              <TouchableOpacity onPress={() => addItem(line.product)} hitSlop={8}>
                <Text style={styles.stepBtn}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lineAmount}>{formatRupees(line.product.price * line.quantity)}</Text>
          </View>
        ))}

        <View style={styles.bill}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <Row label="Item total" value={formatRupees(subtotal)} />
          <Row label="Delivery fee" value={formatRupees(DELIVERY_FEE)} />
          <Row label="Taxes & charges" value={formatRupees(taxes)} />
          <View style={styles.divider} />
          <Row label="To Pay" value={formatRupees(total)} bold />
        </View>

        <TouchableOpacity
          style={styles.checkout}
          activeOpacity={0.9}
          onPress={() => Alert.alert('Checkout', 'Ordering is coming soon — the orders system is next.')}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.billRow}>
      <Text style={[styles.billLabel, bold && styles.billBold]}>{label}</Text>
      <Text style={[styles.billValue, bold && styles.billBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  heading: { fontSize: fontSizes.xl + 2, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.lg },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  emptySub: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },

  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineInfo: { flex: 1 },
  lineName: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  linePrice: { fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  lineAmount: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, minWidth: 64, textAlign: 'right' },

  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1.5, borderColor: colors.brand, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  stepBtn: { color: colors.brand, fontSize: fontSizes.lg, fontWeight: fontWeights.heading, width: 16, textAlign: 'center' },
  qty: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text, minWidth: 14, textAlign: 'center' },

  bill: { marginTop: spacing.xl, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg },
  billTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.sm },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  billLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  billValue: { fontSize: fontSizes.sm, color: colors.text },
  billBold: { fontWeight: fontWeights.heading, color: colors.text, fontSize: fontSizes.md },
  divider: { height: 1, backgroundColor: colors.borderStrong, marginVertical: spacing.sm },

  checkout: { marginTop: spacing.lg, backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', ...shadows.brand },
  checkoutText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
