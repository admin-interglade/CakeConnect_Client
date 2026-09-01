import React from 'react';
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';

import SplashScreen from '../screens/auth/SplashScreen';
import LandingScreen from '../screens/auth/LandingScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import VerificationScreen from '../screens/auth/VerificationScreen';
import ProfileScreen from '../screens/auth/ProfileScreen';
import BiometricScreen from '../screens/auth/BiometricScreen';
import AllSetScreen from '../screens/auth/AllSetScreen';
import { colors } from '../constants';
import { type AuthStackParamList } from './types';

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background },
        ...TransitionPresets.SlideFromRightIOS,
      }}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ ...TransitionPresets.FadeFromBottomAndroid }}
      />
      <Stack.Screen name="Landing" component={LandingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Verification" component={VerificationScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Biometric" component={BiometricScreen} />
      <Stack.Screen
        name="AllSet"
        component={AllSetScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
