import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { addressService } from "../services/addressService";

const isUuid = (v) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

// THUNKS
export const fetchAddresses = createAsyncThunk(
  "address/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await addressService.getAll();
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adresler alınamadı");
    }
  }
);

export const fetchAddress = createAsyncThunk(
  "address/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await addressService.get(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adres getirilemedi");
    }
  }
);

export const fetchAddressDetails = createAsyncThunk(
  "address/fetchDetails",
  async (queryOptions = {}, { rejectWithValue }) => {
    try {
      const res = await addressService.getDetails(queryOptions);
      return res?.data ?? res; // sayfalı olabilir
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adres detayları alınamadı");
    }
  }
);

export const fetchAddressesByOwner = createAsyncThunk(
  "address/fetchByOwner",
  async ({ ownerType, ownerId }, { rejectWithValue }) => {
    try {
      const res = await addressService.getByOwner(ownerType, ownerId);
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Sahibe göre adresler alınamadı");
    }
  }
);

export const addAddress = createAsyncThunk(
  "address/add",
  async (dto, { rejectWithValue }) => {
    try {
      const payload = { id: dto?.id || makeId(), ...dto };
      const res = await addressService.add(payload);
      return res?.data ?? payload;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adres eklenemedi");
    }
  }
);

export const updateAddress = createAsyncThunk(
  "address/update",
  async ({ id, dto }, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await addressService.update(id, { ...dto, id });
      return res?.data ?? { ...dto, id };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adres güncellenemedi");
    }
  }
);

export const removeAddress = createAsyncThunk(
  "address/remove",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      await addressService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Adres silinemedi");
    }
  }
);

export const setPrimaryAddress = createAsyncThunk(
  "address/setPrimary",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await addressService.setPrimary(id);
      return { id, message: res?.message || "Primary atandı" };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Primary atanamadı");
    }
  }
);

// SLICE
const initialState = {
  list: [],
  byId: {},
  status: "idle",
  error: null,
  details: null,        // sayfalı sonuçlar için
  detailsStatus: "idle",
};

const addressSlice = createSlice({
  name: "address",
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
    clearAddressError: (s) => { s.error = null; },
    resetAddresses: () => initialState,
  },
  extraReducers: (b) => {
    b
      // fetchAll
      .addCase(fetchAddresses.pending,   (s) => { s.status = "loading"; s.error = null; })
      .addCase(fetchAddresses.fulfilled, (s, a) => {
        s.status = "succeeded";
        const arr = a.payload || [];
        s.list = arr;
        s.byId = {};
        arr.forEach((x) => { if (x?.id) s.byId[x.id] = x; });
      })
      .addCase(fetchAddresses.rejected,  (s, a) => { s.status = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchOne
      .addCase(fetchAddress.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // fetchDetails (paged)
      .addCase(fetchAddressDetails.pending,   (s) => { s.detailsStatus = "loading"; s.error = null; })
      .addCase(fetchAddressDetails.fulfilled, (s, a) => { s.detailsStatus = "succeeded"; s.details = a.payload || null; })
      .addCase(fetchAddressDetails.rejected,  (s, a) => { s.detailsStatus = "failed"; s.error = a.payload || a.error?.message || "Hata"; })

      // fetchByOwner
      .addCase(fetchAddressesByOwner.fulfilled, (s, a) => {
        const arr = a.payload || [];
        arr.forEach((it) => {
          if (!it?.id) return;
          const i = s.list.findIndex((x) => x.id === it.id);
          if (i === -1) s.list.push(it); else s.list[i] = it;
          s.byId[it.id] = it;
        });
      })

      // add
      .addCase(addAddress.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx === -1) s.list.push(it); else s.list[idx] = it;
      })

      // update
      .addCase(updateAddress.fulfilled, (s, a) => {
        const it = a.payload;
        if (!it?.id) return;
        s.byId[it.id] = it;
        const idx = s.list.findIndex((x) => x.id === it.id);
        if (idx !== -1) s.list[idx] = it;
      })

      // remove
      .addCase(removeAddress.fulfilled, (s, a) => {
        const id = a.payload;
        s.list = s.list.filter((x) => x.id !== id);
        delete s.byId[id];
      })

      // setPrimary
      .addCase(setPrimaryAddress.fulfilled, (s, a) => {
        const id = a.payload?.id;
        if (!id) return;
        if (s.byId[id]) s.byId[id].isPrimary = true;
        const idx = s.list.findIndex((x) => x.id === id);
        if (idx !== -1) s.list[idx].isPrimary = true;
      });
  },
});

export const {
  upsertMany,
  clearAddressError,
  resetAddresses,
} = addressSlice.actions;

export default addressSlice.reducer;
