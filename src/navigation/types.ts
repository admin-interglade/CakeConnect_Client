export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  OTP: { phone: string; role: 'shopOwner' | 'admin' };
};

export type MainTabParamList = {
  HomeTab: undefined;
  CatalogueTab: undefined;
  CartTab: undefined;
  PaymentsTab: undefined;
  AccountTab: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  ProductDetail: { productId: string };
};

export type OrdersStackParamList = {
  OrdersList: undefined;
  OrderDetail: { orderId: string };
};

export type PaymentsStackParamList = {
  PaymentsHome: undefined;
  PaymentDetail: { invoiceId: string };
};

export type AccountStackParamList = {
  AccountHome: undefined;
  Profile: undefined;
};
