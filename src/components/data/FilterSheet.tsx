import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Icon from '../ui/Icon';
import {
  borderRadius,
  colors,
  elevation,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../constants';

type FilterSheetProps = {
  visible: boolean;
  title: string;
  /** Dismissed without applying — the backdrop, the close button or Back. */
  onDismiss: () => void;
  onApply: () => void;
  /** Omitted when nothing is filtered, so the footer keeps one clear action. */
  onClear?: () => void;
  applyLabel?: string;
  children: React.ReactNode;
};

/**
 * Bottom sheet the list screens put their filters in.
 *
 * Filters used to expand inline, which pushed the rows down the moment they
 * were opened and moved them back on apply. A sheet leaves the list where it
 * is, gives the controls room to breathe, and — because the caller edits a
 * draft and commits it on Apply — costs one refetch instead of one per tap.
 */
export default function FilterSheet({
  visible,
  title,
  onDismiss,
  onApply,
  onClear,
  applyLabel = strings.common.apply,
  children,
}: FilterSheetProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable
        style={styles.backdrop}
        onPress={onDismiss}
        accessibilityRole="button"
        accessibilityLabel={strings.common.close}
      >
        {/* Taps inside the sheet must not reach the dismissing backdrop. */}
        <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <AppText variant="h3" style={styles.title}>
              {title}
            </AppText>

            <Pressable
              onPress={onDismiss}
              accessibilityRole="button"
              accessibilityLabel={strings.common.close}
              hitSlop={layout.hitSlop}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Icon name="close" size={iconSize.md} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>

          <View style={styles.footer}>
            {onClear ? (
              <AppButton
                label={strings.common.clearFilters}
                variant="outline"
                onPress={onClear}
                style={styles.footerButton}
              />
            ) : null}

            <AppButton
              label={applyLabel}
              onPress={onApply}
              style={styles.footerButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    maxHeight: '85%',
    ...(elevation.card as object),
  },
  handle: {
    alignSelf: 'center',
    width: spacing.giant,
    height: spacing.xs,
    borderRadius: borderRadius.circle,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center' },
  title: { flex: 1 },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
  },
  pressed: { opacity: 0.6 },
  body: { flexGrow: 0 },
  bodyContent: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  footer: { flexDirection: 'row', gap: spacing.md },
  footerButton: { flex: 1 },
});
