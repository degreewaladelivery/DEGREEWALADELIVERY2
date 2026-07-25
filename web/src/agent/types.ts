export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  unit: string | null;
}

export type OrderStatus = 'placed' | 'claimed' | 'picked_up' | 'delivered' | 'cancelled';

export interface OrderRow {
  id: string;
  customer_phone: string;
  pickup_label: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  delivery_address: string;
  delivery_latitude: number | null;
  delivery_longitude: number | null;
  distance_km: number | null;
  items: OrderItem[];
  subtotal: number;
  delivery_fee: number;
  taxes: number;
  total: number;
  agent_payout: number;
  payment_method: string;
  status: OrderStatus;
  claimed_by: string | null;
  claimed_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentProfile {
  user_id: string;
  name: string;
  phone: string;
  is_active: boolean;
}
