/**
 * Smoke coverage for the shop-owner screens: each one mounts inside the same
 * provider stack the app supplies, with its queries stubbed at the service
 * boundary.
 *
 * This is what catches a broken import, a barrel that stopped exporting
 * something, or a style object React Native rejects — the usual regressions
 * when the design system or the services layer moves. It deliberately does not
 * assert on rendered copy: that would pin the strings layer, which PRD §5 wants
 * free to change for localisation.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ToastProvider } from '../src/components';
import { paperTheme } from '../src/theme';
import { store } from '../src/store/store';
import { setCredentials } from '../src/store/authSlice';

import ShopHome from '../src/screens/shop/dashboard/ShopHome';
import ShopCatalogue from '../src/screens/shop/catalogue/ShopCatalogue';
import CartScreen from '../src/screens/shop/cart/CartScreen';
import ShopOrdersList from '../src/screens/shop/orders/ShopOrdersList';
import TransactionsScreen from '../src/screens/shop/ledger/TransactionsScreen';
import PaymentsScreen from '../src/screens/shop/payments/PaymentsScreen';
import OffersScreen from '../src/screens/shop/offers/OffersScreen';
import NotificationsScreen from '../src/screens/shop/notifications/NotificationsScreen';
import NotificationSettings from '../src/screens/shop/notifications/NotificationSettings';
import MoreScreen from '../src/screens/shop/more/MoreScreen';

/**
 * Stubbed at the service boundary rather than at axios: these screens are
 * meant to be exercised through their hooks, and mocking the transport would
 * leave the mappers running against fixtures that prove nothing here (they
 * have their own tests).
 */
jest.mock('../src/services/auth', () => ({
  __esModule: true,
  fetchOwnShops: jest.fn().mockResolvedValue([]),
}));

jest.mock('../src/services/shop', () => ({
  __esModule: true,
  getEffectiveCutoff: jest.fn().mockResolvedValue({
    shopId: 'shop_204',
    cutoffTime: '22:00',
    cutoffAt: new Date(Date.now() + 3_600_000).toISOString(),
    deliveryDate: '2026-09-05',
    passed: false,
    secondsRemaining: 3600,
  }),
  getShopDashboard: jest.fn().mockResolvedValue({
    shop: { id: 'shop_204', code: '#204', name: 'Sector 15', creditLimit: 50000 },
    totalOrderedValue: 18400,
    orderCount: 12,
    todayOrderCount: 1,
    quantityDelivered: 240,
    amountPaid: 10000,
    currentOutstanding: 8400,
    availableCredit: 41600,
    currentOrderStatus: 'in_production',
    statusBreakdown: { submitted: 2, delivered: 9 },
    topProducts: [{ name: 'Vanilla', quantity: 40, value: 20800 }],
  }),
  getShopCredit: jest.fn().mockResolvedValue({
    shopId: 'shop_204',
    currentOutstanding: 8400,
    totalInvoices: 18400,
    totalPayments: 10000,
    creditLimit: 50000,
    availableCredit: 41600,
    creditBehavior: 'warn',
  }),
  // `null`, not `undefined` — that is the real contract, and TanStack Query
  // treats an undefined result as a failed query.
  getTomorrowsOrder: jest.fn().mockResolvedValue(null),
  getTodaysOrder: jest.fn().mockResolvedValue(null),
  getShopCatalogue: jest
    .fn()
    .mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
  getShopCategories: jest.fn().mockResolvedValue([]),
  getShopOrders: jest
    .fn()
    .mockResolvedValue({ items: [], page: 1, limit: 15, total: 0 }),
  isOrderDateFilterSupported: jest.fn().mockReturnValue(true),
  getTransactions: jest
    .fn()
    .mockResolvedValue({ items: [], page: 1, limit: 25, total: 0 }),
  applyTransactionFilters: jest.fn((entries: unknown[]) => entries),
  isTransactionFilterFullyApplied: jest.fn().mockReturnValue(true),
  getInvoice: jest.fn(),
  getPayableInvoices: jest.fn().mockResolvedValue([]),
  getShopPayments: jest
    .fn()
    .mockResolvedValue({ items: [], page: 1, limit: 20, total: 0 }),
  createPayment: jest.fn(),
  describePaymentOutcome: jest.fn(),
  paymentIdempotencyKey: jest.fn().mockReturnValue('key'),
  isOnlineMethod: jest.fn().mockReturnValue(true),
  getActiveOffers: jest.fn().mockResolvedValue([]),
  getScheduledOffers: jest.fn().mockResolvedValue([]),
  trackOfferView: jest.fn(),
  getNotifications: jest
    .fn()
    .mockResolvedValue({ items: [], unreadCount: 0, total: 0 }),
  getUnreadCount: jest.fn().mockResolvedValue(0),
  markNotificationRead: jest.fn(),
  markAllNotificationsRead: jest.fn(),
  getNotificationSettings: jest.fn().mockResolvedValue([]),
  updateNotificationSetting: jest.fn(),
  ProtectedNotification: class extends Error {},
  createDraftOrder: jest.fn(),
  updateDraftOrder: jest.fn(),
  submitOrder: jest.fn(),
  cancelOrder: jest.fn(),
  deleteDraftOrder: jest.fn(),
  repeatOrder: jest.fn(),
  hydrateCartLines: jest.fn().mockResolvedValue([]),
  nextDeliveryDate: jest.fn().mockReturnValue('2026-09-05'),
  getShopOrder: jest.fn(),
}));

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

