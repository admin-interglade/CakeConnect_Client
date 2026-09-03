import type { AuditEntry } from '../../types/admin';
import { apiGetPaged } from '../api';
import { toAuditEntry, type ApiAuditLog } from '../mappers';

/**
 * Audit trail — PRD section 3: actor, timestamp and before/after for every
 * financial or administrative action.
 *
 * Endpoints: `/audit-logs`. ADMIN only, and it takes no date range, so the
 * trail cannot be filtered by period yet.
 */
export async function getShopAudit(shopId: string): Promise<AuditEntry[]> {
  const page = await apiGetPaged<ApiAuditLog>('/audit-logs', {
    // The backend writes entityType in PascalCase ("User"), so shops are "Shop".
    entityType: 'Shop',
    entityId: shopId,
    page: 1,
    limit: 50,
  });

  return page.items.map(toAuditEntry);
}
