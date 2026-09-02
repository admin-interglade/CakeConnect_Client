import React from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import { borderRadius, colors, iconSize, layout, spacing } from '../../constants';

export type HeaderAction = {
  icon: string;
  label: string;
  onPress: () => void;
  tone?: string;
};

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Up to two icon buttons on the trailing edge. */
  actions?: HeaderAction[];
  /** Rendered under the title, e.g. a status badge. */
  children?: React.ReactNode;
  style?: ViewStyle;
};

/** Consistent top bar for the admin screens, which run with `headerShown: false`. */
export default function ScreenHeader({
  title,
  subtitle,
  onBack,
  actions = [],
  children,
  style,
}: ScreenHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon name="arrow-left" size={iconSize.lg} color={colors.textPrimary} />
          </Pressable>
        ) : null}

        <View style={styles.titleBlock}>
          <AppText variant="h1" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="bodySecondary" numberOfLines={1}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        {actions.map(action => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            hitSlop={layout.hitSlop}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Icon
              name={action.icon}
              size={iconSize.lg}
              color={action.tone ?? colors.primary}
            />
          </Pressable>
        ))}
      </View>

      {children ? <View style={styles.children}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  titleBlock: { flex: 1, marginRight: spacing.sm },
  iconButton: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
  },
  pressed: { opacity: 0.6 },
  children: { marginTop: spacing.sm },
});
