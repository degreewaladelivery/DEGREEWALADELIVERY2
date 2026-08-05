export type HomeStackParamList = {
  HomeMain: { scrollTo?: 'featured' } | undefined;
  Category: { categoryKey: string };
  Shop: { shopId: string };
};

export type CartStackParamList = {
  CartMain: undefined;
  Login: { onSuccessRoute: 'Checkout' } | undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; total: number };
  Track: undefined;
};
