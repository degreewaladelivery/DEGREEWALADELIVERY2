/**
 * shared/types.ts
 * --------------------------------------------------------------------------
 * The single source of truth for every "shape" of data in Degreewala.
 * Both the web app and the mobile app import these types, so the two front
 * ends can never disagree about what a Shop, Product or Order looks like.
 *
 * These mirror the backend data model (section 6 of the spec). On the
 * frontend we use camelCase field names; when we wire the real API later
 * we'll map snake_case <-> camelCase in one place (the api layer).
 */

/** The four kinds of people who use the platform. */
export type Role = 'customer' | 'shop_admin' | 'super_admin' | 'delivery_boy';

/** The 9 fixed top-level categories. Using a string union (not just
 *  `string`) means TypeScript will catch typos like "groccery". */
export type CategoryKey =
  | 'food'
  | 'medical'
  | 'grocery'
  | 'stationery'
  | 'fuel'
  | 'electronics'
  | 'bakery'
  | 'meat'
  | 'homestays';

/** Every state an order can be in (the order status machine, section 10). */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'picked_up'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'razorpay';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

/** A top-level category shown on the home grid. */
export interface Category {
  id: string;
  key: CategoryKey;
  name: string;
  emoji: string;
  /** Accent / border colour for this category's cards. */
  color: string;
  /** Soft background tint for this category's cards. */
  tint: string;
  /** e.g. Food -> ['Veg', 'Non-Veg']; empty array if none. */
  subCategories: string[];
  sortOrder: number;
  isActive: boolean;
}

/** A single vendor/store. */
export interface Shop {
  id: string;
  name: string;
  categoryKey: CategoryKey;
  /** Only set for categories that have sub-categories (Food, Meat...). */
  subCategory?: string;
  description?: string;
  imageUrl?: string;
  /** 0-5, shown as a star pill. */
  rating: number;
  /** Human label, e.g. "25-30 min". */
  deliveryTime: string;
  /** Whether the shop is currently open / visible to customers. */
  isActive: boolean;
  /** Optional flag so we can feature shops on the home page. */
  isFeatured?: boolean;
}

/** A product / menu item belonging to one shop. */
export interface Product {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  /** Optional grouping inside a shop's menu, e.g. "Starters". */
  section?: string;
}

/** One line in an order (a product + quantity snapshot). */
export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

/** A placed order. */
export interface Order {
  id: string;
  customerId: string;
  shopId: string;
  deliveryBoyId?: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/* ---- People (kept for completeness; used once auth/backend is wired) ---- */

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  email: string;
  isAvailable: boolean;
  currentLat?: number;
  currentLng?: number;
}

export interface ShopAdmin {
  id: string;
  shopId: string;
  name: string;
  email: string;
}

export interface SuperAdmin {
  id: string;
  name: string;
  email: string;
}
