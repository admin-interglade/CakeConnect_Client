import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal } from 'react-native-paper';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import { borderRadius, colors, spacing, strings } from '../../constants';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  /** Spell out the consequence — several of these actions are audit-logged. */
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Reddens the confirm button for suspend, deactivate and cancel. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  /** Extra input rendered above the buttons, e.g. the FR-18 reopen reason. */
  children?: React.ReactNode;
};

export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = strings.common.confirm,
  cancelLabel = strings.common.cancel,
  destructive = false,
  loading = false,
  onConfirm,
  onDismiss,
  children,
}: ConfirmDialogProps) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content>
          <AppText variant="h3">{title}</AppText>

          <AppText variant="bodySecondary" style={styles.message}>
            {message}
          </AppText>

          {children ? <View style={styles.slot}>{children}</View> : null}
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          <AppButton
            label={cancelLabel}
            onPress={onDismiss}
            variant="outline"
            disabled={loading}
            style={styles.action}
          />
          <AppButton
            label={confirmLabel}
            onPress={onConfirm}
            loading={loading}
            style={destructive ? styles.destructiveAction : styles.action}
          />
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { backgroundColor: colors.surface, borderRadius: borderRadius.lg },
  message: { marginTop: spacing.sm },
  slot: { marginTop: spacing.lg },
  actions: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.sm },
  action: { flex: 1 },
  destructiveAction: {
    flex: 1,
    backgroundColor: colors.error,
    borderColor: colors.error,
  },
});
