import { Link, useNavigate } from 'react-router-dom';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import { getCustomer } from '../lib/auth';
import './Cart.css';

const DELIVERY_FEE = 30;
const TAX_RATE = 0.05;

export function Cart() {
  const navigate = useNavigate();
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
      <div className="container cart-empty">
        <span className="cart-empty__icon">🛒</span>
        <h2>Your cart is empty</h2>
        <p>Add some delicious items from your favourite shops.</p>
        <Link to="/" className="btn btn-primary btn-lg">Browse shops</Link>
      </div>
    );
  }

  return (
    <div className="container cart">
      <h1 className="cart__heading">Your Cart</h1>

      <div className="cart__grid">

        <div className="cart__lines">
          {lines.map((line) => (
            <div key={line.product.id} className="cart-line">
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
          <div className="bill-row">
            <span>Item total</span>
            <span>{formatRupees(subtotal)}</span>
          </div>
          <div className="bill-row">
            <span>Delivery fee</span>
            <span>{formatRupees(DELIVERY_FEE)}</span>
          </div>
          <div className="bill-row">
            <span>Taxes & charges</span>
            <span>{formatRupees(taxes)}</span>
          </div>
          <div className="bill-row bill-row--total">
            <span>To Pay</span>
            <span>{formatRupees(total)}</span>
          </div>
          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={() => navigate(getCustomer() ? '/checkout' : '/login?next=/checkout')}
          >
            Proceed to Checkout
          </button>
        </aside>
      </div>
    </div>
  );
}
