import { supabase } from '../lib/supabase';
import { notifyCustomer } from '@shared/notifyCustomer';
import { resizeForUpload } from './resizeImage';
import type {
  CategoryRow,
  CustomerRow,
  SubcategoryRow,
  ProductRow,
  ShopRow,
  ShopCategoryRow,
  ShopProductRow,
  AppSettingsRow,
  DeliveryAgentRow,
} from './types';
import type { ParsedItemRow } from './bulkItems';

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

export async function listProductExtraCategories(productId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('category_id')
    .eq('product_id', productId);
  if (error) throw error;
  return (data ?? []).map((r) => r.category_id);
}

export async function listProductsCrossListedTo(categoryId: string): Promise<ProductRow[]> {
  const links = await supabase.from('product_categories').select('product_id').eq('category_id', categoryId);
  if (links.error) throw links.error;
  const ids = (links.data ?? []).map((l) => l.product_id);
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids)
    .order('serial_no', { ascending: true });
  if (error) throw error;
  return data;
}

export async function setProductExtraCategories(productId: string, categoryIds: string[]): Promise<void> {
  const del = await supabase.from('product_categories').delete().eq('product_id', productId);
  if (del.error) throw del.error;
  if (categoryIds.length === 0) return;
  const rows = categoryIds.map((category_id) => ({ product_id: productId, category_id }));
  const ins = await supabase.from('product_categories').insert(rows);
  if (ins.error) throw ins.error;
}

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
  latitude: number | null;
  longitude: number | null;
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

export async function getAppSettings(): Promise<AppSettingsRow> {
  const { data, error } = await supabase.from('app_settings').select('*').single();
  if (error) throw error;
  return data;
}

export async function updateAppSettings(
  input: Partial<Pick<AppSettingsRow, 'pickup_latitude' | 'pickup_longitude'>>
): Promise<AppSettingsRow> {
  const { data, error } = await supabase.from('app_settings').update(input).eq('id', true).select().single();
  if (error) throw error;
  return data;
}

export interface BulkImportResult {
  created: number;
  updated: number;
}

function matchExisting<T extends { name: string; barcode: string | null }>(
  row: ParsedItemRow,
  byBarcode: Map<string, T>,
  byName: Map<string, T>
): T | undefined {
  const barcode = row.barcode.trim().toLowerCase();
  if (barcode) {
    const hit = byBarcode.get(barcode);
    if (hit) return hit;
  }
  return byName.get(row.name.trim().toLowerCase());
}

function indexExisting<T extends { name: string; barcode: string | null }>(items: T[]) {
  const byBarcode = new Map<string, T>();
  const byName = new Map<string, T>();
  for (const item of items) {
    if (item.barcode) byBarcode.set(item.barcode.trim().toLowerCase(), item);
    byName.set(item.name.trim().toLowerCase(), item);
  }
  return { byBarcode, byName };
}

function groupIdByName(groups: { id: string; name: string }[]) {
  const map = new Map<string, string>();
  for (const group of groups) map.set(group.name.trim().toLowerCase(), group.id);
  return map;
}

export interface ProductBulkLookups {
  subcategories: SubcategoryRow[];
  shops: ShopRow[];
  categories: CategoryRow[];
}

