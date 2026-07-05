/**
 * lib/catalog.ts
 * --------------------------------------------------------------------------
 * The mobile app's read-only catalog layer — a mirror of web/src/lib/catalog.ts.
 * Fetches live data from Supabase (anon key + public RLS / *_catalog views) and
 * maps snake_case DB rows into the camelCase shared types the screens speak, so
 * the app shows exactly what the admin panel has (same as the website).
 */
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
  retail_price: number;
  image_url: string | null;
  subcategory_id?: string | null;
  shop_category_id?: string | null;
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

function mapProduct(row: ProdRow, shopId: string, section?: string): Product {
  return {
    id: row.id,
    shopId,
    name: row.name,
    description: row.description ?? undefined,
    price: Number(row.retail_price),
    imageUrl: row.image_url ?? undefined,
    isAvailable: true, // the *_catalog views only return active rows
    section,
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

/** A category + its items (each item's `section` = its subcategory name). */
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

  const { data: prods, error } = await supabase
    .from('products_catalog')
    .select('id,name,description,retail_price,image_url,subcategory_id')
    .eq('category_id', category.id)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const products = (prods ?? []).map((p) =>
    mapProduct(p as ProdRow, category.id, p.subcategory_id ? subName[p.subcategory_id] : undefined),
  );
  return { category, products };
}

export interface ShopPage {
  shop: Shop;
  products: Product[];
}

/** A shop + its items: the shop's own products plus any category items linked to it. */
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

  const [own, linked] = await Promise.all([
    supabase.from('shop_products_catalog').select('id,name,description,retail_price,image_url,shop_category_id').eq('shop_id', shopId),
    supabase.from('products_catalog').select('id,name,description,retail_price,image_url,shop_category_id').eq('shop_id', shopId),
  ]);
  if (own.error) throw own.error;
  if (linked.error) throw linked.error;

  const toProduct = (p: ProdRow) =>
    mapProduct(p, shop.id, p.shop_category_id ? scName[p.shop_category_id] : undefined);

  return {
    shop,
    products: [...(own.data ?? []).map((p) => toProduct(p as ProdRow)), ...(linked.data ?? []).map((p) => toProduct(p as ProdRow))],
  };
}
