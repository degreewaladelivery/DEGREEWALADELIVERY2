export type HomeStackParamList = {
  HomeMain: { scrollTo?: 'featured' } | undefined;
  Category: { categoryKey: string };
  Shop: { shopId: string };
};

export type CartStackParamList = {
  CartMain: undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; total: number };
};
