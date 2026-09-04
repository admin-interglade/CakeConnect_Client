import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';

import ShopHome from '../screens/shop/dashboard/ShopHome';
import ShopCatalogue from '../screens/shop/catalogue/ShopCatalogue';
import CartScreen from '../screens/shop/cart/CartScreen';
import ShopOrdersList from '../screens/shop/orders/ShopOrdersList';
import ShopOrderDetails from '../screens/shop/orders/ShopOrderDetails';
import TransactionsScreen from '../screens/shop/ledger/TransactionsScreen';
import InvoiceDetails from '../screens/shop/ledger/InvoiceDetails';
import PaymentsScreen from '../screens/shop/payments/PaymentsScreen';
import OffersScreen from '../screens/shop/offers/OffersScreen';
import NotificationsScreen from '../screens/shop/notifications/NotificationsScreen';
import NotificationSettings from '../screens/shop/notifications/NotificationSettings';
import MoreScreen from '../screens/shop/more/MoreScreen';

import { Icon } from '../components/ui';
import { colors, iconSize, layout, spacing, strings } from '../constants';
import {
  type ShopHomeStackParamList,
  type ShopLedgerStackParamList,
  type ShopMoreStackParamList,
  type ShopOrdersStackParamList,
  type ShopTabParamList,
} from './types';

const Tab = createBottomTabNavigator<ShopTabParamList>();

// Navigators are created at module scope: building one inside a component
// would hand React a new navigator type on every render and reset the stack.
const HomeStackNav = createStackNavigator<ShopHomeStackParamList>();
const OrdersStackNav = createStackNavigator<ShopOrdersStackParamList>();
const LedgerStackNav = createStackNavigator<ShopLedgerStackParamList>();
const MoreStackNav = createStackNavigator<ShopMoreStackParamList>();

const stackOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: colors.background },
  ...TransitionPresets.SlideFromRightIOS,
} as const;

/** Home owns the daily job: where the day stands, then ordering against it. */
function HomeStack() {
  return (
    <HomeStackNav.Navigator screenOptions={stackOptions}>
      <HomeStackNav.Screen name="ShopHome" component={ShopHome} />
      {/* FR-5 to FR-12 — "Place Order" and "Continue Order" are one flow. */}
      <HomeStackNav.Screen name="ShopCatalogue" component={ShopCatalogue} />
      <HomeStackNav.Screen name="Cart" component={CartScreen} />
      {/* FR-34, FR-43 — reached from the dashboard's offer strip and bell. */}
      <HomeStackNav.Screen name="Offers" component={OffersScreen} />
      <HomeStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <HomeStackNav.Screen name="InvoiceDetails" component={InvoiceDetails} />
    </HomeStackNav.Navigator>
  );
}

function OrdersStack() {
  return (
    <OrdersStackNav.Navigator screenOptions={stackOptions}>
      <OrdersStackNav.Screen name="ShopOrdersList" component={ShopOrdersList} />
      <OrdersStackNav.Screen
        name="ShopOrderDetails"
        component={ShopOrderDetails}
      />
      {/* FR-25 — an invoiced order links straight to its invoice. */}
      <OrdersStackNav.Screen name="InvoiceDetails" component={InvoiceDetails} />
    </OrdersStackNav.Navigator>
  );
}

/** The money tab: the statement, an invoice from it, and paying one. */
function LedgerStack() {
  return (
    <LedgerStackNav.Navigator screenOptions={stackOptions}>
      <LedgerStackNav.Screen name="Transactions" component={TransactionsScreen} />
      <LedgerStackNav.Screen name="InvoiceDetails" component={InvoiceDetails} />
      <LedgerStackNav.Screen name="ShopPayments" component={PaymentsScreen} />
    </LedgerStackNav.Navigator>
  );
}

function MoreStack() {
  return (
    <MoreStackNav.Navigator screenOptions={stackOptions}>
      <MoreStackNav.Screen name="More" component={MoreScreen} />
      <MoreStackNav.Screen
        name="NotificationSettings"
        component={NotificationSettings}
      />
      <MoreStackNav.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStackNav.Screen name="Offers" component={OffersScreen} />
    </MoreStackNav.Navigator>
  );
}

/**
 * The shop owner's shell — four tabs, per the design: Home, Orders, Ledger,
 * More.
 *
 * The catalogue and the cart deliberately have no tab of their own. Ordering
 * starts from the dashboard ("Place Order" / "Continue Order") and the design
 * treats it as one flow inside Home, rather than three tabs a shop has to
 * assemble an order across.
 *
 * `InvoiceDetails` is registered in three stacks on purpose — an invoice is
 * reachable from the statement, from an invoiced order and from a notification,
 * and each tab pushing its own copy keeps the three back stacks independent.
 * That is the same reasoning `AdminNavigator` applies to `ShopDetails`.
 */
export default function ShopNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: layout.minTouchTarget + spacing.md,
          paddingTop: spacing.xs,
          paddingBottom: spacing.xs,
        },
        tabBarIcon: tabBarIcons[route.name],
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: strings.shopTabs.home,
          tabBarAccessibilityLabel: strings.shopTabs.home,
        }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{
          title: strings.shopTabs.orders,
          tabBarAccessibilityLabel: strings.shopTabs.orders,
        }}
      />
      <Tab.Screen
        name="LedgerTab"
        component={LedgerStack}
        options={{
          title: strings.shopTabs.ledger,
          tabBarAccessibilityLabel: strings.shopTabs.ledger,
        }}
      />
      <Tab.Screen
        name="MoreTab"
        component={MoreStack}
        options={{
          title: strings.shopTabs.more,
          tabBarAccessibilityLabel: strings.shopTabs.more,
        }}
      />
    </Tab.Navigator>
  );
}

/**
 * Defined at module scope so the tab bar does not receive a new component type
 * on every render of the navigator.
 */
const tabBarIcons: Record<
  keyof ShopTabParamList,
  (props: { color: string; focused: boolean }) => React.ReactElement
> = {
  HomeTab: ({ color, focused }) => (
    <Icon name={focused ? 'home' : 'home-outline'} size={iconSize.lg} color={color} />
  ),
  OrdersTab: ({ color, focused }) => (
    <Icon
      name={focused ? 'clipboard-list' : 'clipboard-list-outline'}
      size={iconSize.lg}
      color={color}
    />
  ),
  LedgerTab: ({ color, focused }) => (
    <Icon
      name={focused ? 'book-open-variant' : 'book-open-outline'}
      size={iconSize.lg}
      color={color}
    />
  ),
  MoreTab: ({ color, focused }) => (
    <Icon
      name={focused ? 'dots-grid' : 'dots-horizontal'}
      size={iconSize.lg}
      color={color}
    />
  ),
};
