import type { Product } from './types';

export type ProductSort = 'default' | 'price-asc' | 'price-desc' | 'name-asc';

export interface ProductFilters {
  sort: ProductSort;
  /** Hide anything the shop has marked unavailable. */
  inStockOnly: boolean;
}

export const DEFAULT_PRODUCT_FILTERS: ProductFilters = {
  sort: 'default',
  inStockOnly: false,
};

export const SORT_LABELS: Record<Exclude<ProductSort, 'default'>, string> = {
  'price-asc': 'Price ↑',
  'price-desc': 'Price ↓',
  'name-asc': 'A–Z',
};

export function hasActiveFilters(filters: ProductFilters): boolean {
  return filters.sort !== 'default' || filters.inStockOnly;
}

/**
 * Orders and narrows a product list.
 *
 * Sold-out items always sink to the bottom, whatever the sort. Sorting by price
 * and landing on something that cannot be bought is a worse answer than the
 * cheapest thing that can be, and it costs the customer a tap to find out.
 * They are still shown — knowing a shop stocks it at all is useful — just not
 * ahead of everything purchasable.
 *
 * Never mutates the input: these lists come straight from state, and sorting in
 * place would reorder what the caller still holds.
 */
export function applyProductFilters(products: Product[], filters: ProductFilters): Product[] {
  const visible = filters.inStockOnly ? products.filter((p) => p.isAvailable) : products;

  const compare = (a: Product, b: Product): number => {
    if (a.isAvailable !== b.isAvailable) return a.isAvailable ? -1 : 1;
    switch (filters.sort) {
      case 'price-asc':
        return a.price - b.price;
      case 'price-desc':
        return b.price - a.price;
      case 'name-asc':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  };

  // Copied before sorting, and a stable sort keeps the catalogue's own order
  // wherever the comparison ties — so "default" is genuinely untouched apart
  // from sold-out items moving down.
  return [...visible].sort(compare);
}
