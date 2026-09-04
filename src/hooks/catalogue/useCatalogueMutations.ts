import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  addPriceListItems,
  assignPriceListToShop,
  clearProductAvailability,
  createCategory,
  createPriceList,
  createProduct,
  deleteCategory,
  deletePriceList,
  deleteProduct,
  removePriceListItem,
  setProductAvailability,
  updateCategory,
  updatePriceList,
  updatePriceListItem,
  updateProduct,
} from '../../services/admin';
import { describeApiError } from '../../services/api';
import { queryKeys } from '../queryKeys';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import type {
  CategoryInput,
  PriceListInput,
  ProductAvailabilityInput,
  ProductInput,
} from '../../types/admin';

/**
 * FR-5, FR-6 and FR-15 writes.
 *
 * Every mutation invalidates the catalogue tree, so the product table, the
 * category list and the price-list tab all reflect a change together, and
 * reports its outcome through the shared toast rather than leaving each screen
 * to do it. None of these is optimistic: the server assigns ids, coerces prices
 * and enforces sku uniqueness, so its answer is the one worth showing.
 */
export function useCatalogueMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.catalogue.all });
  };

  const succeed = (message: string) => () => {
    invalidate();
    toast.show(message, { tone: 'success' });
  };

  const fail = (error: unknown) =>
    toast.show(describeApiError(error), { tone: 'error' });

  /* Products — FR-5 */

  const createProductMutation = useMutation({
    mutationFn: (input: ProductInput) => createProduct(input),
    onSuccess: succeed(strings.catalogue.productCreated),
    onError: fail,
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: ProductInput }) =>
      updateProduct(productId, input),
    onSuccess: succeed(strings.catalogue.productUpdated),
    onError: fail,
  });

  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => deleteProduct(productId),
    onSuccess: succeed(strings.catalogue.productDeleted),
    onError: fail,
  });

  /* Availability — FR-5. Write-only; nothing reads it back (gap G15). */

  const setAvailability = useMutation({
    mutationFn: ({
      productId,
      input,
    }: {
      productId: string;
      input: ProductAvailabilityInput;
    }) => setProductAvailability(productId, input),
    onSuccess: succeed(strings.catalogue.availabilitySaved),
    onError: fail,
  });

  const clearAvailability = useMutation({
    mutationFn: ({ productId, date }: { productId: string; date: string }) =>
      clearProductAvailability(productId, date),
    onSuccess: succeed(strings.catalogue.availabilityCleared),
    onError: fail,
  });

  /* Categories — FR-15 */

  const createCategoryMutation = useMutation({
    mutationFn: (input: CategoryInput) => createCategory(input),
    onSuccess: succeed(strings.catalogue.categoryCreated),
    onError: fail,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: CategoryInput }) =>
      updateCategory(categoryId, input),
    onSuccess: succeed(strings.catalogue.categoryUpdated),
    onError: fail,
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: string) => deleteCategory(categoryId),
    onSuccess: succeed(strings.catalogue.categoryDeleted),
    onError: fail,
  });

  /* Price lists — FR-6 */

  const createPriceListMutation = useMutation({
    mutationFn: (input: PriceListInput) => createPriceList(input),
    onSuccess: succeed(strings.catalogue.priceListCreated),
    onError: fail,
  });

  const updatePriceListMutation = useMutation({
    mutationFn: ({
      priceListId,
      input,
    }: {
      priceListId: string;
      input: PriceListInput;
    }) => updatePriceList(priceListId, input),
    onSuccess: succeed(strings.catalogue.priceListUpdated),
    onError: fail,
  });

  const deletePriceListMutation = useMutation({
    mutationFn: (priceListId: string) => deletePriceList(priceListId),
    onSuccess: succeed(strings.catalogue.priceListDeleted),
    onError: fail,
  });

  const addItems = useMutation({
    mutationFn: ({
      priceListId,
      items,
    }: {
      priceListId: string;
      items: { productId: string; price: number }[];
    }) => addPriceListItems(priceListId, items),
    onSuccess: succeed(strings.catalogue.itemsAdded),
    onError: fail,
  });

  const updateItemPrice = useMutation({
    mutationFn: ({
      priceListId,
      itemId,
      price,
    }: {
      priceListId: string;
      itemId: string;
      price: number;
    }) => updatePriceListItem(priceListId, itemId, price),
    onSuccess: succeed(strings.catalogue.itemUpdated),
    onError: fail,
  });

  const removeItem = useMutation({
    mutationFn: ({
      priceListId,
      productId,
    }: {
      priceListId: string;
      productId: string;
    }) => removePriceListItem(priceListId, productId),
    onSuccess: succeed(strings.catalogue.itemRemoved),
    onError: fail,
  });

  const assignToShop = useMutation({
    mutationFn: ({ shopId, priceListId }: { shopId: string; priceListId: string }) =>
      assignPriceListToShop(shopId, priceListId),
    onSuccess: () => {
      invalidate();
      // The shop's own detail carries the assignment, so it refreshes too.
      queryClient.invalidateQueries({ queryKey: queryKeys.shops.all });
      toast.show(strings.catalogue.priceListAssigned, { tone: 'success' });
    },
    onError: fail,
  });

  return {
    createProduct: createProductMutation,
    updateProduct: updateProductMutation,
    deleteProduct: deleteProductMutation,
    setAvailability,
    clearAvailability,
    createCategory: createCategoryMutation,
    updateCategory: updateCategoryMutation,
    deleteCategory: deleteCategoryMutation,
    createPriceList: createPriceListMutation,
    updatePriceList: updatePriceListMutation,
    deletePriceList: deletePriceListMutation,
    addItems,
    updateItemPrice,
    removeItem,
    assignToShop,
  };
}

export default useCatalogueMutations;
