import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeScreen from '../screens/app/HomeScreen';
import CatalogueScreen from '../screens/app/CatalogueScreen';
import CartScreen from '../screens/app/CartScreen';
import PaymentsScreen from '../screens/app/PaymentsScreen';
import AccountScreen from '../screens/app/AccountScreen';
import { type AccountStackParamList, type HomeStackParamList, type MainTabParamList, type PaymentsStackParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

function HomeStackNavigator() {
  const Stack = createStackNavigator<HomeStackParamList>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

function PaymentsStackNavigator() {
  const Stack = createStackNavigator<PaymentsStackParamList>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="PaymentsHome" component={PaymentsScreen} />
    </Stack.Navigator>
  );
}

function AccountStackNavigator() {
  const Stack = createStackNavigator<AccountStackParamList>();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AccountHome" component={AccountScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="HomeTab" component={HomeStackNavigator} />
      <Tab.Screen name="CatalogueTab" component={CatalogueScreen} />
      <Tab.Screen name="CartTab" component={CartScreen} />
      <Tab.Screen name="PaymentsTab" component={PaymentsStackNavigator} />
      <Tab.Screen name="AccountTab" component={AccountStackNavigator} />
    </Tab.Navigator>
  );
}
