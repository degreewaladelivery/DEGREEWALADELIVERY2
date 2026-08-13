import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@shared/types';
import { useCartStore } from '../../store/cartStore';
import { formatRupees } from '../../lib/format';
import { Thumb } from '../ui/Thumb';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import './ProductCard.css';

export function ProductCard({ product }: { product: Product }) {

  const qty = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const replaceCartWith = useCartStore((s) => s.replaceCartWith);
  const decrement = useCartStore((s) => s.decrement);
  const [askReplace, setAskReplace] = useState(false);

  const unavailable = !product.isAvailable;

  const onAdd = () => {
    if (addItem(product) === 'needs-confirm') setAskReplace(true);
  };

  return (
    <div className={`product-card${unavailable ? ' is-unavailable' : ''}`}>
      <div className="product-card__thumb">
        <Thumb src={product.imageUrl} emoji="🛒" tint="#F4F6F9" alt={product.name} />
      </div>
      <div className="product-card__info">
        <h4 className="product-card__name">{product.name}</h4>
        {product.unit && <span className="product-card__unit">{product.unit}</span>}
        <span className="product-card__price">{formatRupees(product.price)}</span>
        <Link
          to={`/item/${product.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="product-card__more"
        >
          More details
        </Link>
      </div>

      <div className="product-card__action">
        {unavailable ? (
          <span className="product-card__soldout">Unavailable</span>
        ) : qty === 0 ? (
          <button className="product-card__add" onClick={onAdd}>
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

      {askReplace && (
        <ConfirmDialog
          title="Start a new cart?"
          message="Your cart has items from another shop. Adding this will empty your current cart."
          confirmLabel="Empty cart & add"
          cancelLabel="Keep my cart"
          onConfirm={() => {
            replaceCartWith(product);
            setAskReplace(false);
          }}
          onCancel={() => setAskReplace(false)}
        />
      )}
    </div>
  );
}
