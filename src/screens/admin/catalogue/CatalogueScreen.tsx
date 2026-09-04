import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import {
  AppButton,
  AppText,
  ConfirmDialog,
  DataTable,
  Dropdown,
  EmptyState,
  ErrorState,
  FilterBar,
  InlineMessage,
  ModalForm,
  Pagination as PaginationBar,
  Screen,
  ScreenHeader,
  SearchInput,
  SectionCard,
  SegmentedTabs,
  SkeletonList,
  StatusBadge,
  type DataTableColumn,
  type DropdownOption,
  type FormField,
  type FormValues,
  type SegmentedTab,
} from '../../../components';
import { colors, spacing, strings } from '../../../constants';
import {
  defaultCataloguePagination,
  defaultProductFilters,
  useCatalogue,
  useCatalogueMutations,
} from '../../../hooks';
import { formatCurrency, formatNumber } from '../../../utils/format';
import type {
  Category,
  Pagination,
  PriceListDetail,
  Product,
  ProductFilters,
  ProductStatus,
} from '../../../types/admin';

type CatalogueTab = 'products' | 'categories' | 'priceLists';

/** FR-5 / FR-6 / FR-15 — products, categories and price lists in one screen. */
export default function CatalogueScreen() {
  const navigation = useNavigation();

  const [tab, setTab] = React.useState<CatalogueTab>('products');
  const [filters, setFilters] = React.useState<ProductFilters>(defaultProductFilters);
  const [pagination, setPagination] = React.useState<Pagination>(
    defaultCataloguePagination,
  );

  const [productForm, setProductForm] = React.useState<Product | 'new' | null>(null);
  const [categoryForm, setCategoryForm] = React.useState<Category | 'new' | null>(null);
  const [priceListForm, setPriceListForm] = React.useState<
    PriceListDetail | 'new' | null
  >(null);
  const [availabilityFor, setAvailabilityFor] = React.useState<Product | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<
    | { kind: 'product'; row: Product }
    | { kind: 'category'; row: Category }
    | { kind: 'priceList'; row: PriceListDetail }
    | null
  >(null);

  const { products, total, categories, priceLists, isLoading, isError, error, refetch } =
    useCatalogue(filters, pagination);

  const mutations = useCatalogueMutations();

  /** Any filter change resets to page 1, or the user lands on an empty page. */
  const updateFilters = (partial: Partial<ProductFilters>) => {
    setFilters(current => ({ ...current, ...partial }));
    setPagination(current => ({ ...current, page: 1 }));
  };

  const categoryOptions: DropdownOption<string>[] = [
    { value: 'all', label: strings.common.all },
    ...categories.map(category => ({ value: category.id, label: category.name })),
  ];

  const tabs: SegmentedTab<CatalogueTab>[] = [
    {
      key: 'products',
      label: strings.catalogue.tabs.products,
      badge: total,
    },
    {
      key: 'categories',
      label: strings.catalogue.tabs.categories,
      badge: categories.length,
    },
    {
      key: 'priceLists',
      label: strings.catalogue.tabs.priceLists,
      badge: priceLists.length,
    },
  ];

  const activeFilterCount =
    (filters.status === 'all' ? 0 : 1) + (filters.categoryId === 'all' ? 0 : 1);

  const columns: DataTableColumn<Product>[] = [
    {
      key: 'name',
      title: strings.catalogue.columns.product,
      width: 170,
      render: row => row.name,
    },
    { key: 'sku', title: strings.catalogue.columns.sku, width: 110, render: row => row.sku },
    {
      key: 'category',
      title: strings.catalogue.columns.category,
      width: 130,
      render: row =>
        row.categoryName ??
        categories.find(category => category.id === row.categoryId)?.name ??
        '-',
    },
    {
      key: 'price',
      title: strings.catalogue.columns.price,
      width: 110,
      align: 'right',
      render: row => formatCurrency(row.basePrice),
    },
    { key: 'unit', title: strings.catalogue.columns.unit, width: 80, render: row => row.unit },
    {
      key: 'moq',
      title: strings.catalogue.columns.moq,
      width: 70,
      align: 'right',
      render: row => formatNumber(row.moq),
    },
    {
      key: 'packSize',
      title: strings.catalogue.columns.packSize,
      width: 90,
      align: 'right',
      render: row => formatNumber(row.packSize),
    },
    {
      key: 'status',
      title: strings.catalogue.columns.status,
      width: 120,
      render: row => <StatusBadge status={row.status} compact />,
    },
    {
      key: 'actions',
      title: '',
      width: 190,
      render: row => (
        <View style={styles.rowActions}>
          <AppButton
            label={strings.catalogue.availabilityTitle}
            variant="link"
            onPress={() => setAvailabilityFor(row)}
          />
          <AppButton
            label={strings.common.deactivate}
            variant="link"
            onPress={() => setPendingDelete({ kind: 'product', row })}
          />
        </View>
      ),
    },
  ];

  const productFields = React.useMemo<FormField[]>(
    () => [
      {
        name: 'name',
        label: strings.catalogue.fields.name,
        type: 'text',
        required: true,
      },
      {
        // Required by POST /products and unique across the catalogue.
        name: 'sku',
        label: strings.catalogue.fields.sku,
        type: 'text',
        required: true,
      },
      {
        name: 'categoryId',
        label: strings.catalogue.fields.category,
        type: 'select',
        required: true,
        options: categories.map(category => ({
          value: category.id,
          label: category.name,
        })),
      },
      { name: 'description', label: strings.catalogue.fields.description, type: 'textarea' },
      { name: 'imageUrl', label: strings.catalogue.fields.imageUrl, type: 'text' },
      {
        name: 'unit',
        label: strings.catalogue.fields.unit,
        type: 'text',
        required: true,
        hint: 'e.g. piece, kg, box',
      },
      {
        name: 'basePrice',
        label: strings.catalogue.fields.basePrice,
        type: 'number',
        required: true,
        validate: value =>
          Number(value) >= 0 ? undefined : strings.catalogue.errors.price,
      },
      {
        name: 'moq',
        label: strings.catalogue.fields.moq,
        type: 'number',
        required: true,
        validate: value =>
          Number.isInteger(Number(value)) && Number(value) >= 1
            ? undefined
            : strings.catalogue.errors.quantity,
      },
      {
        name: 'packSize',
        label: strings.catalogue.fields.packSize,
        type: 'number',
        required: true,
        validate: value =>
          Number.isInteger(Number(value)) && Number(value) >= 1
            ? undefined
            : strings.catalogue.errors.quantity,
      },
      {
        name: 'status',
        label: strings.catalogue.fields.status,
        type: 'select',
        options: [
          { value: 'active', label: strings.catalogue.columns.status },
        ],
      },
    ],
    [categories],
  );

  const submitProduct = (values: FormValues) => {
    const input = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      categoryId: values.categoryId,
      description: values.description.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      unit: values.unit.trim(),
      basePrice: Number(values.basePrice),
      moq: Number(values.moq),
      packSize: Number(values.packSize),
    };

    const done = { onSuccess: () => setProductForm(null) };

    if (productForm === 'new') {
      mutations.createProduct.mutate(input, done);
    } else if (productForm) {
      mutations.updateProduct.mutate({ productId: productForm.id, input }, done);
    }
  };

  const submitCategory = (values: FormValues) => {
    const input = {
      name: values.name.trim(),
      description: values.description.trim() || undefined,
      leadTimeHours: Number(values.leadTimeHours),
    };

    const done = { onSuccess: () => setCategoryForm(null) };

    if (categoryForm === 'new') {
      mutations.createCategory.mutate(input, done);
    } else if (categoryForm) {
      mutations.updateCategory.mutate({ categoryId: categoryForm.id, input }, done);
    }
  };

  const submitPriceList = (values: FormValues) => {
    const input = {
      name: values.name.trim(),
      region: values.region.trim() || undefined,
      description: values.description.trim() || undefined,
    };

    const done = { onSuccess: () => setPriceListForm(null) };

    if (priceListForm === 'new') {
      mutations.createPriceList.mutate(input, done);
    } else if (priceListForm) {
      mutations.updatePriceList.mutate(
        { priceListId: priceListForm.id, input },
        done,
      );
    }
  };

  const submitAvailability = (values: FormValues) => {
    if (!availabilityFor) {
      return;
    }

    mutations.setAvailability.mutate(
      {
        productId: availabilityFor.id,
        input: {
          date: values.date.trim(),
          available: values.available !== 'false',
          note: values.note.trim() || undefined,
        },
      },
      { onSuccess: () => setAvailabilityFor(null) },
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) {
      return;
    }

    const done = { onSuccess: () => setPendingDelete(null) };

    if (pendingDelete.kind === 'product') {
      mutations.deleteProduct.mutate(pendingDelete.row.id, done);
    } else if (pendingDelete.kind === 'category') {
      mutations.deleteCategory.mutate(pendingDelete.row.id, done);
    } else {
      mutations.deletePriceList.mutate(pendingDelete.row.id, done);
    }
  };

  if (isError) {
    return (
      <Screen>
        <ScreenHeader
          title={strings.catalogue.title}
          onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
        />
        <ErrorState message={error} onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen scrollable>
      <ScreenHeader
        title={strings.catalogue.title}
        subtitle={strings.catalogue.subtitle}
        onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      />

      <SegmentedTabs tabs={tabs} value={tab} onChange={setTab} style={styles.tabs} />

      {tab === 'products' ? (
        <View>
          <FilterBar
            primary={
              <SearchInput
                value={filters.search}
                onChangeText={search => updateFilters({ search })}
                placeholder={strings.catalogue.searchPlaceholder}
              />
            }
            activeCount={activeFilterCount}
            onClear={() => updateFilters({ status: 'all', categoryId: 'all' })}
          >
            <Dropdown
              label={strings.catalogue.statusLabel}
              value={filters.status}
              options={statusOptions}
              onChange={status => updateFilters({ status })}
            />
            <Dropdown
              label={strings.catalogue.categoryLabel}
              value={filters.categoryId}
              options={categoryOptions}
              onChange={categoryId => updateFilters({ categoryId })}
            />
          </FilterBar>

          <AppButton
            label={strings.catalogue.addProduct}
            icon="plus"
            onPress={() => setProductForm('new')}
            // A product needs a category, so creation waits for one to exist.
            disabled={categories.length === 0}
            style={styles.action}
          />

          {isLoading ? (
            <SkeletonList rows={6} />
          ) : products.length === 0 ? (
            <EmptyState
              icon="cake-variant-outline"
              title={strings.catalogue.emptyProducts}
            />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={products}
                keyExtractor={row => row.id}
                onRowPress={row => setProductForm(row)}
              />
              <PaginationBar
                page={pagination.page}
                limit={pagination.limit}
                total={total}
                onChangePage={page => setPagination(current => ({ ...current, page }))}
              />
            </>
          )}
        </View>
      ) : null}

      {tab === 'categories' ? (
        <View>
          <AppButton
            label={strings.catalogue.addCategory}
            icon="plus"
            onPress={() => setCategoryForm('new')}
            style={styles.action}
          />

          {categories.length === 0 ? (
            <EmptyState
              icon="shape-outline"
              title={strings.catalogue.emptyCategories}
            />
          ) : (
            categories.map(category => (
              <SectionCard
                key={category.id}
                title={category.name}
                actionLabel={strings.common.edit}
                actionIcon="pencil-outline"
                onAction={() => setCategoryForm(category)}
                style={styles.card}
              >
                <AppText variant="caption" style={styles.listMeta}>
                  {`${strings.catalogue.productCount(
                    category.productCount,
                  )} · ${strings.catalogue.leadTime(category.leadTimeHours)}`}
                </AppText>

                {category.description ? (
                  <AppText variant="bodySecondary">{category.description}</AppText>
                ) : null}

                <AppButton
                  label={strings.common.deactivate}
                  variant="link"
                  onPress={() => setPendingDelete({ kind: 'category', row: category })}
                />
              </SectionCard>
            ))
          )}
        </View>
      ) : null}

      {tab === 'priceLists' ? (
        <View>
          <AppButton
            label={strings.catalogue.addPriceList}
            icon="plus"
            onPress={() => setPriceListForm('new')}
            style={styles.action}
          />

          {priceLists.length === 0 ? (
            <EmptyState icon="tag-outline" title={strings.catalogue.emptyPriceLists} />
          ) : (
            priceLists.map(list => (
              <SectionCard
                key={list.id}
                title={list.name}
                actionLabel={strings.common.edit}
                actionIcon="pencil-outline"
                onAction={() => setPriceListForm(list)}
                style={styles.card}
              >
                <AppText variant="caption" style={styles.listMeta}>
                  {strings.catalogue.itemCount(list.items.length)}
                </AppText>

                {list.items.map(item => (
                  <View key={item.id} style={styles.itemRow}>
                    <AppText variant="body" style={styles.itemName}>
                      {item.productName}
                    </AppText>
                    <AppText variant="body">{formatCurrency(item.price)}</AppText>
                  </View>
                ))}

                <AppButton
                  label={strings.common.deactivate}
                  variant="link"
                  onPress={() => setPendingDelete({ kind: 'priceList', row: list })}
                />
              </SectionCard>
            ))
          )}

          {/* FR-6 — the field is stored but cannot be resolved to any shop. */}
          <InlineMessage tone="info" icon="information-outline" style={styles.notice}>
            {strings.catalogue.regionUnsupported}
          </InlineMessage>
        </View>
      ) : null}

      <ModalForm
        visible={productForm !== null}
        title={
          productForm === 'new'
            ? strings.catalogue.productTitle
            : strings.catalogue.productEditTitle
        }
        fields={productFields.filter(field => field.name !== 'status')}
        initialValues={{
          name: productForm !== 'new' ? productForm?.name ?? '' : '',
          sku: productForm !== 'new' ? productForm?.sku ?? '' : '',
          categoryId:
            productForm !== 'new'
              ? productForm?.categoryId ?? ''
              : categories[0]?.id ?? '',
          description: productForm !== 'new' ? productForm?.description ?? '' : '',
          imageUrl: productForm !== 'new' ? productForm?.imageUrl ?? '' : '',
          unit: productForm !== 'new' ? productForm?.unit ?? '' : 'piece',
          basePrice: productForm !== 'new' ? String(productForm?.basePrice ?? '') : '',
          moq: productForm !== 'new' ? String(productForm?.moq ?? 1) : '1',
          packSize: productForm !== 'new' ? String(productForm?.packSize ?? 1) : '1',
        }}
        submitting={
          mutations.createProduct.isPending || mutations.updateProduct.isPending
        }
        onSubmit={submitProduct}
        onDismiss={() => setProductForm(null)}
      />

      <ModalForm
        visible={categoryForm !== null}
        title={
          categoryForm === 'new'
            ? strings.catalogue.categoryTitle
            : strings.catalogue.categoryEditTitle
        }
        fields={categoryFields}
        initialValues={{
          name: categoryForm !== 'new' ? categoryForm?.name ?? '' : '',
          description: categoryForm !== 'new' ? categoryForm?.description ?? '' : '',
          leadTimeHours:
            categoryForm !== 'new' ? String(categoryForm?.leadTimeHours ?? 0) : '0',
        }}
        submitting={
          mutations.createCategory.isPending || mutations.updateCategory.isPending
        }
        onSubmit={submitCategory}
        onDismiss={() => setCategoryForm(null)}
      />

      <ModalForm
        visible={priceListForm !== null}
        title={
          priceListForm === 'new'
            ? strings.catalogue.priceListTitle
            : strings.catalogue.priceListEditTitle
        }
        fields={priceListFields}
        initialValues={{
          name: priceListForm !== 'new' ? priceListForm?.name ?? '' : '',
          region: priceListForm !== 'new' ? priceListForm?.region ?? '' : '',
          description: priceListForm !== 'new' ? priceListForm?.description ?? '' : '',
        }}
        submitting={
          mutations.createPriceList.isPending || mutations.updatePriceList.isPending
        }
        onSubmit={submitPriceList}
        onDismiss={() => setPriceListForm(null)}
      />

      <ModalForm
        visible={availabilityFor !== null}
        title={strings.catalogue.availabilityTitle}
        fields={availabilityFields}
        initialValues={{ date: '', available: 'true', note: '' }}
        submitting={mutations.setAvailability.isPending}
        onSubmit={submitAvailability}
        onDismiss={() => setAvailabilityFor(null)}
      />

      <ConfirmDialog
        visible={pendingDelete !== null}
        title={
          pendingDelete?.kind === 'category'
            ? strings.catalogue.deleteCategoryTitle
            : pendingDelete?.kind === 'priceList'
            ? strings.catalogue.deletePriceListTitle
            : strings.catalogue.deleteProductTitle
        }
        message={deleteMessage(pendingDelete)}
        destructive
        onConfirm={confirmDelete}
        onDismiss={() => setPendingDelete(null)}
      />
    </Screen>
  );
}

