import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { ownerDistributionPolicyService } from "../services/ownerDistributionPolicyService";

const toArray = (p) => (Array.isArray(p) ? p : []);

const initialState = {
  list: [],
  current: null,
  currentStatus: "idle",
  listStatus: "idle",
  currentPolicy: null,        // /current endpoint sonucu
  currentPolicyStatus: "idle",
  error: null,
};

// Thunk'lar
export const fetchOwnerDistributionPolicies = createAsyncThunk(
  "ownerDistributionPolicy/fetchAll",
  async () => {
    return await ownerDistributionPolicyService.getAll();
  }
);

export const fetchOwnerDistributionPolicy = createAsyncThunk(
  "ownerDistributionPolicy/fetchOne",
  async (id) => {
    return await ownerDistributionPolicyService.get(id);
  }
);

export const fetchCurrentOwnerDistributionPolicy = createAsyncThunk(
  "ownerDistributionPolicy/fetchCurrent",
  async () => {
    return await ownerDistributionPolicyService.getCurrent();
  }
);

export const addOwnerDistributionPolicy = createAsyncThunk(
  "ownerDistributionPolicy/add",
  async (dto) => {
    return await ownerDistributionPolicyService.add(dto);
  }
);

export const updateOwnerDistributionPolicy = createAsyncThunk(
  "ownerDistributionPolicy/update",
  async ({ id, dto }) => {
    await ownerDistributionPolicyService.update(id, dto);
    // Backend sadece mesaj dönerse, store'u dto ile güncelliyoruz
    return dto;
  }
);

export const removeOwnerDistributionPolicy = createAsyncThunk(
  "ownerDistributionPolicy/remove",
  async (id) => {
    await ownerDistributionPolicyService.remove(id);
    return id;
  }
);

const ownerDistributionPolicySlice = createSlice({
  name: "ownerDistributionPolicy",
  initialState,
  reducers: {
    setCurrentOwnerDistributionPolicy: (state, action) => {
      state.current = action.payload || null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Liste
      .addCase(fetchOwnerDistributionPolicies.pending, (state) => {
        state.listStatus = "loading";
        state.error = null;
      })
      .addCase(fetchOwnerDistributionPolicies.fulfilled, (state, action) => {
        state.listStatus = "succeeded";
        state.list = toArray(action.payload);
      })
      .addCase(fetchOwnerDistributionPolicies.rejected, (state, action) => {
        state.listStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Tek kayıt
      .addCase(fetchOwnerDistributionPolicy.pending, (state) => {
        state.currentStatus = "loading";
        state.error = null;
      })
      .addCase(fetchOwnerDistributionPolicy.fulfilled, (state, action) => {
        state.currentStatus = "succeeded";
        state.current = action.payload || null;
      })
      .addCase(fetchOwnerDistributionPolicy.rejected, (state, action) => {
        state.currentStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // /current
      .addCase(fetchCurrentOwnerDistributionPolicy.pending, (state) => {
        state.currentPolicyStatus = "loading";
        state.error = null;
      })
      .addCase(fetchCurrentOwnerDistributionPolicy.fulfilled, (state, action) => {
        state.currentPolicyStatus = "succeeded";
        state.currentPolicy = action.payload || null;
      })
      .addCase(fetchCurrentOwnerDistributionPolicy.rejected, (state, action) => {
        state.currentPolicyStatus = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Add
      .addCase(addOwnerDistributionPolicy.fulfilled, (state, action) => {
        if (action.payload?.id) {
          state.list.push(action.payload);
        }
      })

      // Update
      .addCase(updateOwnerDistributionPolicy.fulfilled, (state, action) => {
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
      .addCase(removeOwnerDistributionPolicy.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = state.list.filter((x) => x.id !== id);
        if (state.current?.id === id) state.current = null;
        if (state.currentPolicy?.id === id) state.currentPolicy = null;
      });
  },
});

export const { setCurrentOwnerDistributionPolicy } =
  ownerDistributionPolicySlice.actions;

export default ownerDistributionPolicySlice.reducer;
