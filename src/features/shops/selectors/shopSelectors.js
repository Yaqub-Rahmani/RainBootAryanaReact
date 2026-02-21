import { createSelector } from "@reduxjs/toolkit";
import { shopsSelectors } from "../slices/shopSlice";

// RAW
export const selectShopState = (state) => state.shop;
export const selectShopStatus = (state) => state.shop?.status || "idle";
export const selectShopError = (state) => state.shop?.error || null;
export const selectShopFilters = (state) => state.shop?.filters || {};

// Entity adapter based
export const selectShops = shopsSelectors.selectAll;
export const selectShopById = shopsSelectors.selectById;

// DETAILS (ileride sayfalama için kullanırsan)
export const selectShopDetailsPaged = (state) =>
  state.shop?.details || {
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
  };

// WITH-SHARES
export const selectShopShares = (state) => state.shop?.shares?.list || [];
export const selectShopSharesStatus = (state) =>
  state.shop?.shares?.status || "idle";
export const selectShopSharesError = (state) =>
  state.shop?.shares?.error || null;
export const selectShopSharesLastOwner = (state) =>
  state.shop?.shares?.lastOwnerId || null;

// DERIVED
export const selectMyShops = createSelector([selectShopShares], (list) =>
  list.filter((x) => Number(x.percentMy) > 0)
);
export const selectOpenShops = createSelector([selectShopShares], (list) =>
  list.filter((x) => Number(x.percentOpen) > 0)
);
export const selectFullShops = createSelector([selectShopShares], (list) =>
  list.filter((x) => Number(x.percentOpen) <= 0)
);
export const selectMultiOwnerShops = createSelector(
  [selectShopShares],
  (list) => list.filter((x) => Number(x.ownersCount) > 1)
);

export const selectSharesSummary = createSelector(
  [selectShopShares],
  (list) => {
    const total = list.length;
    const myTotal = list.reduce(
      (acc, x) => acc + (Number(x.percentMy) || 0),
      0
    );
    const openAvg = total
      ? list.reduce(
          (acc, x) => acc + (Number(x.percentOpen) || 0),
          0
        ) / total
      : 0;
    return { total, myTotal, openAvg };
  }
);

// --- FRANCHISE OWNER SHOPS SELECTORS ---
export const selectOwnerShops = (s) =>
  s.shop?.ownerShops?.list || [];
export const selectOwnerShopsStatus = (s) =>
  s.shop?.ownerShops?.status || "idle";
export const selectOwnerShopsError = (s) =>
  s.shop?.ownerShops?.error || null;
export const selectOwnerShopsLastId = (s) =>
  s.shop?.ownerShops?.lastOwnerId || null;

// AVAILABLE FOR CONTRACTS
export const selectAvailableShopsForContracts = (s) =>
  s.shop?.availableForContracts?.list || [];
export const selectAvailableShopsForContractsStatus = (s) =>
  s.shop?.availableForContracts?.status || "idle";
export const selectAvailableShopsForContractsError = (s) =>
  s.shop?.availableForContracts?.error || null;
