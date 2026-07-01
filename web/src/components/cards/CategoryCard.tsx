import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Category } from '@shared/types';
import { Thumb } from '../ui/Thumb';
import { getCategoryImage } from '../../lib/images';
import './CategoryCard.css';

interface CategoryCardProps {
  category: Category;
  /** Live count of shops in this category (shown as a small badge). */
  count: number;
}

/** A single tile in the "Top Categories" grid. Clicking opens the shop list. */
export function CategoryCard({ category, count }: CategoryCardProps) {
  // Pass the category's palette into CSS via custom properties.
  const styleVars = {
    '--cat-color': category.color,
    '--cat-tint': category.tint,
  } as CSSProperties;

  return (
    <Link to={`/category/${category.key}`} className="cat-card" style={styleVars}>
      {count > 0 && <span className="cat-card__count">{count} shops</span>}
      <div className="cat-card__thumb">
        <Thumb
          src={getCategoryImage(category.key)}
          emoji={category.emoji}
          tint={category.tint}
          color={category.color}
          alt={category.name}
          fontSize={44}
        />
      </div>
      <div className="cat-card__body">
        <h3 className="cat-card__name">{category.name}</h3>
        <span className="cat-card__cta">
          Order Now <span className="cat-card__arrow">→</span>
        </span>
      </div>
    </Link>
  );
}
