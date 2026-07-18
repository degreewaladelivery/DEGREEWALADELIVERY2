export type Role = 'customer' | 'shop_admin' | 'super_admin' | 'delivery_boy';

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

export interface Category {
  id: string;
  key: CategoryKey;
  name: string;
  emoji: string;

  color: string;

  tint: string;

  imageUrl?: string;

  subCategories: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface Shop {
  id: string;
  name: string;
  categoryKey: CategoryKey;

  subCategory?: string;
  description?: string;
  imageUrl?: string;

  rating: number;

  deliveryTime: string;

  isActive: boolean;

  isFeatured?: boolean;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;

  unit?: string;

  section?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId?: string;
  name: string;
  quantity: number;
  price: number;
}

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
