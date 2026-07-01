/**
 * shared/mockData.ts
 * --------------------------------------------------------------------------
 * Fake-but-realistic data so we can design the whole UI before any backend
 * exists. When the real API is ready, we delete this file and the screens
 * keep working — they already speak in the types from shared/types.ts.
 *
 * Images are intentionally left undefined: components fall back to a tasteful
 * emoji placeholder (per the spec), which is offline-safe and on-brand.
 */

import type { Category, Product, Shop } from './types';

/* ----------------------------- Categories ------------------------------- */

export const categories: Category[] = [
  { id: 'cat-food', key: 'food', name: 'Food', emoji: '🍽️', color: '#FF6B00', tint: '#FFF3E0', subCategories: ['Veg', 'Non-Veg'], sortOrder: 1, isActive: true },
  { id: 'cat-grocery', key: 'grocery', name: 'Grocery', emoji: '🛒', color: '#4CAF50', tint: '#E8F5E9', subCategories: [], sortOrder: 2, isActive: true },
  { id: 'cat-medical', key: 'medical', name: 'Medical', emoji: '💊', color: '#9C27B0', tint: '#F3E5F5', subCategories: [], sortOrder: 3, isActive: true },
  { id: 'cat-bakery', key: 'bakery', name: 'Bakery', emoji: '🥐', color: '#FF5722', tint: '#FBE9E7', subCategories: [], sortOrder: 4, isActive: true },
  { id: 'cat-meat', key: 'meat', name: 'Meat', emoji: '🍗', color: '#D32F2F', tint: '#FFEBEE', subCategories: ['Chicken', 'Mutton', 'Pork'], sortOrder: 5, isActive: true },
  { id: 'cat-stationery', key: 'stationery', name: 'Stationery', emoji: '✏️', color: '#2196F3', tint: '#E3F2FD', subCategories: [], sortOrder: 6, isActive: true },
  { id: 'cat-electronics', key: 'electronics', name: 'Electronics', emoji: '📱', color: '#E91E63', tint: '#FCE4EC', subCategories: [], sortOrder: 7, isActive: true },
  { id: 'cat-fuel', key: 'fuel', name: 'Fuel', emoji: '⛽', color: '#FFC107', tint: '#FFF8E1', subCategories: ['Petrol', 'Diesel'], sortOrder: 8, isActive: true },
  { id: 'cat-homestays', key: 'homestays', name: 'Homestays', emoji: '🏡', color: '#00897B', tint: '#E0F2F1', subCategories: [], sortOrder: 9, isActive: true },
];

/* ------------------------------- Shops ---------------------------------- */

