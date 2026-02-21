import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { marketService } from "../services/marketService";

// ---- Thunks ----
export const fetchMarkets = createAsyncThunk(
  "market/fetchAll",
  async ({ status = null } = {}) => {
    const res = await marketService.getAll({ status });
    return res; // apiClient doğrudan JSON dizi döndürüyor
  }
);

export const fetchMarketDetails = createAsyncThunk(
  "market/fetchDetails",
  async ({ queryOptions = {}, status = null } = {}) => {
    const res = await marketService.getDetails(queryOptions, status);
    return { res, status };
  }
);

export const addMarket = createAsyncThunk("market/add", async (dto) => {
  const res = await marketService.add(dto);
  return res; // created Market objesi
});

export const updateMarket = createAsyncThunk("market/update", async ({ id, dto }) => {
  await marketService.update(id, dto);
  return { id, dto };
});

export const removeMarket = createAsyncThunk("market/remove", async (id) => {
  await marketService.remove(id);
  return { id };
});

export const activateMarket = createAsyncThunk("market/activate", async (id) => {
  await marketService.activate(id);
  return { id };
});
export const deactivateMarket = createAsyncThunk("market/deactivate", async (id) => {
  await marketService.deactivate(id);
  return { id };
});

// ---- State ----
const initialState = {
  list: [],         // sade liste
  details: [],      // details endpointinden gelen liste
  status: "idle",
  detailsStatus: "idle",
  error: null,
};

const marketSlice = createSlice({
  name: "market",
  initialState,
  reducers: {
    clearMarketDetails(state) {
      state.details = [];
    },
  },
  extraReducers: (b) => {
    // fetchAll
    b.addCase(fetchMarkets.pending,   (s)    => { s.status = "loading"; s.error = null; })
     .addCase(fetchMarkets.fulfilled, (s, a) => {
       s.status = "succeeded";
       s.list = Array.isArray(a.payload) ? a.payload : [];
     })
     .addCase(fetchMarkets.rejected,  (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; });

    // fetchDetails
    b.addCase(fetchMarketDetails.pending,   (s)    => { s.detailsStatus = "loading"; s.error = null; })
     .addCase(fetchMarketDetails.fulfilled, (s, a) => {
       s.detailsStatus = "succeeded";
       const { res } = a.payload || {};
       s.details = Array.isArray(res) ? res : (res?.items || res?.data || []);
     })
     .addCase(fetchMarketDetails.rejected,  (s, a) => { s.detailsStatus = "failed"; s.error = a.error?.message || "Hata"; });

    // add
    b.addCase(addMarket.fulfilled, (s, a) => {
      const item = a.payload;
      if (!item) return;
      if (!Array.isArray(s.list)) s.list = [];
      if (!s.list.some(x => x.id === item.id)) s.list.push(item);
    });

    // update (optimistic local patch)
    b.addCase(updateMarket.fulfilled, (s, a) => {
      const { id, dto } = a.payload || {};
      const i = s.list.findIndex(x => x.id === id);
      if (i >= 0) s.list[i] = { ...s.list[i], ...dto };
      const j = s.details.findIndex(x => x.id === id);
      if (j >= 0) s.details[j] = { ...s.details[j], ...dto };
    });

    // remove
    b.addCase(removeMarket.fulfilled, (s, a) => {
      const { id } = a.payload || {};
      s.list = (s.list || []).filter(x => x.id !== id);
      s.details = (s.details || []).filter(x => x.id !== id);
    });

    // activate/deactivate (basit flag güncelle)
    b.addCase(activateMarket.fulfilled, (s, a) => {
      const { id } = a.payload || {};
      const patch = (arr) => {
        const k = arr.findIndex(x => x.id === id);
        if (k >= 0) arr[k] = { ...arr[k], isActive: true };
      };
      patch(s.list); patch(s.details);
    });
    b.addCase(deactivateMarket.fulfilled, (s, a) => {
      const { id } = a.payload || {};
      const patch = (arr) => {
        const k = arr.findIndex(x => x.id === id);
        if (k >= 0) arr[k] = { ...arr[k], isActive: false };
      };
      patch(s.list); patch(s.details);
    });
  },
});

export const { clearMarketDetails } = marketSlice.actions;
export default marketSlice.reducer;
