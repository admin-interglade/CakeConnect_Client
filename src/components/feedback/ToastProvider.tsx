import React from 'react';
import { StyleSheet } from 'react-native';
import { Portal, Snackbar } from 'react-native-paper';

import AppText from '../ui/AppText';
import { borderRadius, colors, spacing } from '../../constants';

export type ToastTone = 'success' | 'error' | 'info';

type ToastOptions = { tone?: ToastTone; action?: { label: string; onPress: () => void } };

type ToastContextValue = {
  show: (message: string, options?: ToastOptions) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

const toneColors: Record<ToastTone, string> = {
  success: colors.success,
  error: colors.error,
  info: colors.secondary,
};

/**
 * App-wide toast, built on Paper's Snackbar so no extra dependency is needed.
 * Mutations report their outcome through this rather than each screen owning
 * its own banner state.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [tone, setTone] = React.useState<ToastTone>('info');
  const [action, setAction] = React.useState<ToastOptions['action']>(undefined);

  const show = React.useCallback((next: string, options?: ToastOptions) => {
    setMessage(next);
    setTone(options?.tone ?? 'info');
    setAction(options?.action);
    setVisible(true);
  }, []);

  const value = React.useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Portal>
        <Snackbar
          visible={visible}
          onDismiss={() => setVisible(false)}
          duration={tone === 'error' ? 6000 : 3500}
          style={[styles.snackbar, { backgroundColor: toneColors[tone] }]}
          action={
            action ? { label: action.label, onPress: action.onPress } : undefined
          }
        >
          <AppText variant="body" color={colors.textInverse}>
            {message}
          </AppText>
        </Snackbar>
      </Portal>
    </ToastContext.Provider>
  );
}

/**
 * Returns a no-op outside a provider so a screen rendered in isolation (a test,
 * a storybook entry) still mounts instead of throwing.
 */
export function useToast(): ToastContextValue {
  const context = React.useContext(ToastContext);
  const fallback = React.useMemo<ToastContextValue>(() => ({ show: () => {} }), []);
  return context ?? fallback;
}

const styles = StyleSheet.create({
  snackbar: {
    borderRadius: borderRadius.md,
    marginHorizontal: spacing.lg,
  },
});

export default ToastProvider;
