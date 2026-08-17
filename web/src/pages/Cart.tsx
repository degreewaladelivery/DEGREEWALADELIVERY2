import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { useLocationStore } from '../store/locationStore';
import { useDeliveryFare } from '../lib/useDeliveryFare';
import { formatRupees } from '../lib/format';
import { Thumb } from '../components/ui/Thumb';
import { getCustomer } from '../lib/auth';
import { LocationModal } from '../components/ui/LocationModal';
import { MAX_DELIVERY_RADIUS_KM } from '@shared/deliveryFare';
import './Cart.css';

const TAX_RATE = 0.05;

export function Cart() {
  const navigate = useNavigate();
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

  if (count === 0) {
    return (
      <div className="container cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Your cart is empty</h2>
        <p>Add some delicious items from your favourite shops.</p>
        <Link to="/" className="btn btn-primary btn-lg">Browse shops</Link>
      </div>
    );
  }

  const deliveryValue = () => {
    if (!location) return 'Set location';
    if (pickupError) return '—';
    if (loading) return 'Calculating…';
    if (outOfRange) return 'Too far';
    return deliveryFee != null ? formatRupees(deliveryFee) : '—';
  };

  return (
    <div className="container cart">
      <h1 className="cart__heading">Your Cart</h1>

      <div className="cart__grid">

        <div className="cart__lines">
          {lines.map((line) => (
            <div key={line.product.id} className="cart-line">
              <div className="cart-line__thumb">
                <Thumb src={line.product.imageUrl} emoji="🛒" tint="#F4F6F9" alt={line.product.name} />
              </div>
              <div className="cart-line__info">
                <h4>{line.product.name}</h4>
                <span>{formatRupees(line.product.price)}</span>
              </div>
              <div className="stepper stepper--light">
                <button onClick={() => decrement(line.product.id)} aria-label="Decrease">−</button>
                <span className="stepper__qty">{line.quantity}</span>
                <button onClick={() => addItem(line.product)} aria-label="Increase">+</button>
              </div>
              <strong className="cart-line__amount">
                {formatRupees(line.product.price * line.quantity)}
              </strong>
            </div>
          ))}
        </div>

        <aside className="cart__bill">
          <h3>Bill Details</h3>

          <button className="cart__deliverto" type="button" onClick={() => setLocationOpen(true)}>
            <span className="cart__deliverto-icon">📍</span>
            <span className="cart__deliverto-col">
              {location ? (
                <>
                  <small>Delivering to</small>
                  <strong>{location.label}</strong>
                </>
              ) : (
                <>
                  <small>Where are we delivering?</small>
                  <strong>Set your location</strong>
                </>
              )}
            </span>
            <span className="cart__deliverto-change">Change</span>
          </button>

          <div className="bill-row">
            <span>Item total</span>
            <span>{formatRupees(subtotal)}</span>
          </div>
          <div className="bill-row">
            <span>
              Delivery fee
              {distanceKm != null && !outOfRange && (
                <em className="bill-row__note"> · {distanceKm.toFixed(1)} km</em>
              )}
            </span>
            <span>{deliveryValue()}</span>
          </div>
          <div className="bill-row">
            <span>Taxes &amp; charges</span>
            <span>{formatRupees(taxes)}</span>
          </div>
          <div className="bill-row bill-row--total">
            <span>To Pay</span>
            <span>{deliveryFee != null ? formatRupees(total) : `${formatRupees(subtotal + taxes)} + delivery`}</span>
          </div>

          {outOfRange && (
            <p className="cart__warn">
              That location is {distanceKm?.toFixed(1)} km away — we deliver within{' '}
              {MAX_DELIVERY_RADIUS_KM} km.
            </p>
          )}
          {pickupError && (
            <p className="cart__warn">Delivery isn't set up for this shop yet.</p>
          )}

          <button
            className="btn btn-primary btn-lg btn-block"
            disabled={outOfRange || pickupError}
            onClick={() => navigate(getCustomer() ? '/checkout' : '/login?next=/checkout')}
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>

      {locationOpen && <LocationModal onClose={() => setLocationOpen(false)} />}
    </div>
  );
}
