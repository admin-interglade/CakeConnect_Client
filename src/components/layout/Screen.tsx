import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, spacing } from '../../constants';

type ScreenProps = {
  children: React.ReactNode;
  /** Wraps content in a ScrollView — use on any screen with text inputs. */
  scrollable?: boolean;
  /** Pins content to the vertical centre, as on splash / all-set. */
  centerContent?: boolean;
  contentContainerStyle?: ViewStyle;
  /** Rendered outside the scroll area, pinned above the bottom inset. */
  footer?: React.ReactNode;
};

/**
 * Shared chrome for the auth screens: safe-area insets, cream background,
 * status bar styling and keyboard avoidance in one place.
 */
export default function Screen({
  children,
  scrollable = false,
  centerContent = false,
  contentContainerStyle,
  footer,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const bottomInset = Math.max(insets.bottom, spacing.lg);

  const padding: ViewStyle = {
    paddingTop: insets.top + spacing.sm,
  };

  const body = (
    <View style={[styles.body, padding, centerContent && styles.centered, contentContainerStyle]}>
      {children}
    </View>
  );

  return (
    <View style={styles.root}>
      {/* RN 0.87 drives the Android status bar background from the theme,
          so only the content style is set here. */}
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scrollable ? (
          <ScrollView
            style={styles.root}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          body
        )}

        {footer ? (
          <View style={[styles.footer, { paddingBottom: bottomInset }]}>
            {footer}
          </View>
        ) : (
          <View style={[styles.spacer]} />
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: {
    flex: 1,
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  centered: { justifyContent: 'center' },
  scrollContent: { flexGrow: 1 },
  footer: {
    width: '100%',
    alignSelf: 'center',
    maxWidth: layout.maxContentWidth,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingTop: spacing.sm,
  },
  spacer: { width: '100%' },
});
