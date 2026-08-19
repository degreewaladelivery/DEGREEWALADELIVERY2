import { supabase } from './supabase';
import { categoryPalette } from '@shared/tokens';
import type { Category, Shop, Product, CategoryKey } from '@shared/types';

interface CatRow {
  id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}
interface ShopRow {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  rating: number | null;
  delivery_time: string | null;
  is_featured: boolean;
  is_active: boolean;
}
interface ProdRow {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  serial_no: number;
  retail_price: number;
  image_url: string | null;
  subcategory_id?: string | null;
  shop_category_id?: string | null;
  category_id?: string | null;
  shop_id?: string | null;
}

export function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const DEFAULT_PALETTE = { emoji: '🏬', tint: '#F4F6F9', border: '#FF6B00' };

function paletteFor(name: string) {
  const pal = (categoryPalette as Record<string, { emoji: string; tint: string; border: string }>)[slugify(name)];
  return pal ?? DEFAULT_PALETTE;
}

function mapCategory(row: CatRow, subCategories: string[]): Category {
  const pal = paletteFor(row.name);
  return {
    id: row.id,
    key: slugify(row.name) as CategoryKey,
    name: row.name,
    emoji: pal.emoji,
    color: pal.border,
    tint: pal.tint,
    imageUrl: row.image_url ?? undefined,
    subCategories,
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function mapShop(row: ShopRow): Shop {
  return {
    id: row.id,
    name: row.name,

    categoryKey: 'food' as CategoryKey,
    description: row.description ?? undefined,
    imageUrl: row.image_url ?? undefined,
    rating: row.rating ?? 0,
    deliveryTime: row.delivery_time ?? '',
    isActive: row.is_active,
    isFeatured: row.is_featured,
  };
}

function mapProduct(
  row: ProdRow,
  shopId: string,
  section?: string,
  isShopProduct = false
): Product {
  return {
    id: row.id,
    shopId,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.retail_price),
    imageUrl: row.image_url ?? undefined,
    unit: row.unit ?? undefined,
    isAvailable: true,
    section,
    isShopProduct,
  };
}

export async function fetchCategories(): Promise<Category[]> {
  const [cats, subs] = await Promise.all([
    supabase.from('categories').select('id,name,image_url,sort_order,is_active').eq('is_active', true).order('sort_order'),
    supabase.from('subcategories').select('id,category_id,name,is_active').eq('is_active', true).order('sort_order'),
  ]);
  if (cats.error) throw cats.error;
  if (subs.error) throw subs.error;

  const namesByCat: Record<string, string[]> = {};
  for (const s of subs.data ?? []) (namesByCat[s.category_id] ??= []).push(s.name);
  return (cats.data ?? []).map((c) => mapCategory(c as CatRow, namesByCat[c.id] ?? []));
}

export async function fetchCategoryItemCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('products_catalog').select('category_id');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const p of data ?? []) if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
  return counts;
}

export async function fetchShops(): Promise<Shop[]> {
  const { data, error } = await supabase
    .from('shops')
    .select('id,name,image_url,description,rating,delivery_time,is_featured,is_active')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []).map((s) => mapShop(s as ShopRow));
}

export interface CategoryPage {
  category: Category;
  products: Product[];
}

export async function fetchCategoryPage(keyOrId: string): Promise<CategoryPage | null> {
  const categories = await fetchCategories();
  const category = categories.find((c) => c.id === keyOrId || c.key === keyOrId);
  if (!category) return null;

  const { data: subs } = await supabase
    .from('subcategories')
    .select('id,name')
    .eq('category_id', category.id)
    .eq('is_active', true);
  const subName: Record<string, string> = {};
  for (const s of subs ?? []) subName[s.id] = s.name;

  const cols = 'id,name,description,unit,serial_no,retail_price,image_url,subcategory_id';
  const { data: prods, error } = await supabase
    .from('products_catalog')
    .select(cols)
    .eq('category_id', category.id);
  if (error) throw error;

  const { data: links } = await supabase
    .from('product_categories')
    .select('product_id')
    .eq('category_id', category.id);
  const extraIds = (links ?? []).map((l) => l.product_id);
  let extra: ProdRow[] = [];
  if (extraIds.length > 0) {
    const { data: extraProds } = await supabase.from('products_catalog').select(cols).in('id', extraIds);
    extra = (extraProds ?? []) as ProdRow[];
  }

  const seen = new Set<string>();
  const products = [...((prods ?? []) as ProdRow[]), ...extra]
    .filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
    .sort((a, b) => a.serial_no - b.serial_no)
    .map((p) => mapProduct(p, category.id, p.subcategory_id ? subName[p.subcategory_id] : undefined, false));
  return { category, products };
}

