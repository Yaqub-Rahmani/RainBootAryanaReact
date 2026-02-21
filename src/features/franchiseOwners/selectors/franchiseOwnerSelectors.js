import { createSelector } from "@reduxjs/toolkit";

/* ---------------- constants (stable refs) ---------------- */

const EMPTY_ARR = [];
const DEFAULT_FILTERS = { active: null };

/* ---------------- base slice ---------------- */

export const selectFranchiseOwnersState = (s) => s.franchiseOwner;

/* ---------------- basic owners ---------------- */

export const selectFranchiseOwners = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.list ?? EMPTY_ARR
);

export const selectFranchiseOwnersStatus = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.status ?? "idle"
);

export const selectFranchiseOwnersError = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.error ?? null
);

export const selectFranchiseOwnerFilters = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.filters ?? DEFAULT_FILTERS
);

/* ---------------- owner views ---------------- */

export const selectOwnerViewsState = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.ownerViews
);

export const selectOwnerViewsPaged = createSelector(
  [selectOwnerViewsState],
  (v) => v?.paged
);

export const selectOwnerViewsList = createSelector(
  [selectOwnerViewsState],
  (v) => v?.list ?? EMPTY_ARR
);

export const selectOwnerViewStatus = createSelector(
  [selectOwnerViewsState],
  (v) => v?.status ?? "idle"
);

export const selectOwnerViewError = createSelector(
  [selectOwnerViewsState],
  (v) => v?.error ?? null
);

export const selectOwnerViewTable = createSelector(
  [selectOwnerViewsState],
  (v) => v?.table
);

/* ---------------- owner profile ---------------- */

export const selectOwnerProfileState = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.ownerProfile
);

export const selectOwnerProfile = createSelector(
  [selectOwnerProfileState],
  (p) => p?.data
);

export const selectOwnerProfileStatus = createSelector(
  [selectOwnerProfileState],
  (p) => p?.status ?? "idle"
);

export const selectOwnerProfileError = createSelector(
  [selectOwnerProfileState],
  (p) => p?.error ?? null
);

// ✅ FIX: referans stabil meta
export const selectOwnerProfileMeta = createSelector(
  [selectOwnerProfileStatus, selectOwnerProfileError],
  (status, error) => ({ status, error })
);


/* ---------------- owner ledger ---------------- */

export const selectOwnerLedgerState = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.ownerLedger
);

export const selectOwnerLedgerPaged = createSelector(
  [selectOwnerLedgerState],
  (v) => v?.paged
);

export const selectOwnerLedgerItems = createSelector(
  [selectOwnerLedgerPaged],
  (p) => p?.items ?? EMPTY_ARR
);

export const selectOwnerLedgerTotals = createSelector(
  [selectOwnerLedgerState],
  (v) => v?.totals ?? { totalIn: 0, totalOut: 0, net: 0 }
);

export const selectOwnerLedgerStatus = createSelector(
  [selectOwnerLedgerState],
  (v) => v?.status ?? "idle"
);

export const selectOwnerLedgerError = createSelector(
  [selectOwnerLedgerState],
  (v) => v?.error ?? null
);

export const selectOwnerLedgerTable = createSelector(
  [selectOwnerLedgerState],
  (v) => v?.table
);

export const selectOwnerLedgerMeta = createSelector(
  [selectOwnerLedgerStatus, selectOwnerLedgerError],
  (status, error) => ({ status, error })
);
export const selectOwnerLedgerSummary = createSelector(
  [selectFranchiseOwnersState],
  (st) => st?.ownerLedger?.summary ?? null
);