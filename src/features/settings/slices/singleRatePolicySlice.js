import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { singleRatePolicyService } from "../services/singleRatePolicyService";

const toArray = (p) => (Array.isArray(p) ? p : []);

const initialState = {
  list: [],
  current: null,
  currentStatus: "idle",
  listStatus: "idle",
  error: null,

  currentByType: null,
  currentByTypeStatus: "idle",
};

// Liste
export const fetchSingleRatePolicies = createAsyncThunk(
  "singleRatePolicy/fetchAll",
  async () => {
    return await singleRatePolicyService.getAll();
  }
);

// Tek kayıt (id ile)
export const fetchSingleRatePolicy = createAsyncThunk(
  "singleRatePolicy/fetchOne",
  async (id) => {
    return await singleRatePolicyService.get(id);
  }
);

// Belirli type için tüm kayıtlar
export const fetchSingleRateByType = createAsyncThunk(
  "singleRatePolicy/fetchByType",
  async (type) => {
    return await singleRatePolicyService.getByType(type);
  }
);

// Belirli type için geçerli oran
export const fetchCurrentSingleRate = createAsyncThunk(
  "singleRatePolicy/fetchCurrent",
  async ({ type, asOfUtc }) => {
    return await singleRatePolicyService.getCurrent(type, asOfUtc);
  }
);

// Ekle
export const addSingleRatePolicy = createAsyncThunk(
  "singleRatePolicy/add",
  async (dto) => {
    return await singleRatePolicyService.add(dto);
  }
);

// Güncelle
export const updateSingleRatePolicy = createAsyncThunk(
  "singleRatePolicy/update",
  async ({ id, dto }) => {
    await singleRatePolicyService.update(id, dto);
    return dto; // dto.id olduğunu varsayıyoruz
  }
);

// Sil
export const removeSingleRatePolicy = createAsyncThunk(
  "singleRatePolicy/remove",
  async (id) => {
    await singleRatePolicyService.remove(id);
    return id;
  }
);

const singleRatePolicySlice = createSlice({
  name: "singleRatePolicy",
  initialState,
  reducers: {
    setCurrentSingleRatePolicy: (state, action) => {
      state.current = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Liste
      .addCase(fetchSingleRatePolicies.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchSingleRatePolicies.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.list = toArray(action.payload);
      })
      .addCase(fetchSingleRatePolicies.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Tek kayıt
      .addCase(fetchSingleRatePolicy.pending, (state) => {
        state.currentStatus = "loading";
        state.error = null;
      })
      .addCase(fetchSingleRatePolicy.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload || null;
      })
      .addCase(fetchSingleRatePolicy.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Type'a göre liste
      .addCase(fetchSingleRateByType.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchSingleRateByType.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.list = toArray(action.payload);
      })
      .addCase(fetchSingleRateByType.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // current/{type}
      .addCase(fetchCurrentSingleRate.pending, (state) => {
        state.currentByTypeStatus = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentSingleRate.fulfilled, (state, action) => {
        state.currentByTypeStatus = "succeeded";
        state.currentByType = action.payload || null;
      })
      .addCase(fetchCurrentSingleRate.rejected, (state, action) => {
        state.currentByTypeStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Add
      .addCase(addSingleRatePolicy.fulfilled, (state, action) => {
        if (action.payload?.id) {
          state.list.push(action.payload);
        }
      })

      // Update
      .addCase(updateSingleRatePolicy.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.list.findIndex((x) => x.id === updated.id);
        if (idx >= 0) state.list[idx] = { ...state.list[idx], ...updated };
        if (state.current?.id === updated.id) {
          state.current = { ...state.current, ...updated };
        }
      })

      // Delete
      .addCase(removeSingleRatePolicy.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = state.list.filter((x) => x.id !== id);
        if (state.current?.id === id) {
          state.current = null;
        }
      });
  },
});

export const { setCurrentSingleRatePolicy } = singleRatePolicySlice.actions;
export default singleRatePolicySlice.reducer;
