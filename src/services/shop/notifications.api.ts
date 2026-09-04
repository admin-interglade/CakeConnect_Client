import type { Pagination } from '../../types/admin';
import type {
  NotificationFeed,
  NotificationSetting,
  NotificationType,
} from '../../types/shop';
import { apiGet, apiPatch, httpClient, type ApiEnvelope } from '../api';
import {
  isMuteableNotification,
  notificationTypeCodec,
  toNotificationFeed,
  toNotificationSettings,
  type ApiNotificationFeed,
  type ApiNotificationPreference,
} from '../mappers';

/**
 * The in-app notification centre — FR-43 to FR-45.
 *
 * Endpoints: `/notifications`, `/notifications/:id/read`,
 * `/notifications/read-all`, `/notifications/preferences`.
 *
 * What works: the feed, unread counts, marking read, and per-event preferences.
 *
 * What does not: delivery. FR-43 asks for push with SMS fallback. The backend
 * writes notification rows but calls no push or SMS provider (its Firebase
 * config is read and never used), and the app has no messaging SDK installed.
 * So these are notifications the shop will see when it opens the app, not ones
 * that will reach a closed phone. See docs/api-gaps.md G21.
 */

/**
 * `GET /notifications` nests its rows under `data.notifications` and puts the
 * row count in `meta.total`, so neither `apiGet` nor `apiGetPaged` fits: one
 * drops the meta, the other expects `data` to be an array.
 */
export async function getNotifications(
  pagination: Pagination,
  options: { unreadOnly?: boolean } = {},
): Promise<NotificationFeed> {
  const response = await httpClient.request<ApiEnvelope<ApiNotificationFeed>>({
    method: 'GET',
    url: '/notifications',
    params: {
      page: pagination.page,
      limit: pagination.limit,
      ...(options.unreadOnly ? { unreadOnly: true } : {}),
    },
  });

  const body = response.data;
  return toNotificationFeed(body?.data ?? {}, body?.meta?.total ?? 0);
}

/** FR-44 — the badge on the account tab, without pulling the whole feed. */
export async function getUnreadCount(): Promise<number> {
  const feed = await getNotifications({ page: 1, limit: 1 }, { unreadOnly: true });
  return feed.unreadCount;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await apiPatch(`/notifications/${notificationId}/read`, {});
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiPatch('/notifications/read-all', {});
}

/* -------------------------------------------------------------------------- */
/* Preferences — FR-45                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The backend stores a preference row only once one has been changed, so the
 * list it returns is partial. The mapper fills the rest from the codec's own
 * event list using the server's column defaults.
 */
export async function getNotificationSettings(): Promise<NotificationSetting[]> {
  const rows = await apiGet<ApiNotificationPreference[]>(
    '/notifications/preferences',
  );

  return toNotificationSettings(Array.isArray(rows) ? rows : []);
}

/**
 * FR-45 — financial and cut-off alerts cannot be muted.
 *
 * `PATCH /notifications/preferences` will happily accept `push: false` for an
 * overdue-payment alert, so the rule is enforced here: a request to mute a
 * critical category is refused rather than sent. The UI locks those toggles
 * too, but a rule that only exists in a disabled switch is not a rule.
 * See docs/api-gaps.md G17.
 */
export class ProtectedNotification extends Error {
  constructor(type: NotificationType) {
    super(
      `${type} is a cut-off or financial alert and cannot be muted (PRD FR-45).`,
    );
    this.name = 'ProtectedNotification';
  }
}

export async function updateNotificationSetting(
  type: NotificationType,
  channels: { push?: boolean; sms?: boolean; email?: boolean },
): Promise<void> {
  if (channels.push === false && !isMuteableNotification(type)) {
    throw new ProtectedNotification(type);
  }

  await apiPatch('/notifications/preferences', {
    type: notificationTypeCodec.toApi(type),
    ...channels,
  });
}
