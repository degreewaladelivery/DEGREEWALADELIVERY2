import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { LocationPicker } from '../components/LocationPicker';
import { MAPBOX_TOKEN, hasMapbox } from '../lib/mapbox';
import { getPickupPoint, type PickupPoint } from '../lib/deliveryPickup';
import {
  calculateDeliveryFare,
  haversineDistanceKm,
  MAX_DELIVERY_RADIUS_KM,
} from '@shared/deliveryFare';
import { getRouteDistanceKm, type LatLng } from '@shared/mapbox';
import type { CartStackParamList } from '../navigation/types';
import { colors, spacing, radius, fontSizes, fontWeights, shadows } from '../theme';

const TAX_RATE = 0.05;

type Nav = NativeStackNavigationProp<CartStackParamList, 'Checkout'>;

export function CheckoutScreen() {
  const navigation = useNavigation<Nav>();
  const items = useCartStore((s) => s.items);
  const shopId = useCartStore((s) => s.shopId);
  const clear = useCartStore((s) => s.clear);

  const [address, setAddress] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
  const [pickupError, setPickupError] = useState(false);
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [fareLoading, setFareLoading] = useState(false);

  useEffect(() => {
    getCustomer().then((c) => {
      if (!c) navigation.replace('Login', { onSuccessRoute: 'Checkout' });
    });
  }, [navigation]);

  useEffect(() => {
    if (!hasMapbox()) return;
    getPickupPoint(shopId)
      .then((point) => (point ? setPickupPoint(point) : setPickupError(true)))
      .catch(() => setPickupError(true));
  }, [shopId]);

  useEffect(() => {
    if (!hasMapbox() || !pickupPoint || customerLat == null || customerLng == null) return;
    const customer: LatLng = { latitude: customerLat, longitude: customerLng };
    setFareLoading(true);
    const run = MAPBOX_TOKEN
      ? getRouteDistanceKm(MAPBOX_TOKEN, pickupPoint, customer)
      : Promise.resolve(
          haversineDistanceKm(pickupPoint.latitude, pickupPoint.longitude, customer.latitude, customer.longitude)
        );
    run.then((km) => {
      setDistanceKm(km);
      setFareLoading(false);
    });
  }, [pickupPoint, customerLat, customerLng]);

  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const fare = hasMapbox() ? (distanceKm != null ? calculateDeliveryFare(distanceKm) : null) : calculateDeliveryFare(0);
  const deliveryFee = fare?.customerFare ?? null;
  const fareReady = !hasMapbox() || fare != null;
  const total = subtotal + (count > 0 ? deliveryFee ?? 0 : 0) + taxes;
  const outOfRange = distanceKm != null && distanceKm > MAX_DELIVERY_RADIUS_KM;
  const canPlaceOrder =
    address.trim().length >= 6 && fareReady && !pickupError && !outOfRange && !placing;

  const placeOrder = async () => {
    const customer = await getCustomer();
    if (!customer) return;

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
          latitude: customerLat,
          longitude: customerLng,
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

        {hasMapbox() && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🗺️ Delivery Location</Text>
            {pickupError && (
              <Text style={styles.hint}>Delivery isn't set up for this shop yet — pickup point is missing.</Text>
            )}
            <LocationPicker
              latitude={customerLat}
              longitude={customerLng}
              onChange={(lat, lng) => {
                setCustomerLat(lat);
                setCustomerLng(lng);
              }}
            />
            {customerLat == null && (
              <Text style={styles.hint}>Tap the map to drop a pin at your delivery location.</Text>
            )}
            {fareLoading && <Text style={styles.hint}>Calculating delivery fee…</Text>}
            {!fareLoading && distanceKm != null && (
              <Text style={styles.hint}>
                {distanceKm.toFixed(1)} km from pickup · delivery fee {formatRupees(deliveryFee ?? 0)}
              </Text>
            )}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Delivery Address</Text>
          <TextInput
            style={styles.address}
            value={address}
            onChangeText={setAddress}
            placeholder="House / flat no., street, landmark, Balehonnuru…"
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={3}
          />
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
        {address.trim().length < 6 && <Text style={styles.hint}>Add a delivery address to continue</Text>}
        {address.trim().length >= 6 && !fareReady && !pickupError && (
          <Text style={styles.hint}>Drop a pin on the map to calculate your delivery fee</Text>
        )}
        {outOfRange && (
          <Text style={styles.hint}>
            That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
            {MAX_DELIVERY_RADIUS_KM} km. Please pick a closer address.
          </Text>
        )}
        {placeError && <Text style={styles.hint}>{placeError}</Text>}
      </ScrollView>
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
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: 60 },
  back: { color: colors.textMuted, fontWeight: fontWeights.semibold, fontSize: fontSizes.sm },
  heading: { fontSize: fontSizes.xl + 2, fontWeight: fontWeights.heading, color: colors.text, marginTop: spacing.sm, marginBottom: spacing.lg },

  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  cardTitle: { fontSize: fontSizes.md, fontWeight: fontWeights.heading, color: colors.text, marginBottom: spacing.sm },
  hint: { fontSize: fontSizes.xs, color: colors.textMuted, marginTop: spacing.sm },

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
