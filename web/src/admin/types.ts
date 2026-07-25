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
  created_at: string;
  updated_at: string;
}

export interface ShopRow {
  id: string;
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
  created_at: string;
  updated_at: string;
}

export interface AppSettingsRow {
  id: true;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  updated_at: string;
}

export interface DeliveryAgentRow {
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
  created_at: string;
}

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

  unit: string | null;

  serial_no: number;

  barcode: string | null;
  gst_percent: number;
  mrp: number;
  retail_price: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