export async function bulkUpsertProducts(
  categoryId: string,
  rows: ParsedItemRow[],
  columns: string[],
  lookups: ProductBulkLookups
): Promise<BulkImportResult> {
  const existing = await listProducts(categoryId);
  const { byBarcode, byName } = indexExisting(existing);
  const subIds = groupIdByName(lookups.subcategories);
  const shopIds = groupIdByName(lookups.shops);
  const categoryIds = groupIdByName(lookups.categories);

  const syncShop = columns.includes('shopName');
  const syncExtraCategories = columns.includes('extraCategories');

  let nextSerial = existing.length ? Math.max(...existing.map((p) => p.serial_no)) + 1 : 1;

  const toInsert: (ProductInput & { id: string })[] = [];
  const toUpdate: (ProductInput & { id: string })[] = [];
  const linkPlan: { productId: string; categoryIds: string[] }[] = [];

  for (const row of rows) {
    const match = matchExisting(row, byBarcode, byName);
    const id = match?.id ?? crypto.randomUUID();

    const input: ProductInput = {
      category_id: categoryId,
      subcategory_id: row.groupName ? subIds.get(row.groupName.trim().toLowerCase()) ?? null : null,
      shop_id: syncShop
        ? row.shopName
          ? shopIds.get(row.shopName.trim().toLowerCase()) ?? null
          : null
        : match?.shop_id ?? null,
      shop_category_id: match?.shop_category_id ?? null,
      name: row.name,
      description: row.description || null,
      unit: row.unit || null,
      serial_no: row.serialNo ?? match?.serial_no ?? nextSerial++,
      barcode: row.barcode || null,
      gst_percent: row.gstPercent,
      mrp: row.mrp,
      retail_price: row.retailPrice,
      image_url: match?.image_url ?? null,
      is_active: row.isActive,
    };

    if (match) toUpdate.push({ ...input, id });
    else toInsert.push({ ...input, id });

    if (syncExtraCategories) {
      linkPlan.push({
        productId: id,
        categoryIds: row.extraCategoryNames
          .map((name) => categoryIds.get(name.trim().toLowerCase()))
          .filter((value): value is string => Boolean(value) && value !== categoryId),
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('products').insert(toInsert);
    if (error) throw error;
  }
  if (toUpdate.length > 0) {
    const { error } = await supabase.from('products').upsert(toUpdate);
    if (error) throw error;
  }

  if (linkPlan.length > 0) {
    const productIds = linkPlan.map((plan) => plan.productId);
    const cleared = await supabase.from('product_categories').delete().in('product_id', productIds);
    if (cleared.error) throw cleared.error;

    const linkRows = linkPlan.flatMap((plan) =>
      plan.categoryIds.map((category_id) => ({ product_id: plan.productId, category_id }))
    );
    if (linkRows.length > 0) {
      const { error } = await supabase.from('product_categories').insert(linkRows);
      if (error) throw error;
    }
  }

  return { created: toInsert.length, updated: toUpdate.length };
}

export async function bulkUpsertShopProducts(
  shopId: string,
  rows: ParsedItemRow[],
  shopCategories: ShopCategoryRow[]
): Promise<BulkImportResult> {
  const existing = await listShopProducts(shopId);
  const { byBarcode, byName } = indexExisting(existing);
  const groupIds = groupIdByName(shopCategories);

  let nextSerial = existing.length ? Math.max(...existing.map((p) => p.serial_no)) + 1 : 1;

  const toInsert: ShopProductInput[] = [];
  const toUpdate: (ShopProductInput & { id: string })[] = [];

  for (const row of rows) {
    const match = matchExisting(row, byBarcode, byName);
    const input: ShopProductInput = {
      shop_id: shopId,
      shop_category_id: row.groupName
        ? groupIds.get(row.groupName.trim().toLowerCase()) ?? null
        : null,
      name: row.name,
      description: row.description || null,
      unit: row.unit || null,
      serial_no: row.serialNo ?? match?.serial_no ?? nextSerial++,
      barcode: row.barcode || null,
      gst_percent: row.gstPercent,
      mrp: row.mrp,
      retail_price: row.retailPrice,
      image_url: match?.image_url ?? null,
      is_active: row.isActive,
    };
    if (match) toUpdate.push({ ...input, id: match.id });
    else toInsert.push(input);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from('shop_products').insert(toInsert);
    if (error) throw error;
  }
  if (toUpdate.length > 0) {
    const { error } = await supabase.from('shop_products').upsert(toUpdate);
    if (error) throw error;
  }

  return { created: toInsert.length, updated: toUpdate.length };
}

export async function listAgents(): Promise<DeliveryAgentRow[]> {
  const { data, error } = await supabase.from('delivery_agents').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Customers, newest first, with how many orders each has placed.
 *
 * The count comes back as a nested aggregate rather than a second query, so a
 * list of a few thousand customers stays one round trip.
 */
export async function listCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('id, name, email, phone, created_at, orders(count)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  type Raw = Omit<CustomerRow, 'orderCount'> & { orders?: { count: number }[] };
  return ((data ?? []) as Raw[]).map(({ orders, ...customer }) => ({
    ...customer,
    orderCount: orders?.[0]?.count ?? 0,
  }));
}

export interface CreateAgentInput {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export async function createAgent(input: CreateAgentInput): Promise<void> {
  const { data, error } = await supabase.functions.invoke('create-agent', { body: input });
  if (error || !data?.ok) {
    throw new Error(data?.error ?? error?.message ?? 'Could not create agent');
  }
}

export async function updateAgent(
  userId: string,
  input: Partial<Pick<DeliveryAgentRow, 'name' | 'phone' | 'is_active'>>
): Promise<DeliveryAgentRow> {
  const { data, error } = await supabase
    .from('delivery_agents')
    .update(input)
    .eq('user_id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAgent(userId: string): Promise<void> {
  const { error } = await supabase.from('delivery_agents').delete().eq('user_id', userId);
  if (error) throw error;
}

export async function uploadCatalogImage(
  file: File,
  folder:
    | 'categories'
    | 'subcategories'
    | 'products'
    | 'shops'
    | 'shop-categories'
    | 'shop-products'
    | 'banners'
): Promise<string> {
  // Shrink before storing: photos arrive at full camera resolution and nothing
  // ever draws them that large.
  const resized = await resizeForUpload(file);
  const ext = resized.name.split('.').pop() ?? 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('catalog-images').upload(path, resized, {
    // A year. The filename is a fresh UUID on every upload, so a stored image
    // never changes underneath a cached copy — the short TTL was only forcing
    // phones to re-download pictures that could not have changed.
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('catalog-images').getPublicUrl(path);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Orders needing a person
// ---------------------------------------------------------------------------

export interface AttentionOrder {
  id: string;
  status: string;
  customer_phone: string;
  pickup_label: string;
  delivery_address: string;
  total: number;
  release_count: number;
  stalled_at: string | null;
  claimed_at: string | null;
  picked_up_at: string | null;
  created_at: string;
  agent: { name: string; phone: string } | null;
}

/**
 * Orders the system couldn't finish on its own — picked up and never delivered,
 * or bounced between agents. Admins bypass agent RLS, so this sees everything.
 */
export async function listOrdersNeedingAttention(): Promise<AttentionOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, status, customer_phone, pickup_label, delivery_address, total, release_count, stalled_at, claimed_at, picked_up_at, created_at, claimed_by'
    )
    .not('stalled_at', 'is', null)
    .neq('status', 'delivered')
    .neq('status', 'cancelled')
    .order('stalled_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as (Omit<AttentionOrder, 'agent'> & { claimed_by: string | null })[];
  const agentIds = [...new Set(rows.map((r) => r.claimed_by).filter(Boolean))] as string[];

  const names = new Map<string, { name: string; phone: string }>();
  if (agentIds.length > 0) {
    const { data: agents } = await supabase
      .from('delivery_agents')
      .select('user_id, name, phone')
      .in('user_id', agentIds);
    for (const a of agents ?? []) names.set(a.user_id, { name: a.name, phone: a.phone });
  }

  return rows.map(({ claimed_by, ...rest }) => ({
    ...rest,
    agent: claimed_by ? (names.get(claimed_by) ?? null) : null,
  }));
}

/** Put it back in the pool for any agent to take. Clears the previous agent's
 *  position so the next one doesn't inherit it. */
export async function returnOrderToPool(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({
      claimed_by: null,
      claimed_at: null,
      picked_up_at: null,
      status: 'placed',
      stalled_at: null,
      agent_latitude: null,
      agent_longitude: null,
      agent_location_at: null,
    })
    .eq('id', orderId);
  if (error) throw error;
}

/** Close it for good, with a reason the customer will see. */
export async function cancelOrder(orderId: string, reason: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancel_reason: reason, stalled_at: null })
    .eq('id', orderId);
  if (error) throw error;
  notifyCustomer(supabase, orderId);
}

/** Mark it delivered — for when the agent completed the drop but never tapped
 *  the button, which is the most common reason an order sticks. */
export async function markOrderDelivered(orderId: string): Promise<void> {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'delivered', delivered_at: new Date().toISOString(), stalled_at: null })
    .eq('id', orderId);
  if (error) throw error;
  notifyCustomer(supabase, orderId);
}

// ---------------------------------------------------------------------------
// Home banner
// ---------------------------------------------------------------------------

export interface HomeBannerRow {
  image_url: string | null;
  cta_category_id: string | null;
  is_active: boolean;
}

export async function getHomeBanner(): Promise<HomeBannerRow> {
  const { data, error } = await supabase
    .from('home_banner')
    .select('image_url, cta_category_id, is_active')
    .single();
  if (error) throw error;
  return data;
}

export async function saveHomeBanner(patch: Partial<HomeBannerRow>): Promise<void> {
  // The table holds exactly one row, keyed on a constant.
  const { error } = await supabase.from('home_banner').update(patch).eq('id', true);
  if (error) throw error;
}
