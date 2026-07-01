import { Link, useParams } from 'react-router-dom';
import { getProductsByShop, getShopById } from '@shared/mockData';
import { categoryPalette } from '@shared/tokens';
import type { Product } from '@shared/types';
import { Thumb } from '../components/ui/Thumb';
import { ProductCard } from '../components/cards/ProductCard';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { getShopImage } from '../lib/images';
import { formatRupees } from '../lib/format';
import './ShopItems.css';

/** Group products into their menu sections, preserving order. */
function groupBySection(products: Product[]): Record<string, Product[]> {
  const groups: Record<string, Product[]> = {};
  for (const p of products) {
    const key = p.section ?? 'Menu';
    (groups[key] ??= []).push(p);
  }
  return groups;
}

export function ShopItems() {
  const { shopId = '' } = useParams();
  const shop = getShopById(shopId);

  // Cart bar state (only relevant for the current shop).
  const count = useCartStore((s) => selectCount(s.items));
  const subtotal = useCartStore((s) => selectSubtotal(s.items));

  if (!shop) {
    return (
      <div className="container shopitems__empty">
        <h2>Shop not found</h2>
        <Link to="/" className="btn btn-primary btn-md">Back to Home</Link>
      </div>
    );
  }

  const pal = categoryPalette[shop.categoryKey];
  const sections = groupBySection(getProductsByShop(shop.id));

  return (
    <div className="shopitems">
      {/* Shop header */}
      <div className="container">
        <Link to={`/category/${shop.categoryKey}`} className="shopitems__back">← Back</Link>
        <div className="shopitems__header">
          <div className="shopitems__thumb">
            <Thumb
              src={getShopImage(shop.id)}
              emoji={pal.emoji}
              tint={pal.tint}
              color={pal.border}
              alt={shop.name}
              fontSize={52}
            />
          </div>
          <div className="shopitems__meta">
            <h1>{shop.name}</h1>
            {shop.description && <p className="shopitems__desc">{shop.description}</p>}
            <div className="shopitems__facts">
              <span className="shopitems__rating">★ {shop.rating.toFixed(1)}</span>
              <span>⏱ {shop.deliveryTime}</span>
              {shop.subCategory && <span className="shopitems__tag">{shop.subCategory}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Menu, grouped by section */}
      <div className="container shopitems__menu">
        {Object.entries(sections).map(([section, items]) => (
          <div key={section} className="menu-section">
            <h3 className="menu-section__title">{section}</h3>
            <div className="menu-section__list">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky cart bar */}
      {count > 0 && (
        <div className="cart-bar">
          <div className="container cart-bar__inner">
            <div className="cart-bar__info">
              <strong>{count} item{count > 1 ? 's' : ''}</strong>
              <span>{formatRupees(subtotal)} + taxes</span>
            </div>
            <Link to="/cart" className="btn btn-light btn-md cart-bar__btn">
              View Cart →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
