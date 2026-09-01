/**
 * Smoke coverage for the seven auth screens: each one mounts with the route
 * params the navigator supplies. This catches broken imports and invalid
 * styles, which are the usual regressions when the design system changes.
 */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Provider } from 'react-redux';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SplashScreen from '../src/screens/auth/SplashScreen';
import LandingScreen from '../src/screens/auth/LandingScreen';
import LoginScreen from '../src/screens/auth/LoginScreen';
import VerificationScreen from '../src/screens/auth/VerificationScreen';
import ProfileScreen from '../src/screens/auth/ProfileScreen';
import BiometricScreen from '../src/screens/auth/BiometricScreen';
import AllSetScreen from '../src/screens/auth/AllSetScreen';
import { paperTheme } from '../src/theme';
import { store } from '../src/store/store';
import type { PendingSession } from '../src/navigation/types';

const metrics = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 44, left: 0, right: 0, bottom: 34 },
};

const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: jest.fn(),
};

/** The screens only ever touch these three methods off the navigation prop. */
const navigationProp = navigation as never;

const session: PendingSession = {
  userId: 'usr_demo_1',
  token: 'demo-jwt-token',
  role: 'shopOwner',
  phone: '+91 98765 43210',
  fullName: 'Aarav Sharma',
  assignedShop: {
    id: 'shop_204',
    name: 'CakeConnect - Sector 15, Gurgaon',
    code: '#204',
    area: 'Sector 15, Gurgaon',
  },
};

async function render(element: React.ReactElement) {
  let tree: ReactTestRenderer.ReactTestRenderer | undefined;

  // An async callback lets React flush effects that resolve promises (the
  // biometric screen probes the sensor on mount).
  await ReactTestRenderer.act(async () => {
    tree = ReactTestRenderer.create(
      <Provider store={store}>
        <SafeAreaProvider initialMetrics={metrics}>
          <PaperProvider theme={paperTheme}>{element}</PaperProvider>
        </SafeAreaProvider>
      </Provider>,
    );
  });

  return tree!;
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

describe('auth screens', () => {
  it('renders the splash screen and advances to the landing screen', async () => {
    const tree = await render(
      <SplashScreen navigation={navigationProp} route={{ key: 'k', name: 'Splash' } as never} />,
    );

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(navigation.replace).toHaveBeenCalledWith('Landing');
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the landing screen', async () => {
    const tree = await render(
      <LandingScreen navigation={navigationProp} route={{ key: 'k', name: 'Landing' } as never} />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the login screen', async () => {
    const tree = await render(
      <LoginScreen navigation={navigationProp} route={{ key: 'k', name: 'Login' } as never} />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the verification screen', async () => {
    const tree = await render(
      <VerificationScreen
        navigation={navigationProp}
        route={
          {
            key: 'k',
            name: 'Verification',
            params: { dialCode: '+91', nationalNumber: '9876543210', resendAfterSeconds: 30 },
          } as never
        }
      />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the profile screen', async () => {
    const tree = await render(
      <ProfileScreen
        navigation={navigationProp}
        route={{ key: 'k', name: 'Profile', params: { session } } as never}
      />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the biometric screen', async () => {
    const tree = await render(
      <BiometricScreen
        navigation={navigationProp}
        route={{ key: 'k', name: 'Biometric', params: { session } } as never}
      />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });

  it('renders the all-set screen', async () => {
    const tree = await render(
      <AllSetScreen
        navigation={navigationProp}
        route={
          { key: 'k', name: 'AllSet', params: { session, biometricsEnabled: true } } as never
        }
      />,
    );
    expect(tree.toJSON()).toBeTruthy();
    await ReactTestRenderer.act(() => tree.unmount());
  });
});
