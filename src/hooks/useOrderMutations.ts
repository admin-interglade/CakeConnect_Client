import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  bulkUpdateOrderStatus,
  captureShortSupply,
  exportOrders,
  exportProductionRequirement,
  reopenOrder,
  updateOrderStatus,
} from '../services/adminApi';
import { describeApiError } from '../services/httpClient';
import { queryKeys } from './queryKeys';
import { useToast } from '../components/feedback';
import { strings } from '../constants';
import type {
  ExportFormat,
  Order,
  OrderFilters,
  OrderStatus,
  ShortSupplyLine,
} from '../types/admin';

/**
 * FR-40, FR-18 and FR-24 writes.
 *
 * The single-order transition updates its cache entry optimistically so the
 * timeline advances the instant the admin confirms; on failure the snapshot is
 * put back, which is what "optimistic-safe" means for the bulk queue too.
 */
export function useOrderMutations() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const invalidateOrders = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
  };

  const updateStatus = useMutation({
    mutationFn: ({
      orderId,
      status,
      payload,
    }: {
      orderId: string;
      status: OrderStatus;
      payload?: { deliveredQty?: Record<string, number> };
    }) => updateOrderStatus(orderId, status, payload),

    onMutate: async variables => {
      const key = queryKeys.orders.detail(variables.orderId);
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData<Order>(key);
      if (previous) {
        queryClient.setQueryData<Order>(key, { ...previous, status: variables.status });
      }

      return { previous, key };
    },

    onError: (error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
      toast.show(describeApiError(error), { tone: 'error' });
    },

    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
      invalidateOrders();
      toast.show(strings.orderDetails.statusUpdated, { tone: 'success' });
    },
  });

  /**
   * Sent as one request so a mid-queue failure cannot leave half the selection
   * moved; on failure nothing is marked as changed.
   */
  const bulkUpdateStatus = useMutation({
    mutationFn: ({ orderIds, status }: { orderIds: string[]; status: OrderStatus }) =>
      bulkUpdateOrderStatus(orderIds, status),
    onSuccess: (_data, variables) => {
      invalidateOrders();
      toast.show(strings.orders.bulkDone(variables.orderIds.length), { tone: 'success' });
    },
    onError: error =>
      toast.show(`${strings.orders.bulkFailed} ${describeApiError(error)}`, {
        tone: 'error',
      }),
  });

  /**
   * FR-40 — the shortfall declared ahead of delivery. It only rewrites the
   * quantities, so the detail screen is refetched rather than patched: the
   * server decides which lines end up flagged short.
   */
  const shortSupply = useMutation({
    mutationFn: ({ orderId, lines }: { orderId: string; lines: ShortSupplyLine[] }) =>
      captureShortSupply(orderId, lines),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
      invalidateOrders();
      toast.show(strings.shortSupply.recorded, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /** FR-18 — always carries a reason, which the API writes to the audit trail. */
  const reopen = useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      reopenOrder(orderId, reason),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.orders.detail(variables.orderId),
      });
      invalidateOrders();
      toast.show(strings.orderDetails.reopenDone, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  const exportList = useMutation({
    mutationFn: ({ filters, format }: { filters: OrderFilters; format: ExportFormat }) =>
      exportOrders(filters, format),
    onSuccess: (_data, variables) =>
      toast.show(strings.orders.exportStarted(variables.format), { tone: 'success' }),
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  /** FR-37 — the kitchen's copy of tomorrow's consolidated requirement. */
  const exportProduction = useMutation({
    mutationFn: ({
      deliveryDate,
      format,
    }: {
      deliveryDate: string;
      format: ExportFormat;
    }) => exportProductionRequirement(deliveryDate, format),
    onSuccess: (_data, variables) =>
      toast.show(strings.orders.exportStarted(variables.format), { tone: 'success' }),
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return {
    updateStatus,
    bulkUpdateStatus,
    shortSupply,
    reopen,
    exportList,
    exportProduction,
  };
}

export default useOrderMutations;
