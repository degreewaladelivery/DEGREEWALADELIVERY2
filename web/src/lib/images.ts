/**
 * lib/images.ts
 * --------------------------------------------------------------------------
 * Loads whatever images you've dropped into src/assets/*, WITHOUT breaking
 * the build when a file is missing.
 *
 * `import.meta.glob` is a Vite feature that finds files matching a pattern at
 * build time. If a folder is empty, it just returns {} — so the UI falls back
 * to the emoji tiles until you add your photos. The moment you drop in a file
 * named correctly (see assets/README.md), it appears automatically.
 */

// eager: load now (not lazily). query '?url' + import 'default' => give us the URL string.
const categoryImages = import.meta.glob('../assets/categories/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const shopImages = import.meta.glob('../assets/shops/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const brandImages = import.meta.glob('../assets/brand/*.{jpg,jpeg,png,webp,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

/** Find an image whose filename (without extension) matches `name`. */
function findByName(map: Record<string, string>, name: string): string | undefined {
  for (const [path, url] of Object.entries(map)) {
    const file = path.split('/').pop() ?? '';
    const base = file.replace(/\.[^.]+$/, '');
    if (base === name) return url;
  }
  return undefined;
}

/** Photo for a category, e.g. assets/categories/food.jpg -> by key "food". */
export const getCategoryImage = (key: string) => findByName(categoryImages, key);

/** Photo for a shop, e.g. assets/shops/shop-parijata.jpg -> by shop id. */
export const getShopImage = (shopId: string) => findByName(shopImages, shopId);

/** Brand art, e.g. assets/brand/hero.png, assets/brand/app-phone.png. */
export const getBrandImage = (name: string) => findByName(brandImages, name);
