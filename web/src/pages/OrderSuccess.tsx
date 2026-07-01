import { Link, useLocation } from 'react-router-dom';
import { formatRupees } from '../lib/format';
import './OrderSuccess.css';

interface SuccessState {
  orderId?: string;
  total?: number;
}

const STEPS = ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered'];

export function OrderSuccess() {
  const { state } = useLocation();
  const { orderId = 'DW000000', total } = (state as SuccessState) ?? {};

  return (
    <div className="container order-success">
      <div className="order-success__card">
        <div className="order-success__check">✓</div>
        <h1>Order Placed!</h1>
        <p className="order-success__msg">
          Thank you — your order is confirmed and the shop is getting it ready.
        </p>

        <div className="order-success__id">
          <span>Order ID</span>
          <strong>#{orderId}</strong>
        </div>
        {typeof total === 'number' && (
          <div className="order-success__id">
            <span>Amount</span>
            <strong>{formatRupees(total)} · Cash on Delivery</strong>
          </div>
        )}

        {/* Mini status timeline */}
        <div className="track">
          {STEPS.map((step, i) => (
            <div key={step} className={'track__step' + (i === 0 ? ' is-done' : '')}>
              <span className="track__dot" />
              <span className="track__label">{step}</span>
            </div>
          ))}
        </div>

        <div className="order-success__actions">
          <Link to="/track" className="btn btn-primary btn-lg">Track Order</Link>
          <Link to="/" className="btn btn-light btn-lg">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
