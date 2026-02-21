import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { tenantService } from "../services/tenantService";

// GET profile
export const fetchTenantProfile = createAsyncThunk(
  "tenantProfile/fetchProfile",
  async (tenantId, { rejectWithValue }) => {
    try {
      if (!tenantId) throw new Error("tenantId gereklidir.");
      const res = await tenantService.getProfile(tenantId);
      return res;
    } catch (err) {
      return rejectWithValue(err?.message || "Profil alınamadı");
    }
  }
);

// GET contracts
export const fetchTenantContracts = createAsyncThunk(
  "tenantProfile/fetchContracts",
  async (tenantId, { rejectWithValue }) => {
    try {
      if (!tenantId) throw new Error("tenantId gereklidir.");
      const res = await tenantService.getContracts(tenantId);
      return Array.isArray(res) ? res : [];
    } catch (err) {
      return rejectWithValue(err?.message || "Sözleşmeler alınamadı");
    }
  }
);

// POST fingerprint upsert
export const upsertTenantFingerprint = createAsyncThunk(
  "tenantProfile/upsertFingerprint",
  async ({ tenantId, dto }, { rejectWithValue }) => {
    try {
      if (!tenantId) throw new Error("tenantId gereklidir.");
      if (!dto?.templateBase64) throw new Error("templateBase64 zorunlu.");
      const res = await tenantService.upsertFingerprint(tenantId, dto);
      return res; // message veya boş olabilir
    } catch (err) {
      return rejectWithValue(err?.message || "Parmak izi kaydedilemedi");
    }
  }
);

const initialState = {
  profile: null,
  contracts: [],

  profileStatus: "idle",
  contractsStatus: "idle",
  fingerprintStatus: "idle",

  error: null,
};

const tenantProfileSlice = createSlice({
  name: "tenantProfile",
  initialState,
  reducers: {
    clearTenantProfileState: () => initialState,
  },
  extraReducers: (b) => {
    // profile
    b.addCase(fetchTenantProfile.pending, (s) => {
      s.profileStatus = "loading";
      s.error = null;
    });
    b.addCase(fetchTenantProfile.fulfilled, (s, a) => {
      s.profileStatus = "succeeded";
      s.profile = a.payload || null;
    });
    b.addCase(fetchTenantProfile.rejected, (s, a) => {
      s.profileStatus = "failed";
      s.error = a.payload || a.error?.message || "Hata";
    });

    // contracts
    b.addCase(fetchTenantContracts.pending, (s) => {
      s.contractsStatus = "loading";
      s.error = null;
    });
    b.addCase(fetchTenantContracts.fulfilled, (s, a) => {
      s.contractsStatus = "succeeded";
      s.contracts = Array.isArray(a.payload) ? a.payload : [];
    });
    b.addCase(fetchTenantContracts.rejected, (s, a) => {
      s.contractsStatus = "failed";
      s.error = a.payload || a.error?.message || "Hata";
    });

    // fingerprint
    b.addCase(upsertTenantFingerprint.pending, (s) => {
      s.fingerprintStatus = "loading";
      s.error = null;
    });
    b.addCase(upsertTenantFingerprint.fulfilled, (s) => {
      s.fingerprintStatus = "succeeded";
    });
    b.addCase(upsertTenantFingerprint.rejected, (s, a) => {
      s.fingerprintStatus = "failed";
      s.error = a.payload || a.error?.message || "Hata";
    });
  },
});

export const { clearTenantProfileState } = tenantProfileSlice.actions;
export default tenantProfileSlice.reducer;
