import React from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import {
  EmptyState,
  ErrorState,
  OwnerCard,
  Pagination,
  Screen,
  ScreenHeader,
  SearchInput,
  SkeletonList,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import { defaultOwnerPagination, useShopOwners } from '../../../hooks';
import type { AdminShopsStackParamList } from '../../../navigation/types';
import type { Pagination as PaginationState } from '../../../types/admin';

type OwnersListNavigation = StackNavigationProp<AdminShopsStackParamList, 'OwnersList'>;

/**
 * FR-2 owner directory, reached from the "Assign shops to an owner" form.
 *
 * Every owner account with the shops it holds. A card opens the same owner
 * form in edit mode; saving it comes back here.
 */
export default function OwnersList() {
  const navigation = useNavigation<OwnersListNavigation>();

  const [search, setSearch] = React.useState('');
  const [pagination, setPagination] =
    React.useState<PaginationState>(defaultOwnerPagination);

  const { owners, total, isLoading, isError, error, isRefetching, refetch } =
    useShopOwners(search, pagination);

  /** A new search resets to page 1, or the admin lands on an empty page. */
  const updateSearch = (next: string) => {
    setSearch(next);
    setPagination(current => ({ ...current, page: 1 }));
  };

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={strings.owners.listTitle} onBack={() => navigation.goBack()} />
        <ErrorState message={error} onRetry={refetch} retrying={isRefetching} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader
        title={strings.owners.listTitle}
        subtitle={strings.owners.listSubtitle}
        onBack={() => navigation.goBack()}
      />

      {/*
        Outside the list rather than its header: a header rebuilt on each
        render remounts the input and drops the keyboard mid-search.
      */}
      <View style={styles.search}>
        <SearchInput
          value={search}
          onChangeText={updateSearch}
          placeholder={strings.owners.searchPlaceholder}
          testID="owners-search"
        />
      </View>

      <FlatList
        data={owners}
        keyExtractor={owner => owner.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => (
          <OwnerCard
            owner={item}
            // Push, not navigate: the create form below this screen is also an
            // `OwnerProfile`, and navigate would pop back to it instead.
            onPress={() =>
              navigation.push('OwnerProfile', { ownerId: item.id, mode: 'edit' })
            }
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <SkeletonList rows={6} />
          ) : (
            <EmptyState
              icon="account-group-outline"
              title={search ? strings.owners.listEmptySearch : strings.owners.listEmpty}
              actionLabel={search ? strings.common.clearFilters : undefined}
              onAction={search ? () => updateSearch('') : undefined}
            />
          )
        }
        ListFooterComponent={
          owners.length > 0 ? (
            <Pagination
              page={pagination.page}
              limit={pagination.limit}
              total={total}
              onChangePage={page => setPagination(current => ({ ...current, page }))}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  search: { marginBottom: spacing.md },
  content: { paddingBottom: spacing.xxl },
});
