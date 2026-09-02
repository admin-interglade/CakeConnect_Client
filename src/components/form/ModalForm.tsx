import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';
import Dropdown, { type DropdownOption } from './Dropdown';
import Icon from '../ui/Icon';
import InlineMessage from '../ui/InlineMessage';
import LabeledInput from './LabeledInput';
import {
  borderRadius,
  colors,
  iconSize,
  layout,
  spacing,
  strings,
} from '../../constants';

export type FormFieldType = 'text' | 'tel' | 'email' | 'number' | 'textarea' | 'select';

export type FormField = {
  name: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  /** Shown under the field when there is no error. */
  hint?: string;
  /** Required for `select`. */
  options?: DropdownOption<string>[];
  /** Field-specific rule; return the message to show, or undefined when valid. */
  validate?: (value: string, values: FormValues) => string | undefined;
};

export type FormValues = Record<string, string>;

type ModalFormProps = {
  visible: boolean;
  title: string;
  fields: FormField[];
  initialValues: FormValues;
  submitLabel?: string;
  submitting?: boolean;
  /** Surfaced above the buttons when the submit itself failed. */
  errorMessage?: string;
  onSubmit: (values: FormValues) => void;
  onDismiss: () => void;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Full-screen modal form used for shop create/edit and ledger adjustments.
 *
 * Validation runs on submit and then live per field, which keeps a half-typed
 * phone number from being marked wrong while the user is still typing it.
 */
export default function ModalForm({
  visible,
  title,
  fields,
  initialValues,
  submitLabel = strings.common.save,
  submitting = false,
  errorMessage,
  onSubmit,
  onDismiss,
}: ModalFormProps) {
  const insets = useSafeAreaInsets();
  const [values, setValues] = React.useState<FormValues>(initialValues);
  const [errors, setErrors] = React.useState<FormValues>({});
  const [submitted, setSubmitted] = React.useState(false);

  // Re-seed whenever the form is reopened, so an abandoned edit does not leak
  // into the next one.
  React.useEffect(() => {
    if (visible) {
      setValues(initialValues);
      setErrors({});
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const validateField = React.useCallback(
    (field: FormField, value: string, allValues: FormValues): string | undefined => {
      const trimmed = value.trim();

      if (field.required && !trimmed) {
        return strings.shopDetails.errors.required;
      }
      if (!trimmed) {
        return undefined;
      }
      if (field.type === 'email' && !emailPattern.test(trimmed)) {
        return strings.shopDetails.errors.email;
      }
      if (field.type === 'tel' && !/^\d{10}$/.test(trimmed.replace(/\D/g, ''))) {
        return strings.shopDetails.errors.phone;
      }
      if (field.type === 'number' && Number.isNaN(Number(trimmed))) {
        return strings.shopDetails.errors.required;
      }
      return field.validate?.(trimmed, allValues);
    },
    [],
  );

  const setValue = (field: FormField, value: string) => {
    const nextValues = { ...values, [field.name]: value };
    setValues(nextValues);

    if (submitted || errors[field.name]) {
      const message = validateField(field, value, nextValues);
      setErrors(current => ({ ...current, [field.name]: message ?? '' }));
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);

    const nextErrors: FormValues = {};
    fields.forEach(field => {
      const message = validateField(field, values[field.name] ?? '', values);
      if (message) {
        nextErrors[field.name] = message;
      }
    });

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onSubmit(values);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onDismiss}
      presentationStyle="fullScreen"
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AppText variant="h2" style={styles.title} numberOfLines={1}>
            {title}
          </AppText>

          <Pressable
            onPress={onDismiss}
            hitSlop={layout.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={strings.common.close}
            style={styles.close}
          >
            <Icon name="close" size={iconSize.lg} color={colors.textSecondary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {fields.map(field => {
              const value = values[field.name] ?? '';
              const error = errors[field.name];

              if (field.type === 'select') {
                return (
                  <View key={field.name} style={styles.field}>
                    <Dropdown
                      label={field.label}
                      value={value}
                      options={field.options ?? []}
                      onChange={next => setValue(field, next)}
                      placeholder={field.placeholder}
                    />
                    {error ? (
                      <InlineMessage tone="error" style={styles.fieldMessage}>
                        {error}
                      </InlineMessage>
                    ) : null}
                  </View>
                );
              }

              return (
                <LabeledInput
                  key={field.name}
                  label={`${field.label}${field.required ? ' *' : ''}`}
                  value={value}
                  onChangeText={next => setValue(field, next)}
                  error={error || undefined}
                  placeholder={field.placeholder}
                  containerStyle={styles.field}
                  multiline={field.type === 'textarea'}
                  numberOfLines={field.type === 'textarea' ? 3 : 1}
                  keyboardType={
                    field.type === 'tel'
                      ? 'phone-pad'
                      : field.type === 'number'
                      ? 'numeric'
                      : field.type === 'email'
                      ? 'email-address'
                      : 'default'
                  }
                  autoCapitalize={
                    field.type === 'email' ? 'none' : field.type === 'text' ? 'words' : 'none'
                  }
                />
              );
            })}

            {errorMessage ? (
              <InlineMessage tone="error" style={styles.formError}>
                {errorMessage}
              </InlineMessage>
            ) : null}
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            <AppButton
              label={strings.common.cancel}
              onPress={onDismiss}
              variant="outline"
              disabled={submitting}
              style={styles.footerButton}
            />
            <AppButton
              label={submitLabel}
              onPress={handleSubmit}
              loading={submitting}
              style={styles.footerButton}
            />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { flex: 1 },
  close: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.circle,
  },
  body: { padding: spacing.lg, paddingBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  fieldMessage: { marginTop: spacing.xs },
  formError: { marginTop: spacing.sm },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    backgroundColor: colors.surface,
  },
  footerButton: { flex: 1 },
});