/** Blocks the delete when a category still holds products (FR-15). */
function deleteMessage(
  pending:
    | { kind: 'product'; row: Product }
    | { kind: 'category'; row: Category }
    | { kind: 'priceList'; row: PriceListDetail }
    | null,
): string {
  if (!pending) {
    return '';
  }
  if (pending.kind === 'category') {
    return pending.row.productCount > 0
      ? strings.catalogue.categoryInUse(pending.row.productCount)
      : strings.catalogue.deleteCategoryMessage(pending.row.name);
  }
  if (pending.kind === 'priceList') {
    return strings.catalogue.deletePriceListMessage(pending.row.name);
  }
  return strings.catalogue.deleteProductMessage(pending.row.name);
}

const statusOptions: DropdownOption<ProductStatus | 'all'>[] = [
  { value: 'all', label: strings.common.all },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'unavailable', label: 'Unavailable' },
];

const categoryFields: FormField[] = [
  { name: 'name', label: strings.catalogue.fields.name, type: 'text', required: true },
  { name: 'description', label: strings.catalogue.fields.description, type: 'textarea' },
  {
    // FR-15 — categories needing more than a day's notice carry it here.
    name: 'leadTimeHours',
    label: strings.catalogue.fields.leadTimeHours,
    type: 'number',
    required: true,
    hint: 'Zero for standard next-day delivery.',
    validate: value =>
      Number.isInteger(Number(value)) && Number(value) >= 0
        ? undefined
        : strings.catalogue.errors.leadTime,
  },
];

