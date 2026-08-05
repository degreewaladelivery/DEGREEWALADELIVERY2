import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { LocationPicker } from '../components/ui/LocationPicker';
import { MAPBOX_TOKEN, hasMapbox } from '../lib/mapbox';
import { getPickupPoint, type PickupPoint } from '../lib/deliveryPickup';
import {
  calculateDeliveryFare,
  haversineDistanceKm,
  MAX_DELIVERY_RADIUS_KM,
} from '@shared/deliveryFare';
import { getRouteDistanceKm, type LatLng } from '@shared/mapbox';
import './Payment.css';

const TAX_RATE = 0.05;

export function Payment() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const shopId = useCartStore((s) => s.shopId);
  const clear = useCartStore((s) => s.clear);

  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod');
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);

  const [pickupPoint, setPickupPoint] = useState<PickupPoint | null>(null);
  const [pickupError, setPickupError] = useState(false);
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [distance, setDistance] = useState<{
    latitude: number;
    longitude: number;
    km: number;
  } | null>(null);

  useEffect(() => {
    if (!getCustomer()) navigate('/login?next=/checkout', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (!hasMapbox()) return;
    getPickupPoint(shopId)
      .then((point) => (point ? setPickupPoint(point) : setPickupError(true)))
      .catch(() => setPickupError(true));
  }, [shopId]);

  useEffect(() => {
    if (!hasMapbox() || !pickupPoint || customerLat == null || customerLng == null) return;
    let cancelled = false;
    const target: LatLng = { latitude: customerLat, longitude: customerLng };
    const run = MAPBOX_TOKEN
      ? getRouteDistanceKm(MAPBOX_TOKEN, pickupPoint, target)
      : Promise.resolve(
          haversineDistanceKm(pickupPoint.latitude, pickupPoint.longitude, target.latitude, target.longitude)
        );
    run.then((km) => {
      if (!cancelled) setDistance({ latitude: target.latitude, longitude: target.longitude, km });
    });
    return () => {
      cancelled = true;
    };
  }, [pickupPoint, customerLat, customerLng]);

  const distanceKm =
    distance && distance.latitude === customerLat && distance.longitude === customerLng
      ? distance.km
      : null;
  const fareLoading =
    hasMapbox() &&
    pickupPoint != null &&
    customerLat != null &&
    customerLng != null &&
    distanceKm == null;

  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const fare = hasMapbox() ? (distanceKm != null ? calculateDeliveryFare(distanceKm) : null) : calculateDeliveryFare(0);
  const deliveryFee = fare?.customerFare ?? null;
  const fareReady = !hasMapbox() || fare != null;
  const outOfRange = distanceKm != null && distanceKm > MAX_DELIVERY_RADIUS_KM;
  const total = subtotal + (count > 0 ? deliveryFee ?? 0 : 0) + taxes;

  if (count === 0) {
    return (
      <div className="container cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Nothing to check out</h2>
        <Link to="/" className="btn btn-primary btn-lg">Browse shops</Link>
      </div>
    );
  }

  const placeOrder = async () => {
    const customer = getCustomer();
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
        navigate('/login?next=/checkout', { replace: true });
        return;
      }
      if (error || !data?.ok) {
        throw new Error(data?.error ?? error?.message ?? 'Could not place order');
      }

      clear();
      navigate('/order-success', { state: { orderId: data.orderId, total: data.total } });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="container payment">
      <Link to="/cart" className="payment__back">← Back to cart</Link>
      <h1 className="payment__heading">Checkout</h1>

      <div className="payment__grid">
        <div className="payment__main">

          {hasMapbox() && (
            <section className="pay-card">
              <h3>🗺️ Delivery Location</h3>
              {pickupError && (
                <p className="payment__hint">
                  Delivery isn't set up for this shop yet — pickup point is missing.
                </p>
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
                <p className="payment__hint">Tap the map to drop a pin at your delivery location.</p>
              )}
              {fareLoading && <p className="payment__hint">Calculating delivery fee…</p>}
              {!fareLoading && distanceKm != null && (
                <p className="payment__hint">
                  {distanceKm.toFixed(1)} km from pickup · delivery fee {formatRupees(deliveryFee ?? 0)}
                </p>
              )}
            </section>
          )}

          <section className="pay-card">
            <h3>📍 Delivery Address</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / flat no., street, landmark, Balehonnuru…"
              rows={3}
            />
          </section>

          <section className="pay-card">
            <h3>💳 Payment Method</h3>
            <label className={'pay-method' + (method === 'cod' ? ' is-active' : '')}>
              <input
                type="radio"
                name="method"
                checked={method === 'cod'}
                onChange={() => setMethod('cod')}
              />
              <span className="pay-method__icon">💵</span>
              <span className="pay-method__col">
                <strong>Cash on Delivery</strong>
                <small>Pay when your order arrives</small>
              </span>
            </label>

            <label className="pay-method is-disabled">
              <input type="radio" name="method" disabled />
              <span className="pay-method__icon">🟣</span>
              <span className="pay-method__col">
                <strong>Razorpay (UPI / Card)</strong>
                <small>Coming soon</small>
              </span>
            </label>
          </section>
        </div>

        <aside className="payment__summary">
          <h3>Order Summary</h3>
          <div className="bill-row"><span>Items ({count})</span><span>{formatRupees(subtotal)}</span></div>
          <div className="bill-row"><span>Delivery fee</span><span>{deliveryFee != null ? formatRupees(deliveryFee) : '—'}</span></div>
          <div className="bill-row"><span>Taxes & charges</span><span>{formatRupees(taxes)}</span></div>
          <div className="bill-row bill-row--total"><span>To Pay</span><span>{formatRupees(total)}</span></div>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={placeOrder}
            disabled={address.trim().length < 6 || !fareReady || pickupError || outOfRange || placing}
          >
            {placing ? 'Placing order…' : `Place Order · ${formatRupees(total)}`}
          </button>
          {address.trim().length < 6 && (
            <p className="payment__hint">Add a delivery address to continue</p>
          )}
          {address.trim().length >= 6 && !fareReady && !pickupError && (
            <p className="payment__hint">Drop a pin on the map to calculate your delivery fee</p>
          )}
          {outOfRange && (
            <p className="payment__hint">
              That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
              {MAX_DELIVERY_RADIUS_KM} km. Please pick a closer address.
            </p>
          )}
          {placeError && <p className="payment__hint">{placeError}</p>}
        </aside>
      </div>
    </div>
  );
}
