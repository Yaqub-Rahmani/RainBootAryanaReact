import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { familyBalanceEntryService } from "../service/familyBalanceEntryService";

// Server-side paged list
export const fetchFamilyBalanceEntryDetails = createAsyncThunk(
  "familyBalanceEntry/fetchDetails",
  async ({ queryOptions = {}, familyMemberId = null } = {}, thunkApi) => {
    try {
      const res = await familyBalanceEntryService.getDetails(queryOptions, familyMemberId);
      return { res, familyMemberId, queryOptions };
    } catch (err) {
      return thunkApi.rejectWithValue(err?.message || "Hata");
    }
  }
);

const initialState = {
  detailsPaged: {
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
    totalPages: 1,
  },
  selectedFamilyMemberId: null,
  lastQueryOptions: null,
  status: "idle",
  error: null,
};

const familyBalanceEntrySlice = createSlice({
  name: "familyBalanceEntry",
  initialState,
  reducers: {
    setSelectedFamilyMemberId(state, action) {
      state.selectedFamilyMemberId = action.payload ?? null;
    },
    clearDetails(state) {
      state.detailsPaged = { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 };
      state.lastQueryOptions = null;
      state.error = null;
      state.status = "idle";
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchFamilyBalanceEntryDetails.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchFamilyBalanceEntryDetails.fulfilled, (s, a) => {
        s.status = "succeeded";
        const { res, familyMemberId, queryOptions } = a.payload || {};
        s.selectedFamilyMemberId = familyMemberId ?? null;
        s.lastQueryOptions = queryOptions ?? null;

        const data = res?.data ?? res;
        const page = data?.page ?? data;

        s.detailsPaged = {
          items: Array.isArray(page?.items) ? page.items : [],
          page: Number(page?.page || queryOptions?.page || 1),
          pageSize: Number(page?.pageSize || queryOptions?.pageSize || 10),
          totalCount: Number(page?.totalCount || 0),
          totalPages: Number(page?.totalPages || 1),
        };
      })
      .addCase(fetchFamilyBalanceEntryDetails.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload || a.error?.message || "Hata";
      });
  },
});

export const { setSelectedFamilyMemberId, clearDetails } = familyBalanceEntrySlice.actions;
export default familyBalanceEntrySlice.reducer;
