import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { familySharePolicyService } from "../services/familySharePolicyService";

const toArray = (p) => (Array.isArray(p) ? p : []);

const initialState = {
  list: [],
  current: null,
  currentStatus: "idle",
  listStatus: "idle",
  currentPolicy: null,       // /current endpoint sonucu
  currentPolicyStatus: "idle",
  error: null,
};

// Thunk'lar
export const fetchFamilySharePolicies = createAsyncThunk(
  "familySharePolicy/fetchAll",
  async () => {
    return await familySharePolicyService.getAll();
  }
);

export const fetchFamilySharePolicy = createAsyncThunk(
  "familySharePolicy/fetchOne",
  async (id) => {
    return await familySharePolicyService.get(id);
  }
);

export const fetchCurrentFamilySharePolicy = createAsyncThunk(
  "familySharePolicy/fetchCurrent",
  async (asOfUtc) => {
    return await familySharePolicyService.getCurrent(asOfUtc);
  }
);

export const addFamilySharePolicy = createAsyncThunk(
  "familySharePolicy/add",
  async (dto) => {
    return await familySharePolicyService.add(dto);
  }
);

export const updateFamilySharePolicy = createAsyncThunk(
  "familySharePolicy/update",
  async ({ id, dto }) => {
    await familySharePolicyService.update(id, dto);
    // backend sadece mesaj dönerse, store'u dto ile güncelliyoruz
    return dto;
  }
);

export const removeFamilySharePolicy = createAsyncThunk(
  "familySharePolicy/remove",
  async (id) => {
    await familySharePolicyService.remove(id);
    return id;
  }
);

const familySharePolicySlice = createSlice({
  name: "familySharePolicy",
  initialState,
  reducers: {
    setCurrentFamilySharePolicy: (state, action) => {
      state.current = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Liste
      .addCase(fetchFamilySharePolicies.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchFamilySharePolicies.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.list = toArray(action.payload);
      })
      .addCase(fetchFamilySharePolicies.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Tek kayıt
      .addCase(fetchFamilySharePolicy.pending, (state) => {
        state.currentStatus = "loading";
        state.error = null;
      })
      .addCase(fetchFamilySharePolicy.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload || null;
      })
      .addCase(fetchFamilySharePolicy.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // /current
      .addCase(fetchCurrentFamilySharePolicy.pending, (state) => {
        state.currentPolicyStatus = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentFamilySharePolicy.fulfilled, (state, action) => {
        state.currentPolicyStatus = "succeeded";
        state.currentPolicy = action.payload || null;
      })
      .addCase(fetchCurrentFamilySharePolicy.rejected, (state, action) => {
        state.currentPolicyStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Add
      .addCase(addFamilySharePolicy.fulfilled, (state, action) => {
        if (action.payload?.id) {
          state.list.push(action.payload);
        }
      })

      // Update
      .addCase(updateFamilySharePolicy.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.list.findIndex((x) => x.id === updated.id);
        if (idx >= 0) state.list[idx] = updated;
        if (state.current?.id === updated.id) {
          state.current = updated;
        }
        if (state.currentPolicy?.id === updated.id) {
          state.currentPolicy = updated;
        }
      })

      // Delete
      .addCase(removeFamilySharePolicy.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = state.list.filter((x) => x.id !== id);
        if (state.current?.id === id) state.current = null;
        if (state.currentPolicy?.id === id) state.currentPolicy = null;
      });
  },
});

export const { setCurrentFamilySharePolicy } = familySharePolicySlice.actions;
export default familySharePolicySlice.reducer;
