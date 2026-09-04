import React from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { fetchOwnShops } from '../../services/auth';
import { setActiveShop, setShops, type AssignedShop } from '../../store/authSlice';
import type { AppDispatch, RootState } from '../../store/store';

type ActiveShop = {
  /** Empty string when the session carries no outlet, which every query guards on. */
  shopId: string;
  shop?: AssignedShop;
  /** FR-4 — every outlet this login can act on. */
  shops: AssignedShop[];
  /** True when the switcher is worth showing at all. */
  hasMultipleOutlets: boolean;
  switchTo: (shopId: string) => void;
  /** Re-reads `GET /shops` and replaces the list. */
  refresh: () => void;
  isRefreshing: boolean;
};

/**
 * FR-4 — one owner may hold several outlets under a single login and switch
 * between them.
 *
 * Every shop-scoped hook reads its outlet from here rather than from the store
 * directly, so the switcher only has to change one value for the whole surface
 * to follow: the id is part of every query key, so switching outlets refetches
 * rather than showing the previous outlet's cached figures.
 *
 * The list itself is resolved once, at sign-in, and then persisted. That makes
 * `refresh` necessary rather than a nicety: anything the admin changes
 * afterwards — assigning a first shop, adding a second outlet — is otherwise
 * invisible until the owner signs out and back in.
 *
 * A shop owner whose session carries no outlet is a real state — the admin
 * created the user but has not assigned a shop yet — so this returns an empty
 * id rather than throwing, and the screens say so explicitly.
 */
export function useActiveShop(): ActiveShop {
  const dispatch = useDispatch<AppDispatch>();
  const shops = useSelector((state: RootState) => state.auth.shops);
  const activeShopId = useSelector((state: RootState) => state.auth.activeShopId);

  const [isRefreshing, setRefreshing] = React.useState(false);

  const shop = shops.find(item => item.id === activeShopId) ?? shops[0];

  const switchTo = React.useCallback(
    (shopId: string) => {
      dispatch(setActiveShop(shopId));
    },
    [dispatch],
  );

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      // No explicit token: this runs inside a live session, so the stored one
      // is the right credential.
      dispatch(setShops(await fetchOwnShops()));
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  return {
    shopId: shop?.id ?? '',
    shop,
    shops,
    hasMultipleOutlets: shops.length > 1,
    switchTo,
    // `fetchOwnShops` swallows its own failures and answers with an empty
    // list, so there is nothing here that can reject.
    refresh: () => {
      refresh().catch(() => undefined);
    },
    isRefreshing,
  };
}

export default useActiveShop;
