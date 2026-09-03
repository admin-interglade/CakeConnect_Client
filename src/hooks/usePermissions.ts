import { useSelector } from 'react-redux';

import type { RootState } from '../store/store';
import type { UserRole } from '../store/authSlice';

export type Permissions = {
  role?: UserRole;
  /** True for the franchise owner, who has full network control. */
  isAdmin: boolean;
  /** True for admin-delegated staff working the order queue. */
  isSupportStaff: boolean;
  /**
   * PRD §3 — support staff have "read-mostly access for order processing,
   * without financial controls". Gates ledger adjustments, credit notes,
   * credit-limit edits and the payment-confirmation queue (FR-41).
   *
   * The backend already restricts those endpoints to ADMIN, so this is not the
   * security boundary — it exists so support staff are never offered a button
   * whose only possible outcome is a 403.
   */
  canManageFinancials: boolean;
  /** FR-2, FR-3 — creating shops and changing their status. */
  canManageShops: boolean;
  /** FR-40 — moving orders through the fulfilment workflow. */
  canProcessOrders: boolean;
};

/** Role-derived capabilities, read from the persisted session. */
export function usePermissions(): Permissions {
  const role = useSelector((state: RootState) => state.auth.user?.role);

  const isAdmin = role === 'admin';
  const isSupportStaff = role === 'supportStaff';

  return {
    role,
    isAdmin,
    isSupportStaff,
    canManageFinancials: isAdmin,
    canManageShops: isAdmin,
    canProcessOrders: isAdmin || isSupportStaff,
  };
}

export default usePermissions;
