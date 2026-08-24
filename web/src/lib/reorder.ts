import type { Product } from '@shared/types';
import { fetchProductById } from './catalog';
import type { TrackedOrderItem } from './tracking';

export interface ReorderResult {
  lines: { product: Product; quantity: number }[];
  /** Names of items that could not be re-added, for telling the customer. */
  missing: string[];
}

/**
 * Rebuilds a past order's basket from the current catalogue.
 *
 * Prices, availability and even the photo are taken fresh rather than from the
 * order. An order is a receipt — it records what something cost that day — and
 * refilling a cart from it would quote a price the shop no longer charges and
 * happily re-add something withdrawn since.
 *
 * Anything that has disappeared is reported by name rather than dropped
 * silently, because a customer who ordered five things and receives four has
 * been let down twice.
 */
export async function rebuildOrder(items: TrackedOrderItem[]): Promise<ReorderResult> {
  const found = await Promise.all(
    items.map(async (item) => {
      try {
        const product = await fetchProductById(item.id);
        return { item, product };
      } catch {
        return { item, product: null };
      }
    })
  );

  const lines: { product: Product; quantity: number }[] = [];
  const missing: string[] = [];

  for (const { item, product } of found) {
    if (product && product.isAvailable) {
      lines.push({ product, quantity: Math.max(1, item.quantity) });
    } else {
      missing.push(item.name);
    }
  }

  return { lines, missing };
}

/** What to tell the customer about anything that could not be re-added. */
export function describeMissing(missing: string[]): string | null {
  if (missing.length === 0) return null;
  const names = missing.join(', ');
  return missing.length === 1
    ? `${names} is no longer available, so it wasn't added.`
    : `${names} are no longer available, so they weren't added.`;
}
