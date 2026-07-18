import type { Product } from '@shared/types';
import { useCartStore } from '../../store/cartStore';
import { formatRupees, discountPercent } from '../../lib/format';
import { Thumb } from '../ui/Thumb';
import './ProductCard.css';

export function ProductCard({ product }: { product: Product }) {

  const qty = useCartStore((s) => s.items[product.id]?.quantity ?? 0);
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  const unavailable = !product.isAvailable;
  const discount = discountPercent(product.mrp, product.price);

  return (
    <div className={`product-card${unavailable ? ' is-unavailable' : ''}`}>
      <div className="product-card__thumb">
        <Thumb src={product.imageUrl} emoji="🛒" tint="#F4F6F9" alt={product.name} />
      </div>
      <div className="product-card__info">
        <h4 className="product-card__name">{product.name}</h4>
        {product.unit && <span className="product-card__unit">{product.unit}</span>}
        {product.description && <p className="product-card__desc">{product.description}</p>}
        {discount ? (
          <span className="product-card__price-row">
            <span className="product-card__discount">{discount}% OFF</span>
            <span className="product-card__price">{formatRupees(product.price)}</span>
            <span className="product-card__mrp">{formatRupees(product.mrp!)}</span>
          </span>
        ) : (
          <span className="product-card__price">{formatRupees(product.price)}</span>
        )}
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
