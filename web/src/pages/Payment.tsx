import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useDeliveryFare } from '../lib/useDeliveryFare';
import { RepeatPicker, type RepeatChoice } from '../components/ui/RepeatPicker';
import { createSchedule } from '../lib/scheduledOrders';
import { formatRupees } from '../lib/format';
import { getCustomer, logoutCustomer } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { LocationModal } from '../components/ui/LocationModal';
import { MAX_DELIVERY_RADIUS_KM } from '@shared/deliveryFare';
import './Payment.css';

const TAX_RATE = 0.05;

export function Payment() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const shopId = useCartStore((s) => s.shopId);
  const clear = useCartStore((s) => s.clear);
  const location = useLocationStore((s) => s.location);

  const [address, setAddress] = useState(location?.address ?? '');
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod');
  const [placing, setPlacing] = useState(false);
  const [repeat, setRepeat] = useState<RepeatChoice>({
    enabled: false,
    dayOfMonth: new Date().getDate(),
    occurrences: 3,
  });
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);

  const { fare, distanceKm, loading, outOfRange, pickupError, hasLocation } =
    useDeliveryFare(shopId);

  useEffect(() => {
    if (!getCustomer()) navigate('/login?next=/checkout', { replace: true });
  }, [navigate]);

  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const deliveryFee = fare?.customerFare ?? null;
  const total = subtotal + (deliveryFee ?? 0) + taxes;

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
        navigate('/login?next=/checkout', { replace: true });
        return;
      }
      if (error || !data?.ok) {
        throw new Error(data?.error ?? error?.message ?? 'Could not place order');
      }

      // Only once the order itself is placed. A repeat is an extra, and failing
      // to save it must not lose the order the customer just completed — so its
      // error is swallowed and the repeat can be set up again later.
      if (repeat.enabled) {
        try {
          await createSchedule(customer.token, {
            items: Object.values(items).map((line) => ({
              id: line.product.id,
              quantity: line.quantity,
              name: line.product.name,
            })),
            shopId,
            address: address.trim(),
            latitude: location.latitude,
            longitude: location.longitude,
            dayOfMonth: repeat.dayOfMonth,
            occurrences: repeat.occurrences,
          });
        } catch {
          // Swallowed on purpose — see above.
        }
      }

      clear();
      navigate('/order-success', { state: { orderId: data.orderId, total: data.total } });
    } catch (err) {
      setPlaceError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacing(false);
    }
  };

  const ready =
    hasLocation && !loading && !outOfRange && !pickupError && address.trim().length >= 6;

  return (
    <div className="container payment">
      <Link to="/cart" className="payment__back">← Back to cart</Link>
      <h1 className="payment__heading">Checkout</h1>

      <div className="payment__grid">
        <div className="payment__main">

          <section className="pay-card">
            <h3>📍 Delivery Location</h3>

            {location ? (
              <div className="pay-loc">
                <span className="pay-loc__icon">📍</span>
                <div className="pay-loc__col">
                  <strong>{location.label}</strong>
                  <small>{location.address}</small>
                  {distanceKm != null && !outOfRange && (
                    <small>{distanceKm.toFixed(1)} km from pickup</small>
                  )}
                  {loading && <small>Calculating delivery fee…</small>}
                </div>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  onClick={() => setLocationOpen(true)}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <p className="payment__hint" style={{ textAlign: 'left', marginTop: 0 }}>
                  We need your location to work out the delivery fee.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-md"
                  onClick={() => setLocationOpen(true)}
                >
                  📍 Set delivery location
                </button>
              </>
            )}

            {pickupError && (
              <p className="payment__hint">Delivery isn't set up for this shop yet.</p>
            )}
            {outOfRange && (
              <p className="payment__hint">
                That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
                {MAX_DELIVERY_RADIUS_KM} km.
              </p>
            )}
          </section>

          <section className="pay-card">
            <h3>🏠 Address Details</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / flat no., floor, landmark…"
              rows={3}
            />
            <p className="payment__hint" style={{ textAlign: 'left' }}>
              Add the door number and a landmark so the agent finds you quickly.
            </p>
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

          <RepeatPicker value={repeat} onChange={setRepeat} />
        </div>

        <aside className="payment__summary">
          <h3>Order Summary</h3>
          <div className="bill-row"><span>Items ({count})</span><span>{formatRupees(subtotal)}</span></div>
          <div className="bill-row">
            <span>Delivery fee</span>
            <span>{deliveryFee != null ? formatRupees(deliveryFee) : loading ? 'Calculating…' : '—'}</span>
          </div>
          <div className="bill-row"><span>Taxes &amp; charges</span><span>{formatRupees(taxes)}</span></div>
          <div className="bill-row bill-row--total">
            <span>To Pay</span>
            <span>
              {deliveryFee != null
                ? formatRupees(total)
                : `${formatRupees(subtotal + taxes)} + delivery`}
            </span>
          </div>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={placeOrder}
            disabled={!ready || placing}
          >
            {placing ? 'Placing order…' : `Place Order · ${formatRupees(total)}`}
          </button>
          {!hasLocation && <p className="payment__hint">Set your delivery location to continue</p>}
          {hasLocation && address.trim().length < 6 && (
            <p className="payment__hint">Add your address details to continue</p>
          )}
          {placeError && <p className="payment__hint">{placeError}</p>}
        </aside>
      </div>

      {locationOpen && <LocationModal onClose={() => setLocationOpen(false)} />}
    </div>
  );
}