beforeAll(() => {
  // The screens are shop-scoped: without a session carrying an outlet, every
  // one of them would correctly render the "no outlet assigned" state and the
  // test would prove nothing.
  store.dispatch(
    setCredentials({
      user: {
        id: 'usr_1',
        phone: '+91 98765 43210',
        role: 'shopOwner',
        name: 'Aarav Sharma',
      },
      token: 'test-access-token',
      refreshToken: 'test-refresh-token',
      shops: [
        {
          id: 'shop_204',
          name: 'CakeConnect - Sector 15',
          code: '#204',
          area: 'Sector 15, Gurgaon',
        },
      ],
    }),
  );
});

const Stack = createStackNavigator();

/**
 * Renders inside a real navigator, lets the stubbed queries settle, then
 * **unmounts**.
 *
 * The navigator is not ceremony: these screens read `useRoute` and
 * `useNavigation`, and rendering one bare would test a component that never
 * exists in the app. Mounting it as a screen is how it actually runs.
 *
 * The unmount matters too: the cut-off countdown runs a one-second interval
 * and the unread badge polls, so a screen left mounted keeps ticking into the
 * next test — writing to a shared store through a query client that test has
 * already discarded. That surfaces as an error attributed to whichever screen
 * happens to be rendering at the time, which is a confusing way to learn that
 * a previous test never cleaned up.
 */
async function renderScreen(Component: React.ComponentType) {
  // Retries off: a stubbed rejection should surface immediately rather than
  // being retried past the end of the test.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider initialMetrics={metrics}>
            <PaperProvider theme={paperTheme}>
              <ToastProvider>
                <NavigationContainer>
                  <Stack.Navigator screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="Subject" component={Component} />
                  </Stack.Navigator>
                </NavigationContainer>
              </ToastProvider>
            </PaperProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      </Provider>,
    );
  });

  // Flush the resolved query promises so the loaded branch renders too, not
  // just the skeleton.
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });

  await ReactTestRenderer.act(async () => {
    tree?.unmount();
  });

  queryClient.clear();
}

describe('shop-owner screens mount', () => {
  it('renders the dashboard — FR-19 to FR-22', async () => {
    await renderScreen(ShopHome);
  });

  it('renders the catalogue — FR-5, FR-6', async () => {
    await renderScreen(ShopCatalogue);
  });

  it('renders the cart — FR-7 to FR-12', async () => {
    await renderScreen(CartScreen);
  });

  it('renders the order list — FR-22', async () => {
    await renderScreen(ShopOrdersList);
  });

  it('renders the statement — FR-23', async () => {
    await renderScreen(TransactionsScreen);
  });

  it('renders payments — FR-26 to FR-30', async () => {
    await renderScreen(PaymentsScreen);
  });

  it('renders offers — FR-34', async () => {
    await renderScreen(OffersScreen);
  });

  it('renders the notification centre — FR-43, FR-44', async () => {
    await renderScreen(NotificationsScreen);
  });

  it('renders notification settings — FR-45', async () => {
    await renderScreen(NotificationSettings);
  });

  it('renders the More tab — FR-4 outlet switcher', async () => {
    await renderScreen(MoreScreen);
  });
});
