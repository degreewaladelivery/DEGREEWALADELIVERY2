import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCategoryPage, type CategoryPage } from '../lib/catalog';
import { ProductCard } from '../components/cards/ProductCard';
import { ItemFilters } from '../components/ui/ItemFilters';
import {
  applyProductFilters,
  DEFAULT_PRODUCT_FILTERS,
  type ProductFilters,
} from '@shared/productFilters';
import { SkeletonRows } from '../components/ui/Skeleton';
import './ShopList.css';

const BRAND = '#FF6B00';

export function ShopList() {
  const { key = '' } = useParams();
  const [loaded, setLoaded] = useState<{ key: string; page: CategoryPage | null } | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_PRODUCT_FILTERS);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchCategoryPage(key)
      .then((p) => active && setLoaded({ key, page: p }))
      .catch(() => active && setLoaded({ key, page: null }));
    return () => {
      active = false;
    };
  }, [key]);

  const loading = loaded?.key !== key;
  const page = loaded?.key === key ? loaded.page : null;

  if (loading) {
    return (
      <div className="container shoplist__body">
        <SkeletonRows count={7} />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="container shoplist__empty">
        <h2>Category not found</h2>
        <Link to="/" className="btn btn-primary btn-md">Back to Home</Link>
      </div>
    );
  }

  const { category, products } = page;
  const currentSub = activeSub && category.subCategories.includes(activeSub) ? activeSub : null;
  const withinSection = currentSub ? products.filter((p) => p.section === currentSub) : products;
  const items = applyProductFilters(withinSection, filters);

  return (
    <div className="shoplist">

      <div
        className="shoplist__banner"
        style={
          category.imageUrl
            ? {
                backgroundImage: `linear-gradient(135deg, ${BRAND}e6, rgba(15,20,30,0.6)), url("${category.imageUrl}")`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { background: `linear-gradient(135deg, ${BRAND}, ${BRAND}cc)` }
        }
      >
        <div className="container shoplist__banner-inner">
          <Link to="/" className="shoplist__back">← Home</Link>
          <span className="shoplist__emoji">{category.emoji}</span>
          <h1 className="shoplist__title">{category.name}</h1>
          <p className="shoplist__count">{products.length} item{products.length === 1 ? '' : 's'} available</p>
        </div>
      </div>

      <div className="container shoplist__body">

        {category.subCategories.length > 0 && (
          <div className="subcat-row">
            <button
              className={'subcat' + (currentSub === null ? ' is-active' : '')}
              onClick={() => setActiveSub(null)}
            >
              All
            </button>
            {category.subCategories.map((sub) => (
              <button
                key={sub}
                className={'subcat' + (currentSub === sub ? ' is-active' : '')}
                onClick={() => setActiveSub(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <ItemFilters filters={filters} onChange={setFilters} />

        {items.length === 0 ? (
          <p className="shoplist__none">
            {products.length === 0
              ? 'No items here yet — check back soon!'
              : 'Nothing matches those filters.'}
          </p>
        ) : (
          <div className="shoplist__items">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