export async function searchProducts(term: string): Promise<Product[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
  const catCols = 'id,name,description,unit,serial_no,retail_price,image_url,category_id,shop_id';
  const shopCols = 'id,name,description,unit,serial_no,retail_price,image_url,shop_id';

  const [fromCategories, fromShops] = await Promise.all([
    supabase.from('products_catalog').select(catCols).ilike('name', pattern).limit(60),
    supabase.from('shop_products_catalog').select(shopCols).ilike('name', pattern).limit(60),
  ]);
  if (fromCategories.error) throw fromCategories.error;
  if (fromShops.error) throw fromShops.error;

  const seen = new Set<string>();
  const lowered = trimmed.toLowerCase();

  return [...((fromCategories.data ?? []) as ProdRow[]), ...((fromShops.data ?? []) as ProdRow[])]
    .filter((row) => (seen.has(row.id) ? false : (seen.add(row.id), true)))
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowered) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(lowered) ? 0 : 1;
      return aStarts !== bStarts ? aStarts - bStarts : a.name.localeCompare(b.name);
    })
    .map((row) => {
      // Same priority the shopId itself uses: a category product stays a
      // category product even if it also happens to carry a shop_id.
      const isShopProduct = row.category_id == null && row.shop_id != null;
      return mapProduct(row, row.category_id ?? row.shop_id ?? row.id, undefined, isShopProduct);
    });
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const catCols = 'id,name,description,unit,retail_price,image_url,category_id,shop_id';
  const cat = await supabase.from('products_catalog').select(catCols).eq('id', id).maybeSingle();
  if (cat.error) throw cat.error;
  if (cat.data) {
    const row = cat.data as ProdRow;
    const parentId = row.category_id ?? row.shop_id ?? row.id;
    return mapProduct(row, parentId, undefined, false);
  }

  const shopCols = 'id,name,description,unit,retail_price,image_url,shop_id';
  const shop = await supabase.from('shop_products_catalog').select(shopCols).eq('id', id).maybeSingle();
  if (shop.error) throw shop.error;
  if (shop.data) {
    const row = shop.data as ProdRow;
    return mapProduct(row, row.shop_id ?? row.id, undefined, true);
  }

  return null;
}

export interface ShopPage {
  shop: Shop;
  products: Product[];
}

export async function fetchShopPage(shopId: string): Promise<ShopPage | null> {
  const { data: shopRow, error } = await supabase
    .from('shops')
    .select('id,name,image_url,description,rating,delivery_time,is_featured,is_active')
    .eq('id', shopId)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  if (!shopRow) return null;
  const shop = mapShop(shopRow as ShopRow);

  const { data: scats } = await supabase
    .from('shop_categories')
    .select('id,name')
    .eq('shop_id', shopId)
    .eq('is_active', true);
  const scName: Record<string, string> = {};
  for (const s of scats ?? []) scName[s.id] = s.name;

  const shopCols = 'id,name,description,unit,serial_no,retail_price,image_url,shop_category_id';
  const [own, linked] = await Promise.all([
    supabase.from('shop_products_catalog').select(shopCols).eq('shop_id', shopId),
    supabase.from('products_catalog').select(shopCols).eq('shop_id', shopId),
  ]);
  if (own.error) throw own.error;
  if (linked.error) throw linked.error;

  const products = [...((own.data ?? []) as ProdRow[]), ...((linked.data ?? []) as ProdRow[])]
    .sort((a, b) => a.serial_no - b.serial_no)
    .map((p) => mapProduct(p, shop.id, p.shop_category_id ? scName[p.shop_category_id] : undefined, true));

  return { shop, products };
}
