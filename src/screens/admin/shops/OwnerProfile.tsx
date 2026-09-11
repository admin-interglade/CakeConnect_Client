import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  EmptyState,
  ErrorState,
  InfoCard,
  InlineMessage,
  LoadingState,
  ModalForm,
  Screen,
  ScreenHeader,
  SectionCard,
  joinValues,
  splitValues,
  type FormField,
  type FormValues,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import {
  useAvailableShops,
  useOwnerMutations,
  useShopOwnerDetails,
} from '../../../hooks';
import { describeApiError } from '../../../services/api';
import type { AdminShopsStackParamList } from '../../../navigation/types';
import type { AssignedShopSummary, ShopOwnerInput } from '../../../types/admin';

type OwnerProfileNavigation = StackNavigationProp<
  AdminShopsStackParamList,
  'OwnerProfile'
>;
type OwnerProfileRoute = RouteProp<AdminShopsStackParamList, 'OwnerProfile'>;

/**
 * FR-2 shop-owner profile.
 *
 * The entry point beside "Add shop" on the shops list, and the answer to the
 * question that action cannot ask: a shop is created with an owner's *name*,
 * which links no account and lets nobody sign in. This screen creates the
 * account and hands it the shops that have no owner yet.
 *
 * One screen, three modes, like `ShopDetails`: without an `ownerId` it is the
 * create form; with one and `mode: 'edit'` it is that same form filled in with
 * the owner's details (opened from `OwnersList`); otherwise it shows the
 * account, the shops it holds, and the action to give it more.
 */
