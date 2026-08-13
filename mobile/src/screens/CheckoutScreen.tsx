import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useDeliveryFare } from '../lib/useDeliveryFare';
import { formatRupees } from '../lib/format';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { LocationSheet } from '../components/LocationSheet';
import { MAX_DELIVERY_RADIUS_KM } from '@shared/deliveryFare';
import type { CartStackParamList } from '../navigation/types';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const TAX_RATE = 0.05;

type Nav = NativeStackNavigationProp<CartStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const shopId = useCartStore((s) => s.shopId);
  const clear = useCartStore((s) => s.clear);
  const location = useLocationStore((s) => s.location);

  const [address, setAddress] = useState(location?.address ?? '');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const { fare, distanceKm, loading, outOfRange, pickupError, hasLocation } =
    useDeliveryFare(shopId);

  useEffect(() => {
    getCustomer().then((c) => {
      if (!c) navigation.replace('Login', { onSuccessRoute: 'Checkout' });
    });
  }, [navigation]);

  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const deliveryFee = fare?.customerFare ?? null;
  const total = subtotal + (deliveryFee ?? 0) + taxes;
  const canPlaceOrder =
    hasLocation && !loading && !outOfRange && !pickupError && address.trim().length >= 6 && !placing;

  const placeOrder = async () => {
    const customer = await getCustomer();
    if (!customer || !location) return;

    setPlacing(true);
    setPlaceError(null);
    try {
      const { data, error } = await supabase.functions.invoke('place-order', {
        body: {
          token: customer.token,
          items: Object.values(items).map((line) => ({
            id: line.product.id,
            quantity: line.quantity,
          })),
          shopId,
          address: address.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
        },
      });

      if (data?.signedOut) {
        await logoutCustomer();
        navigation.replace('Login', { onSuccessRoute: 'Checkout' });
        return;
      }
      if (error || !data?.ok) {
        throw new Error(data?.error ?? error?.message ?? 'Could not place order');
      }

      clear();
      navigation.replace('OrderSuccess', { orderId: data.orderId, total: data.total });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.back}>← Back to cart</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>Checkout</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Delivery Location</Text>

          {location ? (
            <View style={styles.locRow}>
              <View style={styles.locCol}>
                <Text style={styles.locLabel}>{location.label}</Text>
                <Text style={styles.hint} numberOfLines={2}>{location.address}</Text>
                {distanceKm != null && !outOfRange && (
                  <Text style={styles.hint}>{distanceKm.toFixed(1)} km from pickup</Text>
                )}
                {loading && <Text style={styles.hint}>Calculating delivery fee…</Text>}
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                activeOpacity={0.85}
                onPress={() => setLocationOpen(true)}
              >
                <Text style={styles.changeText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.setLocBtn}
              activeOpacity={0.9}
              onPress={() => setLocationOpen(true)}
            >
              <Text style={styles.setLocText}>📍 Set delivery location</Text>
            </TouchableOpacity>
          )}

          {pickupError && (
            <Text style={styles.hint}>Delivery isn't set up for this shop yet.</Text>
          )}
          {outOfRange && (
            <Text style={styles.hint}>
              That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
              {MAX_DELIVERY_RADIUS_KM} km.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏠 Address Details</Text>
          <TextInput
            style={styles.address}
            value={address}
            onChangeText={setAddress}
            placeholder="House / flat no., floor, landmark…"
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={3}
          />
          <Text style={styles.hint}>
            Add the door number and a landmark so the agent finds you quickly.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Payment Method</Text>
          <View style={[styles.method, styles.methodActive]}>
            <Text style={styles.methodIcon}>💵</Text>
            <View style={styles.methodCol}>
              <Text style={styles.methodName}>Cash on Delivery</Text>
              <Text style={styles.methodSub}>Pay when your order arrives</Text>
            </View>
            <View style={styles.radioOn} />
          </View>
          <View style={[styles.method, styles.methodDisabled]}>
            <Text style={styles.methodIcon}>🟣</Text>
            <View style={styles.methodCol}>
              <Text style={styles.methodName}>Razorpay (UPI / Card)</Text>
              <Text style={styles.methodSub}>Coming soon</Text>
            </View>
            <View style={styles.radioOff} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Order Summary</Text>
          <Row label={`Items (${count})`} value={formatRupees(subtotal)} />
          <Row label="Delivery fee" value={deliveryFee != null ? formatRupees(deliveryFee) : '—'} />
          <Row label="Taxes & charges" value={formatRupees(taxes)} />
          <View style={styles.divider} />
          <Row label="To Pay" value={formatRupees(total)} bold />
        </View>

        <TouchableOpacity
          style={[styles.placeBtn, !canPlaceOrder && styles.placeBtnDisabled]}
          activeOpacity={0.9}
          onPress={placeOrder}
          disabled={!canPlaceOrder}
        >
          <Text style={styles.placeBtnText}>{placing ? 'Placing order…' : 'Place Order'}</Text>
        </TouchableOpacity>
        {!hasLocation && (
          <Text style={styles.hint}>Set your delivery location to continue</Text>
        )}
        {hasLocation && address.trim().length < 6 && (
          <Text style={styles.hint}>Add your address details to continue</Text>
        )}
        {outOfRange && (
          <Text style={styles.hint}>
            That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
            {MAX_DELIVERY_RADIUS_KM} km. Please pick a closer address.
          </Text>
        )}
        {placeError && <Text style={styles.hint}>{placeError}</Text>}
      </ScrollView>

      <LocationSheet visible={locationOpen} onClose={() => setLocationOpen(false)} />
    </SafeAreaView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, bold && styles.rowBold]}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowBold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgSoft },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 60 },
  back: { color: colors.textMuted, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm },
  heading: { fontSize: fontSizes.xl + 2, fontWeight: fontWeights.heading, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.lg },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm },

  locRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.brandTint,
    borderWidth: 1,
    borderColor: colors.brandTintStrong,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  locCol: { flex: 1, minWidth: 0 },
  locLabel: { fontSize: fontSizes.md, fontWeight: fontWeights.bold, color: colors.text },
  changeBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  changeText: { fontSize: fontSizes.xs, fontWeight: fontWeights.bold, color: colors.text },
  setLocBtn: {
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  setLocText: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: '#fff' },

  address: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: '#fff',
    minHeight: 72,
    textAlignVertical: 'top',
  },

  method: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: '#fff', borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  methodActive: { borderColor: colors.brand },
  methodDisabled: { borderColor: colors.border, opacity: 0.55 },
  methodIcon: { fontSize: 22 },
  methodCol: { flex: 1 },
  methodName: { fontSize: fontSizes.sm, fontWeight: fontWeights.bold, color: colors.text },
  methodSub: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  radioOn: { width: 18, height: 18, borderRadius: 9, borderWidth: 5, borderColor: colors.brand },
  radioOff: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.borderStrong },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  rowLabel: { fontSize: fontSizes.sm, color: colors.textMuted },
  rowValue: { fontSize: fontSizes.sm, color: colors.text },
  rowBold: { fontWeight: fontWeights.heading, color: colors.text, fontSize: fontSizes.md },
  divider: { height: 1, backgroundColor: colors.borderStrong, marginVertical: spacing.sm },

  placeBtn: { marginTop: spacing.sm, backgroundColor: colors.brand, borderRadius: radius.lg, paddingVertical: spacing.md + 2, alignItems: 'center', ...shadows.brand },
  placeBtnDisabled: { opacity: 0.5 },
  placeBtnText: { color: '#fff', fontWeight: fontWeights.heading, fontSize: fontSizes.md },
});
