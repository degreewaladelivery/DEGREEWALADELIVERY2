import { SORT_LABELS, type ProductFilters, type ProductSort } from '@shared/productFilters';
import './ItemFilters.css';

const SORTS = Object.keys(SORT_LABELS) as Exclude<ProductSort, 'default'>[];

/**
 * Sort and stock controls for a list of items.
 *
 * Every option is a visible toggle rather than a menu behind a "Filters" button:
 * there are only four of them, and a control whose state you can see beats one
 * you have to open to find out what it is currently doing.
 */
export function ItemFilters({
  filters,
  onChange,
}: {
  filters: ProductFilters;
  onChange: (next: ProductFilters) => void;
}) {
  return (
    <div className="item-filters" role="group" aria-label="Sort and filter items">
      <button
        type="button"
        className={'item-filters__chip' + (filters.inStockOnly ? ' is-active' : '')}
        aria-pressed={filters.inStockOnly}
        onClick={() => onChange({ ...filters, inStockOnly: !filters.inStockOnly })}
      >
        In stock
      </button>

      {SORTS.map((sort) => (
        <button
          key={sort}
          type="button"
          className={'item-filters__chip' + (filters.sort === sort ? ' is-active' : '')}
          aria-pressed={filters.sort === sort}
          // Clicking the active sort clears it, so there is always a way back to
          // the catalogue's own order without hunting for a "reset".
          onClick={() =>
            onChange({ ...filters, sort: filters.sort === sort ? 'default' : sort })
          }
        >
          {SORT_LABELS[sort]}
        </button>
      ))}
    </div>
  );
}