const priceListFields: FormField[] = [
  { name: 'name', label: strings.catalogue.fields.name, type: 'text', required: true },
  {
    name: 'region',
    label: strings.catalogue.fields.region,
    type: 'text',
    hint: strings.catalogue.regionUnsupported,
  },
  { name: 'description', label: strings.catalogue.fields.description, type: 'textarea' },
];

const availabilityFields: FormField[] = [
  {
    name: 'date',
    label: strings.catalogue.fields.date,
    type: 'text',
    required: true,
    placeholder: 'YYYY-MM-DD',
    validate: value =>
      /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
        ? undefined
        : strings.catalogue.errors.date,
  },
  {
    name: 'available',
    label: strings.catalogue.fields.available,
    type: 'select',
    required: true,
    options: [
      { value: 'true', label: 'Available' },
      { value: 'false', label: 'Unavailable' },
    ],
  },
  { name: 'note', label: strings.catalogue.fields.description, type: 'text' },
];

const styles = StyleSheet.create({
  tabs: { marginBottom: spacing.md },
  action: { marginVertical: spacing.md },
  card: { marginBottom: spacing.sm },
  listMeta: { color: colors.textMuted, marginBottom: spacing.sm },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  itemName: { flex: 1, marginRight: spacing.sm },
  notice: { marginTop: spacing.md },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
