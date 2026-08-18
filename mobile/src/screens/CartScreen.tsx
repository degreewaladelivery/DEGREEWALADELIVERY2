import { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useDeliveryFare } from '../lib/useDeliveryFare';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/Thumb';
import { getCustomer } from '../lib/auth';
import { LocationSheet } from '../components/LocationSheet';
import { MAX_DELIVERY_RADIUS_KM } from '@shared/deliveryFare';
import type { CartStackParamList } from '../navigation/types';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const TAX_RATE = 0.05;

type Nav = NativeStackNavigationProp<CartStackParamList, 'CartMain'>;

export function CartScreen() {
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const shopId = useCartStore((s) => s.shopId);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);
  const location = useLocationStore((s) => s.location);
  const [locationOpen, setLocationOpen] = useState(false);

  const { fare, distanceKm, loading, outOfRange, pickupError } = useDeliveryFare(shopId);

  const lines = Object.values(items);
  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const deliveryFee = fare?.customerFare ?? null;
  const total = subtotal + (deliveryFee ?? 0) + taxes;

  const deliveryValue = () => {
    if (!location) return 'Set location';
    if (pickupError) return '—';
    if (loading) return 'Calculating…';
    if (outOfRange) return 'Too far';
    return deliveryFee != null ? formatRupees(deliveryFee) : '—';
  };

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
            <Thumb src={line.product.imageUrl} emoji="🛒" style={styles.lineThumb} fontSize={20} width={120} />
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

        <TouchableOpacity
          style={styles.deliverTo}
          activeOpacity={0.85}
          onPress={() => setLocationOpen(true)}
        >
          <Text style={styles.deliverToIcon}>📍</Text>
          <View style={styles.deliverToCol}>
            <Text style={styles.deliverToLabel}>
              {location ? 'Delivering to' : 'Where are we delivering?'}
            </Text>
            <Text style={styles.deliverToValue} numberOfLines={1}>
              {location ? location.label : 'Set your location'}
            </Text>
          </View>
          <Text style={styles.deliverToChange}>Change</Text>
        </TouchableOpacity>

        <View style={styles.bill}>
          <Text style={styles.billTitle}>Bill Details</Text>
          <Row label="Item total" value={formatRupees(subtotal)} />
          <Row
            label={
              distanceKm != null && !outOfRange
                ? `Delivery fee · ${distanceKm.toFixed(1)} km`
                : 'Delivery fee'
            }
            value={deliveryValue()}
          />
          <Row label="Taxes & charges" value={formatRupees(taxes)} />
          <View style={styles.divider} />
          <Row
            label="To Pay"
            value={
              deliveryFee != null
                ? formatRupees(total)
                : `${formatRupees(subtotal + taxes)} + delivery`
            }
            bold
          />
        </View>

        {outOfRange && (
          <Text style={styles.warn}>
            That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
            {MAX_DELIVERY_RADIUS_KM} km.
          </Text>
        )}
        {pickupError && <Text style={styles.warn}>Delivery isn't set up for this shop yet.</Text>}

        <TouchableOpacity
          style={[styles.checkout, (outOfRange || pickupError) && styles.checkoutDisabled]}
          activeOpacity={0.9}
          disabled={outOfRange || pickupError}
          onPress={async () => {
            const customer = await getCustomer();
            if (customer) {
              navigation.navigate('Checkout');
            } else {
              navigation.navigate('Login', { onSuccessRoute: 'Checkout' });
            }
          }}
        >
          <Text style={styles.checkoutText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </ScrollView>

      <LocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
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
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 120 },
  heading: { fontSize: fontSizes.xl + 2, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.lg },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xl },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: fontSizes.lg, fontWeight: fontWeights.heading, color: colors.text },
  emptySub: { fontSize: fontSizes.sm, color: colors.textMuted, textAlign: 'center' },

  line: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  lineThumb: { width: 46, height: 46, borderRadius: radius.md },
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

  deliverTo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandTintStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  deliverToIcon: { fontSize: 17 },
  deliverToCol: { flex: 1, minWidth: 0 },
  deliverToLabel: { fontSize: 11, color: colors.textMuted },
  deliverToValue: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },
  deliverToChange: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.brandDark },

  warn: {
    fontSize: fontSizes.sm,
    color: colors.danger,
    backgroundColor: colors.dangerTint,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
    lineHeight: 20,
  },
  checkoutDisabled: { opacity: 0.5 },

  checkout: { marginTop: spacing.lg, backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', ...shadows.brand },
  checkoutText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
