import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchShopPage, type ShopPage } from '../lib/catalog';
import { categoryPalette } from '@shared/tokens';
import type { Product } from '@shared/types';
import { Thumb } from '../components/ui/Thumb';
import { ProductCard } from '../components/cards/ProductCard';
import { ItemFilters } from '../components/ui/ItemFilters';
import {
  applyProductFilters,
  DEFAULT_PRODUCT_FILTERS,
  type ProductFilters,
} from '@shared/productFilters';
import { useCartStore, selectCount, selectSubtotal } from '../store/cartStore';
import { getShopImage } from '../lib/images';
import { formatRupees } from '../lib/format';
import './ShopItems.css';

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
  const [page, setPage] = useState<ShopPage | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  const [loading, setLoading] = useState(true);

  const count = useCartStore((s) => selectCount(s.items));
  const subtotal = useCartStore((s) => selectSubtotal(s.items));

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchShopPage(shopId)
      .then((p) => active && setPage(p))
      .catch(() => active && setPage(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [shopId]);

  if (loading) {
    return <div className="container shopitems__empty"><p>Loading…</p></div>;
  }

  if (!page) {
    return (
      <div className="container shopitems__empty">
        <h2>Shop not found</h2>
        <Link to="/" className="btn btn-primary btn-md">Back to Home</Link>
      </div>
    );
  }

  const { shop, products } = page;
  const pal = categoryPalette[shop.categoryKey];
  // Filtered before grouping, so a section that empties out disappears with its
  // heading rather than leaving a title over nothing.
  const sections = groupBySection(applyProductFilters(products, filters));

  return (
    <div className="shopitems">

      <div className="container">
        <Link to="/" className="shopitems__back">← Back</Link>
        <div className="shopitems__header">
          <div className="shopitems__thumb">
            <Thumb
              src={shop.imageUrl ?? getShopImage(shop.id)}
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
              {shop.rating > 0 && <span className="shopitems__rating">★ {shop.rating.toFixed(1)}</span>}
              {shop.deliveryTime && <span>⏱ {shop.deliveryTime}</span>}
              {shop.subCategory && <span className="shopitems__tag">{shop.subCategory}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="container shopitems__menu">
        <ItemFilters filters={filters} onChange={setFilters} />

        {products.length === 0 ? (
          <p className="shopitems__none">No items here yet — check back soon!</p>
        ) : Object.keys(sections).length === 0 ? (
          <p className="shopitems__none">Nothing matches those filters.</p>
        ) : (
          Object.entries(sections).map(([section, items]) => (
            <div key={section} className="menu-section">
              <h3 className="menu-section__title">{section}</h3>
              <div className="menu-section__list">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

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
