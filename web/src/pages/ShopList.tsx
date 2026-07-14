import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCategoryPage, type CategoryPage } from '../lib/catalog';
import { ProductCard } from '../components/cards/ProductCard';
import './ShopList.css';

const BRAND = '#FF6B00';

export function ShopList() {
  const { key = '' } = useParams();
  const [page, setPage] = useState<CategoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setActiveSub(null);
    fetchCategoryPage(key)
      .then((p) => active && setPage(p))
      .catch(() => active && setPage(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [key]);

  if (loading) {
    return <div className="container shoplist__empty"><p>Loading…</p></div>;
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
  const items = activeSub ? products.filter((p) => p.section === activeSub) : products;

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
              className={'subcat' + (activeSub === null ? ' is-active' : '')}
              onClick={() => setActiveSub(null)}
            >
              All
            </button>
            {category.subCategories.map((sub) => (
              <button
                key={sub}
                className={'subcat' + (activeSub === sub ? ' is-active' : '')}
                onClick={() => setActiveSub(sub)}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <p className="shoplist__none">No items here yet — check back soon!</p>
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
