import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { franchiseBalanceEntryService } from "../services/franchiseBalanceEntryService";

// Server-side paged list
export const fetchFranchiseBalanceEntryDetails = createAsyncThunk(
  "franchiseBalanceEntry/fetchDetails",
  async ({ queryOptions = {}, ownerId = null } = {}, thunkApi) => {
    try {
      const res = await franchiseBalanceEntryService.getDetails(queryOptions, ownerId);
      return { res, ownerId, queryOptions };
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
  selectedOwnerId: null,
  lastQueryOptions: null,
  status: "idle",
  error: null,
};

const franchiseBalanceEntrySlice = createSlice({
  name: "franchiseBalanceEntry",
  initialState,
  reducers: {
    setSelectedOwnerId(state, action) {
      state.selectedOwnerId = action.payload ?? null;
    },
    clearDetails(state) {
      state.detailsPaged = { items: [], page: 1, pageSize: 10, totalCount: 0, totalPages: 1 };
      state.lastQueryOptions = null;
      state.error = null;
      state.status = "idle";
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchFranchiseBalanceEntryDetails.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchFranchiseBalanceEntryDetails.fulfilled, (s, a) => {
        s.status = "succeeded";
        const { res, ownerId, queryOptions } = a.payload || {};
        s.selectedOwnerId = ownerId ?? null;
        s.lastQueryOptions = queryOptions ?? null;

        // apiClient bazen direkt objeyi döner; bazen res.data olabilir. (senin örnekte direkt JSON var)
        const data = res?.data ?? res;

        s.detailsPaged = {
          items: Array.isArray(data?.items) ? data.items : [],
          page: Number(data?.page || queryOptions?.page || 1),
          pageSize: Number(data?.pageSize || queryOptions?.pageSize || 10),
          totalCount: Number(data?.totalCount || 0),
          totalPages: Number(data?.totalPages || 1),
        };
      })
      .addCase(fetchFranchiseBalanceEntryDetails.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload || a.error?.message || "Hata";
      });
  },
});

export const { setSelectedOwnerId, clearDetails } = franchiseBalanceEntrySlice.actions;
export default franchiseBalanceEntrySlice.reducer;
