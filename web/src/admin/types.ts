/** Row shapes for the admin-managed catalog (Supabase tables). */

export interface CategoryRow {
  id: string;
  name: string;
  image_url: string | null;
  offer_badge: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubcategoryRow {
  id: string;
  category_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  /** Optional link to a shop — when set, this category item also shows in that shop. */
  shop_id: string | null;
  name: string;
  description: string | null;
  /** Admin-only field — never sent to customer-facing clients. */
  barcode: string | null;
  gst_percent: number;
  mrp: number;
  retail_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* ----------------------------------------------------------------------------
 * Shops — a second, independent top-level entity (its own tab). Deliberately
 * NOT linked to Category/Subcategory/Product in any way.
 * -------------------------------------------------------------------------- */

export interface ShopRow {
  id: string;
  name: string;
  image_url: string | null;
  description: string | null;
  /** Optional — a shop may not have a rating yet. */
  rating: number | null;
  /** Optional — a shop may not have a delivery-time estimate yet. */
  delivery_time: string | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A shop's own optional category grouping (mirrors Category/Subcategory, one level down). */
export interface ShopCategoryRow {
  id: string;
  shop_id: string;
  name: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShopProductRow {
  id: string;
  shop_id: string;
  shop_category_id: string | null;
  name: string;
  description: string | null;
  /** Admin-only field — never sent to customer-facing clients. */
  barcode: string | null;
  gst_percent: number;
  mrp: number;
  retail_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
