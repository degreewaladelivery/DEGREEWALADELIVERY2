/** Row shapes for the admin-managed catalog (Supabase tables). */

export interface CategoryRow {
  id: string;
  name: string;
  image_url: string | null;
  offer_badge: string | null;
  /** Accent colour — drives the category page's hero banner + homepage tile hover/badge. */
  color: string;
  /** Soft background tint — used as the emoji-fallback tile colour if no photo is set. */
  tint: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Classifies shops within a category (e.g. Food -> Veg / Non-Veg). */
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

export interface ShopRow {
  id: string;
  category_id: string;
  subcategory_id: string | null;
  name: string;
  image_url: string | null;
  description: string | null;
  rating: number;
  delivery_time: string | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** A shop's own optional menu grouping (mirrors categories/subcategories, one level down). */
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

export interface ProductRow {
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
