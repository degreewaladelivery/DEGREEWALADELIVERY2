import { Link } from 'react-router-dom';
import type { Shop } from '@shared/types';
import { categoryPalette } from '@shared/tokens';
import { Thumb } from '../ui/Thumb';
import { getShopImage } from '../../lib/images';
import './ShopCard.css';

/** A shop tile used in the featured row and the shop-list grid. */
export function ShopCard({ shop }: { shop: Shop }) {
  const pal = categoryPalette[shop.categoryKey];

  return (
    <Link to={`/shop/${shop.id}`} className="shop-card">
      <div className="shop-card__thumb">
        <Thumb
          src={shop.imageUrl ?? getShopImage(shop.id)}
          emoji={pal.emoji}
          tint={pal.tint}
          color={pal.border}
          alt={shop.name}
          fontSize={46}
        />
        <span className="shop-card__time">⏱ {shop.deliveryTime}</span>
        {shop.subCategory && <span className="shop-card__tag">{shop.subCategory}</span>}
      </div>

      <div className="shop-card__body">
        <div className="shop-card__row">
          <h3 className="shop-card__name">{shop.name}</h3>
          <span className="shop-card__rating">★ {shop.rating.toFixed(1)}</span>
        </div>
        {shop.description && <p className="shop-card__desc">{shop.description}</p>}
      </div>
    </Link>
  );
}
