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

function findByName(map: Record<string, string>, name: string): string | undefined {
  for (const [path, url] of Object.entries(map)) {
    const file = path.split('/').pop() ?? '';
    const base = file.replace(/\.[^.]+$/, '');
    if (base === name) return url;
  }
  return undefined;
}

export const getCategoryImage = (key: string) => findByName(categoryImages, key);

export const getShopImage = (shopId: string) => findByName(shopImages, shopId);

export const getBrandImage = (name: string) => findByName(brandImages, name);
