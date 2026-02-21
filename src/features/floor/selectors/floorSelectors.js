const selectSlice = (state) => state.floor;

export const selectFloors = createSelector([selectSlice], (s) => s.items);
export const selectFloorDetails = createSelector([selectSlice], (s) => s.details);
export const selectFloorTotal = createSelector([selectSlice], (s) => s.total);
export const selectSelectedFloor = createSelector([selectSlice], (s) => s.selected);
export const selectSelectedFloorDetail = createSelector([selectSlice], (s) => s.selectedDetail);

export const selectSelectedMarketId = createSelector([selectSlice], (s) => s.selectedMarketId);
export const selectStatusFilter = createSelector([selectSlice], (s) => s.statusFilter);

export const selectPagination = createSelector([selectSlice], (s) => s.pagination);

export const selectLoading = createSelector([selectSlice], (s) => s.loading);
export const selectSaving = createSelector([selectSlice], (s) => s.saving);
export const selectError = createSelector([selectSlice], (s) => s.error);
export const selectLastMessage = createSelector([selectSlice], (s) => s.lastMessage);