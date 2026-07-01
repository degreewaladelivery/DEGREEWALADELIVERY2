import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import './Payment.css';

const DELIVERY_FEE = 30;
const TAX_RATE = 0.05;

export function Payment() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);

  const [address, setAddress] = useState('');
  const [method, setMethod] = useState<'cod' | 'razorpay'>('cod');

  const count = selectCount(items);
  const subtotal = selectSubtotal(items);
  const taxes = Math.round(subtotal * TAX_RATE);
  const total = subtotal + (count > 0 ? DELIVERY_FEE : 0) + taxes;

  if (count === 0) {
    return (
      <div className="container cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Nothing to check out</h2>
        <Link to="/" className="btn btn-primary btn-lg">Browse shops</Link>
      </div>
    );
  }

  const placeOrder = () => {
    const orderId = 'DW' + Date.now().toString().slice(-6);
    clear();
    navigate('/order-success', { state: { orderId, total } });
  };

  return (
    <div className="container payment">
      <Link to="/cart" className="payment__back">← Back to cart</Link>
      <h1 className="payment__heading">Checkout</h1>

      <div className="payment__grid">
        <div className="payment__main">
          {/* Delivery address */}
          <section className="pay-card">
            <h3>📍 Delivery Address</h3>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House / flat no., street, landmark, Balehonnuru…"
              rows={3}
            />
          </section>

          {/* Payment method */}
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

        {/* Summary */}
        <aside className="payment__summary">
          <h3>Order Summary</h3>
          <div className="bill-row"><span>Items ({count})</span><span>{formatRupees(subtotal)}</span></div>
          <div className="bill-row"><span>Delivery fee</span><span>{formatRupees(DELIVERY_FEE)}</span></div>
          <div className="bill-row"><span>Taxes & charges</span><span>{formatRupees(taxes)}</span></div>
          <div className="bill-row bill-row--total"><span>To Pay</span><span>{formatRupees(total)}</span></div>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={placeOrder}
            disabled={address.trim().length < 6}
          >
            Place Order · {formatRupees(total)}
          </button>
          {address.trim().length < 6 && (
            <p className="payment__hint">Add a delivery address to continue</p>
          )}
        </aside>
      </div>
    </div>
  );
}
