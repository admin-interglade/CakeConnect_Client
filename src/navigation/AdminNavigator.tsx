import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';

import AdminDashboard from '../screens/admin/dashboard/AdminDashboard';
import ShopsList from '../screens/admin/shops/ShopsList';
import ShopDetails from '../screens/admin/shops/ShopDetails';

import ProductionDetail from '../screens/admin/dashboard/ProductionDetail';
import ComingSoonScreen from '../screens/admin/ComingSoonScreen';
import { Icon } from '../components/ui';
import { colors, iconSize, layout, spacing } from '../constants';
import {
  type AdminDashboardStackParamList,
  type AdminOrdersStackParamList,
  type AdminShopsStackParamList,
  type AdminTabParamList,
} from './types';
import ProductionPlan from '../screens/admin/dashboard/ProductionPlan';
import OrderDetails from '../screens/admin/order/OrderDetails';
import OrdersList from '../screens/admin/order/OrdersList';
import ShortSupply from '../screens/admin/order/ShortSupply';

const Tab = createBottomTabNavigator<AdminTabParamList>();

// Navigators are created at module scope: building one inside a component
// would hand React a new navigator type on every render and reset the stack.
const DashboardStackNav = createStackNavigator<AdminDashboardStackParamList>();
const ShopsStackNav = createStackNavigator<AdminShopsStackParamList>();
const OrdersStackNav = createStackNavigator<AdminOrdersStackParamList>();

const stackOptions = {
  headerShown: false,
  cardStyle: { backgroundColor: colors.background },
  ...TransitionPresets.SlideFromRightIOS,
} as const;

function DashboardStack() {
  return (
    <DashboardStackNav.Navigator screenOptions={stackOptions}>
      <DashboardStackNav.Screen
        name="AdminDashboard"
        component={AdminDashboard}
      />
      <DashboardStackNav.Screen
        name="ProductionPlan"
        component={ProductionPlan}
      />
      <DashboardStackNav.Screen
        name="ProductionDetail"
        component={ProductionDetail}
      />

      {/* Batch B — routed so the dashboard quick actions resolve today. */}
      <DashboardStackNav.Screen name="Catalogue" component={ComingSoonScreen} />
      <DashboardStackNav.Screen
        name="CutoffSettings"
        component={ComingSoonScreen}
      />
      <DashboardStackNav.Screen name="Offers" component={ComingSoonScreen} />
      <DashboardStackNav.Screen
        name="PaymentsQueue"
        component={ComingSoonScreen}
      />
      <DashboardStackNav.Screen name="Reports" component={ComingSoonScreen} />
    </DashboardStackNav.Navigator>
  );
}

function ShopsStack() {
  return (
    <ShopsStackNav.Navigator screenOptions={stackOptions}>
      <ShopsStackNav.Screen name="ShopsList" component={ShopsList} />
      <ShopsStackNav.Screen name="ShopDetails" component={ShopDetails} />
      <ShopsStackNav.Screen name="OrderDetails" component={OrderDetails} />
      <ShopsStackNav.Screen name="ShortSupply" component={ShortSupply} />
    </ShopsStackNav.Navigator>
  );
}

function OrdersStack() {
  return (
    <OrdersStackNav.Navigator screenOptions={stackOptions}>
      <OrdersStackNav.Screen name="OrdersList" component={OrdersList} />
      <OrdersStackNav.Screen name="OrderDetails" component={OrderDetails} />
      <OrdersStackNav.Screen name="ShortSupply" component={ShortSupply} />
      <OrdersStackNav.Screen name="ShopDetails" component={ShopDetails} />
    </OrdersStackNav.Navigator>
  );
}

/**
 * The franchise owner's shell: three tabs, each owning its own stack so a
 * detail screen keeps the tab bar and returns to the list it was opened from.
 *
 * `ShopDetails` and `OrderDetails` are registered in both list stacks on
 * purpose — an order links to its shop and a shop lists its orders, and each
 * tab pushing its own copy keeps the two back stacks independent.
 */
export default function AdminNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="DashboardTab"
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
        name="DashboardTab"
        component={DashboardStack}
        options={{
          title: 'Dashboard',
          tabBarAccessibilityLabel: 'Dashboard tab',
        }}
      />
      <Tab.Screen
        name="ShopsTab"
        component={ShopsStack}
        options={{ title: 'Shops', tabBarAccessibilityLabel: 'Shops tab' }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersStack}
        options={{ title: 'Orders', tabBarAccessibilityLabel: 'Orders tab' }}
      />
    </Tab.Navigator>
  );
}

/**
 * Defined at module scope so the tab bar does not receive a new component type
 * on every render of the navigator.
 */
const tabBarIcons: Record<
  keyof AdminTabParamList,
  (props: { color: string }) => React.ReactElement
> = {
  DashboardTab: ({ color }) => (
    <Icon name="view-dashboard-outline" size={iconSize.lg} color={color} />
  ),
  ShopsTab: ({ color }) => (
    <Icon name="storefront-outline" size={iconSize.lg} color={color} />
  ),
  OrdersTab: ({ color }) => (
    <Icon name="clipboard-list-outline" size={iconSize.lg} color={color} />
  ),
};
