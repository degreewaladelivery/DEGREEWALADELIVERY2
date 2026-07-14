import type { Product } from '@shared/types';
import { useCartStore } from '../../store/cartStore';
import { formatRupees } from '../../lib/format';
import './ProductCard.css';

/** A menu/product row with price and an add-to-cart quantity stepper. */
export function ProductCard({ product }: { product: Product }) {
  // Read just this product's quantity, and the two actions, from the store.
  const qty = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  const unavailable = !product.isAvailable;

  return (
    <div className={`product-card${unavailable ? ' is-unavailable' : ''}`}>
      <div className="product-card__info">
        <h4 className="product-card__name">{product.name}</h4>
        {product.unit && <span className="product-card__unit">{product.unit}</span>}
        {product.description && <p className="product-card__desc">{product.description}</p>}
        <span className="product-card__price">{formatRupees(product.price)}</span>
      </div>

      <div className="product-card__action">
        {unavailable ? (
          <span className="product-card__soldout">Unavailable</span>
        ) : qty === 0 ? (
          <button className="product-card__add" onClick={() => addItem(product)}>
            Add +
          </button>
        ) : (
          <div className="stepper">
            <button onClick={() => decrement(product.id)} aria-label="Decrease quantity">−</button>
            <span className="stepper__qty">{qty}</span>
            <button onClick={() => addItem(product)} aria-label="Increase quantity">+</button>
          </div>
        )}
      </div>
    </div>
  );
}