export const shops: Shop[] = [
  // Food
  { id: 'shop-parijata', name: 'Parijata', categoryKey: 'food', subCategory: 'Veg', description: 'Pure veg thalis & South Indian', rating: 4.5, deliveryTime: '25-30 min', isActive: true, isFeatured: true },
  { id: 'shop-biryani-point', name: 'Biryani Point', categoryKey: 'food', subCategory: 'Non-Veg', description: 'Dum biryani & kebabs', rating: 4.4, deliveryTime: '30-35 min', isActive: true, isFeatured: true },
  { id: 'shop-seegodu-cafe', name: 'Seegodu Cafe', categoryKey: 'food', subCategory: 'Veg', description: 'Cafe • coffee & snacks', rating: 4.5, deliveryTime: '20-25 min', isActive: true, isFeatured: true },
  { id: 'shop-food-alouddin', name: 'Food Alouddin', categoryKey: 'food', subCategory: 'Non-Veg', description: 'Mughlai & curries', rating: 4.4, deliveryTime: '30-40 min', isActive: true },
  { id: 'shop-spice-garden', name: 'Spice Garden', categoryKey: 'food', subCategory: 'Veg', description: 'North Indian • tandoor', rating: 4.2, deliveryTime: '25-35 min', isActive: true },

  // Grocery
  { id: 'shop-anil-grocery', name: 'Anil Grocery', categoryKey: 'grocery', description: 'Daily essentials & staples', rating: 4.3, deliveryTime: '15-20 min', isActive: true, isFeatured: true },
  { id: 'shop-b-mart', name: 'B Mart', categoryKey: 'grocery', description: 'Supermarket • everything', rating: 4.5, deliveryTime: '20-30 min', isActive: true, isFeatured: true },
  { id: 'shop-fresh-basket', name: 'Fresh Basket', categoryKey: 'grocery', description: 'Fruits & vegetables', rating: 4.1, deliveryTime: '15-25 min', isActive: true },

  // Medical
  { id: 'shop-goodluck-medical', name: 'Goodluck Medical', categoryKey: 'medical', description: 'Medicines & wellness', rating: 4.6, deliveryTime: '15-20 min', isActive: true, isFeatured: true },
  { id: 'shop-care-plus', name: 'Care Plus Medicals', categoryKey: 'medical', description: '24x7 chemist', rating: 4.4, deliveryTime: '20-25 min', isActive: true },

  // Bakery
  { id: 'shop-shree-durga', name: 'Shree Durga Bakery', categoryKey: 'bakery', description: 'Fresh bread & cakes', rating: 4.5, deliveryTime: '20-30 min', isActive: true, isFeatured: true },
  { id: 'shop-cakes-bakes', name: 'Cakes & Bakes', categoryKey: 'bakery', description: 'Custom cakes & pastries', rating: 4.6, deliveryTime: '25-35 min', isActive: true, isFeatured: true },

  // Meat
  { id: 'shop-fresh-chicken', name: 'Fresh Chicken Centre', categoryKey: 'meat', subCategory: 'Chicken', description: 'Farm-fresh chicken', rating: 4.3, deliveryTime: '25-35 min', isActive: true },
  { id: 'shop-mutton-house', name: 'Mutton House', categoryKey: 'meat', subCategory: 'Mutton', description: 'Premium mutton cuts', rating: 4.2, deliveryTime: '30-40 min', isActive: true },

  // Stationery
  { id: 'shop-saraswati-store', name: 'Saraswati Store', categoryKey: 'stationery', description: 'Books, pens & supplies', rating: 4.3, deliveryTime: '20-30 min', isActive: true, isFeatured: true },

  // Electronics
  { id: 'shop-reliance', name: 'Reliance Digital', categoryKey: 'electronics', description: 'Gadgets & accessories', rating: 4.4, deliveryTime: '40-60 min', isActive: true, isFeatured: true },
  { id: 'shop-gadget-world', name: 'Gadget World', categoryKey: 'electronics', description: 'Mobiles & repairs', rating: 4.1, deliveryTime: '45-60 min', isActive: true },

  // Fuel
  { id: 'shop-hp-fuel', name: 'HP Fuel Station', categoryKey: 'fuel', subCategory: 'Petrol', description: 'Petrol & diesel by litre', rating: 4.0, deliveryTime: '30-45 min', isActive: true },

  // Homestays
  { id: 'shop-hillview-stay', name: 'Hillview Homestay', categoryKey: 'homestays', description: 'Cozy rooms with a view', rating: 4.7, deliveryTime: 'Book a stay', isActive: true, isFeatured: true },
];

/* ------------------------------ Products -------------------------------- */
/* A handful of menus so the ShopItems screen looks full. Other shops fall
   back to a small auto-generated menu via getProductsByShop(). */

