import type { CategoryKey, OrderStatus, Role } from './types';

export const colors = {

  brand: '#FF6B00',
  brandDark: '#E85D00',
  brandDeep: '#C44E00',
  brandTint: '#FFF3E0',

  text: '#15172B',
  textMuted: '#6B7280',
  textFaint: '#9AA0AC',

  bg: '#FFFFFF',
  bgSoft: '#FFFFFF',
  surface: '#F4F6F9',
  bgNavy: '#0D1B2A',
  border: '#ECEEF2',
  borderStrong: '#DFE3EA',

  success: '#2E9E5B',
  warning: '#FF9800',
  danger: '#F44336',
  star: '#FFB400',

  white: '#FFFFFF',
  black: '#000000',
} as const;

export const roleAccents: Record<Role, { accent: string; tint: string }> = {
  customer: { accent: '#FF6B00', tint: '#FFF3E0' },
  shop_admin: { accent: '#1A237E', tint: '#E8EAF6' },
  super_admin: { accent: '#0D1B2A', tint: '#E3E8EF' },
  delivery_boy: { accent: '#1B5E20', tint: '#F1F8E9' },
};

export const categoryPalette: Record<
  CategoryKey,
  { emoji: string; tint: string; border: string }
> = {
  food: { emoji: '🍽️', tint: '#FFF3E0', border: '#FF6B00' },
  medical: { emoji: '💊', tint: '#F3E5F5', border: '#9C27B0' },
  grocery: { emoji: '🛒', tint: '#E8F5E9', border: '#4CAF50' },
  stationery: { emoji: '✏️', tint: '#E3F2FD', border: '#2196F3' },
  fuel: { emoji: '⛽', tint: '#FFF8E1', border: '#FFC107' },
  electronics: { emoji: '📱', tint: '#FCE4EC', border: '#E91E63' },
  bakery: { emoji: '🥐', tint: '#FBE9E7', border: '#FF5722' },
  meat: { emoji: '🍗', tint: '#FFEBEE', border: '#D32F2F' },
  homestays: { emoji: '🏡', tint: '#E0F2F1', border: '#00897B' },
};

export const orderStatusColors: Record<OrderStatus, string> = {
  pending: '#FF9800',
  confirmed: '#2196F3',
  preparing: '#9C27B0',
  picked_up: '#FF6B00',
  out_for_delivery: '#FF6B00',
  delivered: '#4CAF50',
  cancelled: '#F44336',
};

export const orderStatusLabels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  picked_up: 'Picked Up',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(16, 24, 40, 0.06)',
  md: '0 4px 16px rgba(16, 24, 40, 0.08)',
  lg: '0 12px 32px rgba(16, 24, 40, 0.12)',
  brand: '0 8px 24px rgba(255, 107, 0, 0.28)',
} as const;

export const fontSizes = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 36,
  '4xl': 48,
} as const;
