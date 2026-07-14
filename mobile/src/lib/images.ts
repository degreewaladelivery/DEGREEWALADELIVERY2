import type { CategoryKey } from '@shared/types';

const categoryImages: Partial<Record<CategoryKey, number>> = {
  food: require('../assets/categories/food.jpg'),
  grocery: require('../assets/categories/grocery.jpg'),
  medical: require('../assets/categories/medical.jpg'),
  bakery: require('../assets/categories/bakery.jpg'),
  meat: require('../assets/categories/meat.jpg'),
  stationery: require('../assets/categories/stationery.jpg'),
  electronics: require('../assets/categories/electronics.jpg'),
  fuel: require('../assets/categories/fuel.jpg'),
  homestays: require('../assets/categories/homestays.jpg'),
};

const shopImages: Record<string, number> = {
  'shop-seegodu-cafe': require('../assets/shops/shop-seegodu-cafe.jpg'),
  'shop-goodluck-medical': require('../assets/shops/shop-goodluck-medical.jpg'),
  'shop-b-mart': require('../assets/shops/shop-b-mart.jpg'),
  'shop-saraswati-store': require('../assets/shops/shop-saraswati-store.jpg'),
};

const brandImages: Record<string, number> = {
  hero: require('../assets/brand/hero.jpg'),
};

export const getCategoryImage = (key: CategoryKey) => categoryImages[key];
export const getShopImage = (shopId: string) => shopImages[shopId];
export const getBrandImage = (name: string) => brandImages[name];
