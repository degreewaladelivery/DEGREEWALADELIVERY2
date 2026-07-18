import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchProductById } from '../lib/catalog';
import type { Product } from '@shared/types';
import { useCartStore } from '../store/cartStore';
import { formatRupees } from '../lib/format';
import './ItemDetailPage.css';

export function ItemDetailPage() {
  const { id = '' } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const qty = useCartStore((s) => (product ? s.items[product.id]?.quantity ?? 0 : 0));
  const addItem = useCartStore((s) => s.addItem);
  const decrement = useCartStore((s) => s.decrement);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchProductById(id)
      .then((p) => active && setProduct(p))
      .catch(() => active && setProduct(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  if (loading) {
    return <div className="container itemdetail__empty"><p>Loading…</p></div>;
  }

  if (!product) {
    return (
      <div className="container itemdetail__empty">
        <h2>Item not found</h2>
        <Link to="/" className="btn btn-primary btn-md">Back to Home</Link>
      </div>
    );
  }

  const unavailable = !product.isAvailable;

  return (
    <div className="itemdetail">
      <div className="container itemdetail__inner">
        <Link to="/" className="itemdetail__back">← Home</Link>

        <div className="itemdetail__card">
          <div className="itemdetail__imgwrap">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} className="itemdetail__img" />
            ) : (
              <div className="itemdetail__imgfallback" aria-hidden="true">🛒</div>
            )}
          </div>

          <div className="itemdetail__body">
            <h1 className="itemdetail__name">{product.name}</h1>
            {product.unit && <span className="itemdetail__unit">{product.unit}</span>}

            <div className="itemdetail__price">{formatRupees(product.price)}</div>

            <div className="itemdetail__cart">
              {unavailable ? (
                <span className="itemdetail__soldout">Currently unavailable</span>
              ) : qty === 0 ? (
                <button className="itemdetail__addbtn" onClick={() => addItem(product)}>
                  Add to Cart
                </button>
              ) : (
                <div className="itemdetail__stepper">
                  <button onClick={() => decrement(product.id)} aria-label="Decrease quantity">−</button>
                  <span>{qty}</span>
                  <button onClick={() => addItem(product)} aria-label="Increase quantity">+</button>
                </div>
              )}
            </div>

            {product.description && (
              <div className="itemdetail__desc">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
