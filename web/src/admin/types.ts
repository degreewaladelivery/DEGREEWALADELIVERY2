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
