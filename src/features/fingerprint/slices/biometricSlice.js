import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { biometricService } from "../services/biometricService";

const isUuid = (v) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

// THUNKS
export const fetchBiometrics = createAsyncThunk(
  "biometric/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await biometricService.getAll();
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Biometrics alınamadı");
    }
  }
);

export const fetchBiometric = createAsyncThunk(
  "biometric/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await biometricService.get(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Biometric getirilemedi");
    }
  }
);

export const fetchBiometricDetails = createAsyncThunk(
  "biometric/fetchDetails",
  async (queryOptions = {}, { rejectWithValue }) => {
    try {
      const res = await biometricService.getDetails(queryOptions);
      return res?.data ?? res; // paged olabilir
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay listesi alınamadı");
    }
  }
);

export const fetchBiometricDetailById = createAsyncThunk(
  "biometric/fetchDetailById",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await biometricService.getDetailById(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay getirilemedi");
    }
  }
);

export const addBiometric = createAsyncThunk(
  "biometric/add",
  async (dto, { rejectWithValue }) => {
    try {
      const payload = { id: dto?.id || makeId(), ...dto };
      const res = await biometricService.add(payload);
      return res?.data ?? payload;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Kayıt eklenemedi");
    }
  }
);

export const updateBiometric = createAsyncThunk(
  "biometric/update",
  async ({ id, dto }, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await biometricService.update(id, { ...dto, id });
      return res?.data ?? { ...dto, id };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Güncelleme başarısız");
    }
  }
);

export const removeBiometric = createAsyncThunk(
  "biometric/remove",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      await biometricService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Silme başarısız");
    }
  }
);

// SLICE
const initialState = {
  list: [],
  byId: {},
  detailById: {},
  status: "idle",
  error: null,
  details: null,
  detailsStatus: "idle",
};

const biometricSlice = createSlice({
  name: "biometric",
  initialState,
  reducers: {
    upsertMany: (s, a) => {
      const arr = Array.isArray(a.payload) ? a.payload : [];
      arr.forEach((it) => {
        if (!it?.id) return;
        const i = s.list.findIndex((x) => x.id === it.id);
        if (i === -1) s.list.push(it); else s.list[i] = it;
        s.byId[it.id] = it;
      });
    },
    clearBiometricError: (s) => { s.error = null; },
    resetBiometrics: () => initialState,
  },
  extraReducers: (b) => {
    b
      // fetchAll
      .addCase(fetchBiometrics.pending,   (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchBiometrics.fulfilled, (s, a) => {
        s.status = "succeeded";
        const arr = a.payload || [];
        s.list = arr;
        s.byId = {};
        arr.forEach((x) => { if (x?.id) s.byId[x.id] = x; });
      })
      .addCase(fetchBiometrics.rejected,  (s, a) => { s.status = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchOne
      .addCase(fetchBiometric.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // fetchDetails (paged)
      .addCase(fetchBiometricDetails.pending,   (s) => { s.detailsStatus = "loading"; s.error = null; })
      .addCase(fetchBiometricDetails.fulfilled, (s, a) => { s.detailsStatus = "succeeded"; s.details = a.payload || null; })
      .addCase(fetchBiometricDetails.rejected,  (s, a) => { s.detailsStatus = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchDetailById
      .addCase(fetchBiometricDetailById.fulfilled, (s, a) => {
        const d = a.payload;
        if (!d?.id) return;
        s.detailById[d.id] = d;
      })

      // add
      .addCase(addBiometric.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // update
      .addCase(updateBiometric.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx !== -1) s.list[idx] = it;
      })

      // remove
      .addCase(removeBiometric.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((x) => x.id !== id);
        delete s.byId[id];
        delete s.detailById[id];
      });
  },
});

export const {
  upsertMany,
  clearBiometricError,
  resetBiometrics,
} = biometricSlice.actions;

export default biometricSlice.reducer;
