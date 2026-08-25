export type HomeStackParamList = {
  HomeMain: { scrollTo?: 'featured' } | undefined;
  Category: { categoryKey: string };
  Shop: { shopId: string };
  Search: { query?: string } | undefined;
  ItemDetail: { productId: string };
};

export type AccountStackParamList = {
  AccountMain: undefined;
};

export type CartStackParamList = {
  CartMain: undefined;
  Login: { onSuccessRoute: 'Checkout' } | undefined;
  Checkout: undefined;
  OrderSuccess: { orderId: string; total: number };
  Track: undefined;
};
