import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCategoryByKey, getShopsByCategory } from '@shared/mockData';
import { ShopCard } from '../components/cards/ShopCard';
import './ShopList.css';

export function ShopList() {
  const { key = '' } = useParams();
  const category = getCategoryByKey(key);
  const [activeSub, setActiveSub] = useState<string | null>(null);

  if (!category) {
    return (
      <div className="container shoplist__empty">
        <h2>Category not found</h2>
        <Link to="/" className="btn btn-primary btn-md">Back to Home</Link>
      </div>
    );
  }

  const allShops = getShopsByCategory(category.key);
  const shops = activeSub
    ? allShops.filter((s) => s.subCategory === activeSub)
    : allShops;

  return (
    <div className="shoplist">
      {/* Category banner */}
      <div
        className="shoplist__banner"
        style={{ background: `linear-gradient(135deg, ${category.color}, ${category.color}cc)` }}
      >
        <div className="container shoplist__banner-inner">
          <Link to="/" className="shoplist__back">← Home</Link>
          <span className="shoplist__emoji">{category.emoji}</span>
          <h1 className="shoplist__title">{category.name}</h1>
          <p className="shoplist__count">{allShops.length} shops near Balehonnuru</p>
        </div>
      </div>

      <div className="container shoplist__body">
        {/* Sub-category picker (Veg/Non-Veg, Chicken/Mutton/Pork, Petrol/Diesel…) */}
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

        {shops.length === 0 ? (
          <p className="shoplist__none">No shops here yet — check back soon!</p>
        ) : (
          <div className="shoplist__grid">
            {shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
