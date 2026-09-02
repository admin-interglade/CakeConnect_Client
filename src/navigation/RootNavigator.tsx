import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';
import AdminNavigator from './AdminNavigator';
import { navigationTheme } from '../theme';
import type { RootState } from '../store/store';
import { type RootStackParamList } from './types';

const Stack = createStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const role = useSelector((state: RootState) => state.auth.user?.role);

  /**
   * PRD §3 — role decides which shell mounts, and only one is ever in the tree.
   * A shop owner therefore has no admin route to reach, by navigation or by
   * deep link, rather than being merely hidden from the admin tabs.
   */
  const isAdmin = role === 'admin';

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <Stack.Screen
            name="App"
            component={isAdmin ? AdminNavigator : AppNavigator}
          />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
