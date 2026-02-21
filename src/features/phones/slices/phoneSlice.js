import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { phoneService } from "../services/phoneService";

const isUuid = (v) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

/**
 * İstersen burada küçük bir mapper/normalizer tanımlayabilirsin:
 * export const toApiPhone = (form) => ({ ...form, id: form.id ?? makeId(), ... });
 */

// THUNKS
export const fetchPhones = createAsyncThunk(
  "phone/fetchAll",
  async ({ ownerId = null, ownerType = null } = {}, { rejectWithValue }) => {
    try {
      const res = await phoneService.getAll(ownerId, ownerType);
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Telefonlar alınamadı");
    }
  }
);

export const fetchPhone = createAsyncThunk(
  "phone/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await phoneService.get(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Telefon kaydı getirilemedi");
    }
  }
);

export const fetchPhoneDetails = createAsyncThunk(
  "phone/fetchDetails",
  async ({ queryOptions = {}, ownerId = null, ownerType = null } = {}, { rejectWithValue }) => {
    try {
      const res = await phoneService.getDetails(queryOptions, ownerId, ownerType);
      return res?.data ?? res; // paged olabilir
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay listesi alınamadı");
    }
  }
);

export const fetchPhoneDetailById = createAsyncThunk(
  "phone/fetchDetailById",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await phoneService.getDetailById(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay getirilemedi");
    }
  }
);

export const addPhone = createAsyncThunk(
  "phone/add",
  async (dto, { rejectWithValue }) => {
    try {
      const payload = { id: dto?.id || makeId(), ...dto };
      const res = await phoneService.add(payload);
      return res?.data ?? payload;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Telefon kaydı eklenemedi");
    }
  }
);

export const updatePhone = createAsyncThunk(
  "phone/update",
  async ({ id, dto }, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await phoneService.update(id, { ...dto, id });
      return res?.data ?? { ...dto, id };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Telefon kaydı güncellenemedi");
    }
  }
);

export const removePhone = createAsyncThunk(
  "phone/remove",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      await phoneService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Telefon kaydı silinemedi");
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

const phoneSlice = createSlice({
  name: "phone",
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
    clearPhoneError: (s) => { s.error = null; },
    resetPhones: () => initialState,
  },
  extraReducers: (b) => {
    b
      // fetchAll
      .addCase(fetchPhones.pending,   (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchPhones.fulfilled, (s, a) => {
        s.status = "succeeded";
        const arr = a.payload || [];
        s.list = arr;
        s.byId = {};
        arr.forEach((x) => { if (x?.id) s.byId[x.id] = x; });
      })
      .addCase(fetchPhones.rejected,  (s, a) => { s.status = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchOne
      .addCase(fetchPhone.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // fetchDetails (paged)
      .addCase(fetchPhoneDetails.pending,   (s) => { s.detailsStatus = "loading"; s.error = null; })
      .addCase(fetchPhoneDetails.fulfilled, (s, a) => { s.detailsStatus = "succeeded"; s.details = a.payload || null; })
      .addCase(fetchPhoneDetails.rejected,  (s, a) => { s.detailsStatus = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchDetailById
      .addCase(fetchPhoneDetailById.fulfilled, (s, a) => {
        const d = a.payload;
        if (!d?.id) return;
        s.detailById[d.id] = d;
      })

      // add
      .addCase(addPhone.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // update
      .addCase(updatePhone.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx !== -1) s.list[idx] = it;
      })

      // remove
      .addCase(removePhone.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((x) => x.id !== id);
        delete s.byId[id];
        delete s.detailById[id];
      });
  },
});

export const {
  upsertMany,
  clearPhoneError,
  resetPhones,
} = phoneSlice.actions;

export default phoneSlice.reducer;