export const products: Product[] = [
  // Parijata (veg)
  { id: 'p-par-1', shopId: 'shop-parijata', name: 'Veg Thali', description: 'Rice, 2 sabzi, dal, roti, sweet', price: 140, isAvailable: true, section: 'Thalis' },
  { id: 'p-par-2', shopId: 'shop-parijata', name: 'Masala Dosa', description: 'Crispy dosa with potato masala', price: 90, isAvailable: true, section: 'South Indian' },
  { id: 'p-par-3', shopId: 'shop-parijata', name: 'Paneer Butter Masala', description: 'Rich tomato & butter gravy', price: 180, isAvailable: true, section: 'Main Course' },
  { id: 'p-par-4', shopId: 'shop-parijata', name: 'Filter Coffee', description: 'South Indian filter coffee', price: 40, isAvailable: true, section: 'Beverages' },

  // Biryani Point (non-veg)
  { id: 'p-bir-1', shopId: 'shop-biryani-point', name: 'Chicken Dum Biryani', description: 'Hyderabadi style, serves 1', price: 220, isAvailable: true, section: 'Biryani' },
  { id: 'p-bir-2', shopId: 'shop-biryani-point', name: 'Mutton Biryani', description: 'Slow-cooked, serves 1', price: 280, isAvailable: true, section: 'Biryani' },
  { id: 'p-bir-3', shopId: 'shop-biryani-point', name: 'Chicken Kebab', description: 'Char-grilled, 6 pcs', price: 180, isAvailable: false, section: 'Starters' },
  { id: 'p-bir-4', shopId: 'shop-biryani-point', name: 'Gulab Jamun', description: '2 pcs', price: 60, isAvailable: true, section: 'Desserts' },

  // Anil Grocery
  { id: 'p-ani-1', shopId: 'shop-anil-grocery', name: 'Toor Dal 1kg', price: 145, isAvailable: true, section: 'Staples' },
  { id: 'p-ani-2', shopId: 'shop-anil-grocery', name: 'Basmati Rice 5kg', price: 520, isAvailable: true, section: 'Staples' },
  { id: 'p-ani-3', shopId: 'shop-anil-grocery', name: 'Sunflower Oil 1L', price: 160, isAvailable: true, section: 'Cooking' },
  { id: 'p-ani-4', shopId: 'shop-anil-grocery', name: 'Amul Milk 500ml', price: 28, isAvailable: true, section: 'Dairy' },

  // Shree Durga Bakery
  { id: 'p-dur-1', shopId: 'shop-shree-durga', name: 'Chocolate Truffle Cake 500g', price: 350, isAvailable: true, section: 'Cakes' },
  { id: 'p-dur-2', shopId: 'shop-shree-durga', name: 'Veg Puff', price: 25, isAvailable: true, section: 'Savouries' },
  { id: 'p-dur-3', shopId: 'shop-shree-durga', name: 'Brown Bread', price: 45, isAvailable: true, section: 'Bread' },

  // Good Luck Pharmacy
  { id: 'p-glp-1', shopId: 'shop-goodluck-medical', name: 'Paracetamol 500mg (10 tabs)', price: 30, isAvailable: true, section: 'Medicines' },
  { id: 'p-glp-2', shopId: 'shop-goodluck-medical', name: 'Hand Sanitizer 200ml', price: 99, isAvailable: true, section: 'Wellness' },
  { id: 'p-glp-3', shopId: 'shop-goodluck-medical', name: 'Digital Thermometer', price: 199, isAvailable: true, section: 'Devices' },
];

/* ------------------------------ Helpers --------------------------------- */

export function getCategoryByKey(key: string): Category | undefined {
  return categories.find((c) => c.key === key);
}

export function getShopById(id: string): Shop | undefined {
  return shops.find((s) => s.id === id);
}

export function getShopsByCategory(key: string): Shop[] {
  return shops.filter((s) => s.categoryKey === key && s.isActive);
}

/** Live shop count per category — used by the home grid badges. */
export function getShopCount(key: string): number {
  return getShopsByCategory(key).length;
}

/** The exact shops (and order) shown in the home "Popular Near You" panel. */
export const featuredShops: Shop[] = [
  'shop-seegodu-cafe',
  'shop-goodluck-medical',
  'shop-b-mart',
  'shop-saraswati-store',
]
  .map((id) => shops.find((s) => s.id === id))
  .filter((s): s is Shop => Boolean(s));

/** Returns a shop's menu, or a small generic menu if none was defined. */
export function getProductsByShop(shopId: string): Product[] {
  const defined = products.filter((p) => p.shopId === shopId);
  if (defined.length > 0) return defined;

  // Fallback so every shop has *something* to show in design.
  return [
    { id: `${shopId}-g1`, shopId, name: 'Popular Item', price: 120, isAvailable: true, section: 'Popular' },
    { id: `${shopId}-g2`, shopId, name: 'Best Seller', price: 99, isAvailable: true, section: 'Popular' },
    { id: `${shopId}-g3`, shopId, name: "Today's Special", price: 150, isAvailable: true, section: 'Specials' },
  ];
}