export default function OwnerProfile() {
  const navigation = useNavigation<OwnerProfileNavigation>();
  const { params } = useRoute<OwnerProfileRoute>();
  const ownerId = params?.ownerId;
  const isCreateMode = !ownerId;
  const isEditMode = Boolean(ownerId) && params?.mode === 'edit';

  const [formOpen, setFormOpen] = React.useState(isCreateMode || isEditMode);
  const [assignOpen, setAssignOpen] = React.useState(false);

  // The form is a native modal, so it is closed before the owners list is
  // pushed; coming back to the create screen opens it again.
  useFocusEffect(
    React.useCallback(() => {
      if (isCreateMode) {
        setFormOpen(true);
      }
    }, [isCreateMode]),
  );

  const { owner, isLoading, isError, error, isRefetching, refetch } =
    useShopOwnerDetails(ownerId);

  const available = useAvailableShops();
  const { create, assignShops, update } = useOwnerMutations();

  const shopOptions = React.useMemo(
    () =>
      available.shops.map(shop => ({
        value: shop.id,
        label: shop.name,
        meta: shop.code,
      })),
    [available.shops],
  );

  /** Turn the picker's ids back into summaries, so a failure can name a shop. */
  const toSummaries = React.useCallback(
    (value: string): AssignedShopSummary[] => {
      const ids = new Set(splitValues(value));
      return available.shops.filter(shop => ids.has(shop.id));
    },
    [available.shops],
  );

  /**
   * The picker is the only field that can be empty for a reason outside the
   * admin's control — every shop may already be owned, or the list may have
   * failed to load. Requiring a selection then would leave them stuck on a form
   * they cannot satisfy, so the field is required only while there is something
   * to choose; the account is still worth creating, and the shops can be
   * assigned from the profile afterwards.
   */
  const shopsField: FormField = React.useMemo(
    () => ({
      name: 'shops',
      label: strings.owners.fields.shops,
      type: 'multiselect',
      required: shopOptions.length > 0,
      options: shopOptions,
      loading: available.isLoading,
      placeholder: strings.owners.shopsPlaceholder,
      hint: available.truncated
        ? strings.owners.shopsTruncated
        : strings.owners.hints.shops,
    }),
    [shopOptions, available.isLoading, available.truncated],
  );

  /*
   * Editing an owner never takes shops away — there is no unassign route — so
   * the picker only adds, is optional, and names what the owner already holds.
   */
  const heldShops = owner?.shops;
  const editShopsField: FormField = React.useMemo(
    () => ({
      ...shopsField,
      label: strings.owners.fields.addShops,
      required: false,
      hint: available.truncated
        ? strings.owners.shopsTruncated
        : heldShops && heldShops.length > 0
        ? strings.owners.hints.heldShops(heldShops.map(shop => shop.name))
        : strings.owners.hints.shops,
    }),
    [shopsField, available.truncated, heldShops],
  );

  const ownerFields = React.useMemo<FormField[]>(
    () => [
      {
        name: 'name',
        label: strings.owners.fields.name,
        type: 'text',
        required: true,
      },
      {
        name: 'phone',
        label: strings.owners.fields.phone,
        type: 'tel',
        required: true,
        hint: isEditMode ? strings.owners.hints.phoneEdit : strings.owners.hints.phone,
      },
      // Required by `docs/prompts/shop-owner-onboarding.md`, which sends the
      // activation link here. That mail does not exist yet, so the hint says so
      // rather than implying the address is about to be written to.
      {
        name: 'email',
        label: strings.owners.fields.email,
        type: 'email',
        required: true,
        hint: isEditMode ? strings.owners.hints.emailEdit : strings.owners.hints.email,
      },
      isEditMode ? editShopsField : shopsField,
    ],
    [shopsField, editShopsField, isEditMode],
  );

  const submitOwner = (values: FormValues) => {
    const input: ShopOwnerInput = {
      name: values.name.trim(),
      phone: values.phone.replace(/\D/g, ''),
      email: values.email.trim() || undefined,
      shops: toSummaries(values.shops ?? ''),
    };

    create.mutate(input, {
      onSuccess: outcome => {
        setFormOpen(false);
        // Replace rather than push: the form is spent, and backing out of the
        // profile should reach the shops list, not re-open a filled-in create.
        navigation.replace('OwnerProfile', {
          ownerId: outcome.owner.id,
          mode: 'view',
        });
      },
    });
  };

  /**
   * Save the details, then go back to the list as soon as they land.
   *
   * Any shops picked are handed over after that without holding the form open:
   * each assignment waits on the server's email, and the details the admin
   * came to fix are already saved. The assignment reports through its own
   * toast, which the closed modal no longer covers.
   */
  const submitEdit = (values: FormValues) => {
    if (!ownerId) {
      return;
    }

    const shops = toSummaries(values.shops ?? '');

    update.mutate(
      {
        ownerId,
        input: {
          name: values.name.trim(),
          phone: values.phone.replace(/\D/g, ''),
          email: values.email.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          if (shops.length > 0) {
            assignShops.mutate({ ownerId, shops });
          }
          setFormOpen(false);
          navigation.goBack();
        },
      },
    );
  };

  const submitAssignment = (values: FormValues) => {
    if (!ownerId) {
      return;
    }

    assignShops.mutate(
      { ownerId, shops: toSummaries(values.shops ?? '') },
      { onSuccess: () => setAssignOpen(false) },
    );
  };

  /** Leave the create form for the owner directory. */
  const openOwnersList = () => {
    setFormOpen(false);
    navigation.navigate('OwnersList');
  };

  /*
   * "Nothing to choose" and "we could not ask" both leave the picker empty and
   * mean opposite things: one says every shop is spoken for, the other says the
   * admin is looking at an incomplete list. They are never collapsed into one
   * message, and a fetch failure is never reported as a fully-owned network.
   */
  const emptyShopPicker =
    !available.isLoading && !available.isError && shopOptions.length === 0;

  const pickerNotice = available.isError
    ? strings.owners.shopsUnavailable
    : emptyShopPicker
    ? strings.owners.shopsEmpty
    : undefined;

  /*
   * A failed submit is also reported inside the form: `ModalForm` is a
   * full-screen native modal, which draws over the app-wide toast, so the toast
   * alone leaves the admin on a form that silently stopped spinning.
   */
  const createError = create.error ? describeApiError(create.error) : undefined;
  const assignError = assignShops.error
    ? describeApiError(assignShops.error)
    : undefined;
  const updateError = update.error ? describeApiError(update.error) : undefined;

  if (isCreateMode) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.owners.createTitle}
          subtitle={strings.owners.createSubtitle}
          onBack={() => navigation.goBack()}
        />

        <ModalForm
          visible={formOpen}
          title={strings.owners.createTitle}
          fields={ownerFields}
          initialValues={{ name: '', phone: '', email: '', shops: '' }}
          submitLabel={strings.owners.submit}
          submitting={create.isPending}
          errorMessage={createError ?? pickerNotice}
          onSubmit={submitOwner}
          headerAction={{
            icon: 'account-group-outline',
            label: strings.owners.listAction,
            onPress: openOwnersList,
          }}
          onDismiss={() => {
            setFormOpen(false);
            navigation.goBack();
          }}
        />
      </Screen>
    );
  }

  if (isEditMode) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.owners.editTitle}
          subtitle={owner?.name}
          onBack={() => navigation.goBack()}
        />

        {isLoading ? (
          <LoadingState />
        ) : isError || !owner ? (
          <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
        ) : null}

        {/*
          Shown only once the owner has loaded: the form seeds its values when
          it becomes visible, so opening it earlier would seed it blank.
        */}
        <ModalForm
          visible={formOpen && Boolean(owner)}
          title={strings.owners.editTitle}
          fields={ownerFields}
          initialValues={{
            name: owner?.name ?? '',
            phone: owner?.phone ?? '',
            email: owner?.email ?? '',
            shops: '',
          }}
          submitLabel={strings.owners.update}
          submitting={update.isPending || assignShops.isPending}
          errorMessage={updateError ?? assignError}
          onSubmit={submitEdit}
          onDismiss={() => {
            update.reset();
            assignShops.reset();
            setFormOpen(false);
            navigation.goBack();
          }}
        />
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen>
        <ScreenHeader title={strings.common.loading} onBack={() => navigation.goBack()} />
        <LoadingState />
      </Screen>
    );
  }

  if (isError || !owner) {
    return (
      <Screen>
        <ScreenHeader title={strings.owners.title} onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.owners.title}
        subtitle={owner.phone}
        onBack={() => navigation.goBack()}
        actions={[
          {
            icon: 'pencil-outline',
            label: strings.owners.editAction,
            onPress: () =>
              navigation.push('OwnerProfile', { ownerId: owner.id, mode: 'edit' }),
          },
          {
            icon: 'store-plus-outline',
            label: strings.owners.assignAction,
            onPress: () => setAssignOpen(true),
          },
        ]}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <SectionCard title={strings.owners.sectionOwner} style={styles.section}>
          <InfoCard
            title={owner.name}
            subtitle={owner.email ?? owner.phone}
            caption={strings.owners.status[owner.status]}
          />
          <InlineMessage tone="info" style={styles.notice}>
            {strings.owners.signInHint}
          </InlineMessage>
        </SectionCard>

        <SectionCard title={strings.owners.sectionShops} style={styles.section}>
          {owner.shops.length > 0 ? (
            <View style={styles.shopList}>
              {owner.shops.map(shop => (
                <InfoCard key={shop.id} title={shop.name} subtitle={shop.code} />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="storefront-outline"
              title={strings.owners.noShopsAssigned}
              actionLabel={pickerNotice ? undefined : strings.owners.assignAction}
              onAction={pickerNotice ? undefined : () => setAssignOpen(true)}
            />
          )}
        </SectionCard>
      </ScrollView>

      <ModalForm
        visible={assignOpen}
        title={strings.owners.assignTitle}
        fields={[shopsField]}
        initialValues={{ shops: joinValues([]) }}
        submitLabel={strings.owners.assignAction}
        submitting={assignShops.isPending}
        errorMessage={assignError ?? pickerNotice}
        onSubmit={submitAssignment}
        onDismiss={() => {
          // Reopening should start clean, not with the last attempt's error.
          assignShops.reset();
          setAssignOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { marginBottom: spacing.md },
  notice: { marginTop: spacing.sm },
  shopList: { gap: spacing.sm },
});
