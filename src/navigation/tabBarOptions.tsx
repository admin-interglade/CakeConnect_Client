import React from 'react';
import { PlatformPressable } from '@react-navigation/elements';
import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import { borderRadius, colors, layout, spacing } from '../constants';

/**
 * Tab bar presentation shared by `AdminNavigator` and `ShopNavigator`, so the
 * two shells cannot drift apart.
 *
 * `tabBarButton` exists to undo a library default: `BottomTabItem` hardcodes
 * `android_ripple: { borderless: true }`, which draws a dark circle that
 * expands well past the tab and past the tab bar itself — the default tab
 * variant renders with `overflow: 'visible'`, so nothing clips it. Passing a
 * bounded ripple keeps the press feedback inside the tab's own box.
 */
export const tabBarScreenOptions: BottomTabNavigationOptions = {
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textMuted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    minHeight: layout.minTouchTarget + spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xs,
  },
  tabBarItemStyle: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  tabBarButton: props => (
    <PlatformPressable
      {...props}
      // Spread first: these have to win over BottomTabItem's own defaults.
      android_ripple={{ borderless: false, foreground: true }}
      pressColor={'transparent'}
      pressOpacity={0}

    />
  ),
};
