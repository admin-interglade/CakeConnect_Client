import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  ProtectedNotification,
  getNotificationSettings,
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationSetting,
} from '../../services/shop';
import { describeApiError } from '../../services/api';
import { useToast } from '../../components/feedback';
import { strings } from '../../constants';
import { queryKeys } from '../queryKeys';
import type { Pagination } from '../../types/admin';
import type {
  AppNotification,
  NotificationSetting,
  NotificationType,
} from '../../types/shop';

export const defaultNotificationPagination: Pagination = { page: 1, limit: 25 };

/** The unread badge is polled rather than pushed — see the note below. */
const UNREAD_POLL_MS = 60_000;

type NotificationsResult = {
  notifications: AppNotification[];
  unreadCount: number;
  total: number;
  isLoading: boolean;
  isError: boolean;
  error?: string;
  isRefetching: boolean;
  refetch: () => void;
  markRead: (notificationId: string) => void;
  markAllRead: () => void;
  isMarkingAll: boolean;
};

/**
 * FR-43 / FR-44 — the in-app notification centre.
 *
 * The delivery half of FR-43 is not implemented anywhere: the backend writes
 * notification rows but calls no push or SMS provider, and the app has no
 * messaging SDK. So these arrive when the shop opens the app, not on a locked
 * phone. Until a provider is wired, the unread count is polled on a slow timer
 * so a cut-off reminder at least surfaces while the app is open.
 * See docs/api-gaps.md G21.
 */
export function useNotifications(pagination: Pagination): NotificationsResult {
  const queryClient = useQueryClient();
  const toast = useToast();

  const feed = useQuery({
    queryKey: queryKeys.shop.notifications(pagination),
    queryFn: () => getNotifications(pagination),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['shop', 'notifications'] });
  };

  const markRead = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: invalidate,
    // Marking one row read is not worth interrupting anyone over; the row
    // simply stays bold until the next refresh.
    onError: () => undefined,
  });

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      invalidate();
      toast.show(strings.notifications.allRead, { tone: 'success' });
    },
    onError: error => toast.show(describeApiError(error), { tone: 'error' }),
  });

  return {
    notifications: feed.data?.items ?? [],
    unreadCount: feed.data?.unreadCount ?? 0,
    total: feed.data?.total ?? 0,
    isLoading: feed.isLoading,
    isError: feed.isError && feed.data === undefined,
    error: feed.error ? describeApiError(feed.error) : undefined,
    isRefetching: feed.isRefetching,
    refetch: () => {
      feed.refetch();
    },
    markRead: id => markRead.mutate(id),
    markAllRead: () => markAllRead.mutate(),
    isMarkingAll: markAllRead.isPending,
  };
}

/** FR-44 — the badge on the account tab, without pulling the whole feed. */
export function useUnreadNotificationCount(): number {
  const query = useQuery({
    queryKey: queryKeys.shop.unreadCount,
    queryFn: getUnreadCount,
    refetchInterval: UNREAD_POLL_MS,
    staleTime: UNREAD_POLL_MS,
  });

  return query.data ?? 0;
}

type NotificationSettingsResult = {
  settings: NotificationSetting[];
  isLoading: boolean;
  isError: boolean;
  error?: string;
  update: (type: NotificationType, channels: { push?: boolean; sms?: boolean }) => void;
  isUpdating: boolean;
};

/**
 * FR-45 — users can mute non-critical categories; financial and cut-off alerts
 * cannot be muted.
 *
 * The backend accepts muting anything, so the rule lives in the service, which
 * refuses the request outright. This hook turns that refusal into copy rather
 * than a network error, because it is a rule the shop should understand rather
 * than a failure it should retry.
 */
export function useNotificationSettings(): NotificationSettingsResult {
  const queryClient = useQueryClient();
  const toast = useToast();

  const query = useQuery({
    queryKey: queryKeys.shop.notificationSettings,
    queryFn: getNotificationSettings,
  });

  const update = useMutation({
    mutationFn: (variables: {
      type: NotificationType;
      channels: { push?: boolean; sms?: boolean };
    }) => updateNotificationSetting(variables.type, variables.channels),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.shop.notificationSettings,
      });
    },

    onError: error => {
      if (error instanceof ProtectedNotification) {
        toast.show(strings.notifications.cannotMute, { tone: 'info' });
        return;
      }
      toast.show(describeApiError(error), { tone: 'error' });
    },
  });

  return {
    settings: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ? describeApiError(query.error) : undefined,
    update: (type, channels) => update.mutate({ type, channels }),
    isUpdating: update.isPending,
  };
}

export default useNotifications;
