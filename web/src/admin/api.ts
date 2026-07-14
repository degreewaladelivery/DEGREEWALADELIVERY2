import { supabase } from '../lib/supabase';
import type { CategoryRow, SubcategoryRow, ProductRow, ShopRow, ShopCategoryRow, ShopProductRow } from './types';

/* ---- Categories ----------------------------------------------------------- */

export async function listCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export interface CategoryInput {
  name: string;
  image_url: string | null;
  offer_badge: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function createCategory(input: CategoryInput): Promise<CategoryRow> {
  const { data, error } = await supabase.from('categories').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id: string, input: Partial<CategoryInput>): Promise<CategoryRow> {
  const { data, error } = await supabase.from('categories').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

/* ---- Subcategories ---------------------------------------------------------- */

export async function listSubcategories(categoryId: string): Promise<SubcategoryRow[]> {
  const { data, error } = await supabase
    .from('subcategories')
    .select('*')
    .eq('category_id', categoryId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export interface SubcategoryInput {
  category_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function createSubcategory(input: SubcategoryInput): Promise<SubcategoryRow> {
  const { data, error } = await supabase.from('subcategories').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateSubcategory(id: string, input: Partial<SubcategoryInput>): Promise<SubcategoryRow> {
  const { data, error } = await supabase.from('subcategories').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSubcategory(id: string): Promise<void> {
  const { error } = await supabase.from('subcategories').delete().eq('id', id);
  if (error) throw error;
}

/* ---- Products (items) --------------------------------------------------- */

export async function listProducts(categoryId: string): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('category_id', categoryId)
    .order('serial_no', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export interface ProductInput {
  category_id: string;
  subcategory_id: string | null;
  shop_id: string | null;
  shop_category_id: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  serial_no: number;
  barcode: string | null;
  gst_percent: number;
  mrp: number;
  retail_price: number;
  image_url: string | null;
  is_active: boolean;
}

/** Category items that were linked to a shop (they also show in that shop). */
export async function listProductsLinkedToShop(shopId: string): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('shop_id', shopId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createProduct(input: ProductInput): Promise<ProductRow> {
  const { data, error } = await supabase.from('products').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, input: Partial<ProductInput>): Promise<ProductRow> {
  const { data, error } = await supabase.from('products').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

/* ---- Cross-listing an item into extra categories ------------------------- */

/** The extra categories an item is also shown in (not its primary category). */
export async function listProductExtraCategories(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).map((r) => r.category_id);
}

/** Replace an item's extra-category links with exactly `categoryIds`. */
export async function setProductExtraCategories(productId: string, categoryIds: string[]): Promise<void> {
  const del = await supabase.from('product_categories').delete().eq('product_id', productId);
  if (del.error) throw del.error;
  if (categoryIds.length === 0) return;
  const rows = categoryIds.map((category_id) => ({ product_id: productId, category_id }));
  const ins = await supabase.from('product_categories').insert(rows);
  if (ins.error) throw ins.error;
}

/* ============================================================================
 * Shops — independent of Category/Subcategory/Product above.
 * ========================================================================== */

export async function listShops(): Promise<ShopRow[]> {
  const { data, error } = await supabase.from('shops').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export interface ShopInput {
  name: string;
  image_url: string | null;
  description: string | null;
  rating: number | null;
  delivery_time: string | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
}

export async function createShop(input: ShopInput): Promise<ShopRow> {
  const { data, error } = await supabase.from('shops').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateShop(id: string, input: Partial<ShopInput>): Promise<ShopRow> {
  const { data, error } = await supabase.from('shops').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteShop(id: string): Promise<void> {
  const { error } = await supabase.from('shops').delete().eq('id', id);
  if (error) throw error;
}

/* ---- A shop's own categories ------------------------------------------------ */

export async function listShopCategories(shopId: string): Promise<ShopCategoryRow[]> {
  const { data, error } = await supabase
    .from('shop_categories')
    .select('*')
    .eq('shop_id', shopId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export interface ShopCategoryInput {
  shop_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export async function createShopCategory(input: ShopCategoryInput): Promise<ShopCategoryRow> {
  const { data, error } = await supabase.from('shop_categories').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateShopCategory(id: string, input: Partial<ShopCategoryInput>): Promise<ShopCategoryRow> {
  const { data, error } = await supabase.from('shop_categories').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteShopCategory(id: string): Promise<void> {
  const { error } = await supabase.from('shop_categories').delete().eq('id', id);
  if (error) throw error;
}

/* ---- A shop's items --------------------------------------------------------- */

export async function listShopProducts(shopId: string): Promise<ShopProductRow[]> {
  const { data, error } = await supabase
    .from('shop_products')
    .select('*')
    .eq('shop_id', shopId)
    .order('serial_no', { ascending: true })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export interface ShopProductInput {
  shop_id: string;
  shop_category_id: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  serial_no: number;
  barcode: string | null;
  gst_percent: number;
  mrp: number;
  retail_price: number;
  image_url: string | null;
  is_active: boolean;
}

export async function createShopProduct(input: ShopProductInput): Promise<ShopProductRow> {
  const { data, error } = await supabase.from('shop_products').insert(input).select().single();
  if (error) throw error;
  return data;
}

export async function updateShopProduct(id: string, input: Partial<ShopProductInput>): Promise<ShopProductRow> {
  const { data, error } = await supabase.from('shop_products').update(input).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteShopProduct(id: string): Promise<void> {
  const { error } = await supabase.from('shop_products').delete().eq('id', id);
  if (error) throw error;
}

/* ---- Image upload --------------------------------------------------------- */

/** Uploads to the public `catalog-images` bucket and returns its public URL. */
export async function uploadCatalogImage(
  file: File,
  folder: 'categories' | 'subcategories' | 'products' | 'shops' | 'shop-categories' | 'shop-products'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('catalog-images').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('catalog-images').getPublicUrl(path);
  return data.publicUrl;
}
