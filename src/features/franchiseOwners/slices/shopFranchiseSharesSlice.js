import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { shopFranchiseShareService } from "../services/shopFranchiseShareService";

/* Basit GUID (projenin ortak util'i varsa onu kullan) */
const guid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

/* ---- THUNKS (READ) ---- */
export const fetchShares = createAsyncThunk(
  "shopFranchiseShares/fetchAll",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getAll(params);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

export const fetchShareById = createAsyncThunk(
  "shopFranchiseShares/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getById(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

export const fetchDetails = createAsyncThunk(
  "shopFranchiseShares/fetchDetails",
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getDetails(params);
      return res?.data ?? res; // beklenen: sayfalı detay listesi (QueryOptions ile)
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

export const fetchDetailById = createAsyncThunk(
  "shopFranchiseShares/fetchDetailById",
  async (id, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getDetailById(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

export const fetchActiveOn = createAsyncThunk(
  "shopFranchiseShares/fetchActiveOn",
  async ({ shopId, on }, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getActiveOn(shopId, on);
      return res?.data ?? res; // aktif share listesi (o tarihte)
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

export const fetchSummary = createAsyncThunk(
  "shopFranchiseShares/fetchSummary",
  async ({ shopId, on }, { rejectWithValue }) => {
    try {
      const res = await shopFranchiseShareService.getSummary(shopId, on);
      return res?.data ?? res; // özet DTO
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Load failed");
    }
  }
);

/* ---- THUNKS (WRITE) ---- */
export const addShare = createAsyncThunk(
  "shopFranchiseShares/add",
  async (dto, { rejectWithValue }) => {
    try {
      const withId = dto?.id ? dto : { ...dto, id: guid() };
      const res = await shopFranchiseShareService.add(withId);
      // CreatedAtAction genelde body'yi döndürür; değilse withId'yı geri döndürüyoruz
      
      return res?.data ?? withId;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Create failed");
    }
  }
);

export const updateShare = createAsyncThunk(
  "shopFranchiseShares/update",
  async (dto, { rejectWithValue }) => {
    try {
      if (!dto?.id) throw new Error("Id is required");
      const res = await shopFranchiseShareService.update(dto.id, dto);
      // bazı API'ler sadece mesaj döndürür; bu yüzden dto'yu geri set ediyoruz
      return dto;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Update failed");
    }
  }
);

export const deleteShare = createAsyncThunk(
  "shopFranchiseShares/delete",
  async (id, { rejectWithValue }) => {
    try {
      await shopFranchiseShareService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.response?.data ?? err?.message ?? "Delete failed");
    }
  }
);

/* ---- STATE ---- */
const initialState = {
  entities: { byId: {}, allIds: [] }, // pay kayıtları (temel)
  details: { list: [], total: 0, opts: null }, // detay endpoint sonucu
  summary: null,       // özet DTO
  activeOn: [],        // belirli tarihte aktif paylar
  current: null,       // tekil kayıt (getById / add sonrası)
  status: "idle",      // idle | loading | succeeded | failed
  error: null,
};

/* ---- HELPERS ---- */
const upsertMany = (state, items = []) => {
  items.forEach((it) => {
    if (!it?.id) return;
    if (!state.entities.byId[it.id]) {
      state.entities.allIds.push(it.id);
    }
    state.entities.byId[it.id] = it;
  });
};
const upsertOne = (state, it) => upsertMany(state, [it]);

/* ---- SLICE ---- */
const shopFranchiseSharesSlice = createSlice({
  name: "shopFranchiseShares",
  initialState,
  reducers: {
    resetShopFranchiseShares(s) {
      s.entities = { byId: {}, allIds: [] };
      s.details = { list: [], total: 0, opts: null };
      s.summary = null;
      s.activeOn = [];
      s.current = null;
      s.status = "idle";
      s.error = null;
    },
  },
  extraReducers: (b) => {
    const pending = (s) => { s.status = "loading"; s.error = null; };
    const rejected = (s, a) => { s.status = "failed"; s.error = a.payload || a.error?.message || "Hata"; };

    // READ
    b.addCase(fetchShares.pending, pending);
    b.addCase(fetchShares.fulfilled, (s, a) => {
      s.status = "succeeded";
      const list = Array.isArray(a.payload) ? a.payload : (a.payload?.items || []);
      upsertMany(s, list);
    });
    b.addCase(fetchShares.rejected, rejected);

    b.addCase(fetchShareById.pending, pending);
    b.addCase(fetchShareById.fulfilled, (s, a) => {
      s.status = "succeeded";
      if (a.payload) {
        s.current = a.payload;
        upsertOne(s, a.payload);
      }
    });
    b.addCase(fetchShareById.rejected, rejected);

    b.addCase(fetchDetails.pending, pending);
    b.addCase(fetchDetails.fulfilled, (s, a) => {
      s.status = "succeeded";
      const data = a.payload;
      const items = data?.items ?? Array.isArray(data) ? data : [];
      const total = data?.total ?? items.length;
      s.details = { list: items, total, opts: data?.opts ?? null };
      // detaylardan da temel entity cache'ini zenginleştir
      upsertMany(s, items);
    });
    b.addCase(fetchDetails.rejected, rejected);

    b.addCase(fetchDetailById.pending, pending);
    b.addCase(fetchDetailById.fulfilled, (s, a) => {
      s.status = "succeeded";
      if (a.payload) {
        s.current = a.payload;
        upsertOne(s, a.payload?.share ?? a.payload); // detail objesi share alanı içerebilir
      }
    });
    b.addCase(fetchDetailById.rejected, rejected);

    b.addCase(fetchActiveOn.pending, pending);
    b.addCase(fetchActiveOn.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.activeOn = Array.isArray(a.payload) ? a.payload : [];
      upsertMany(s, s.activeOn);
    });
    b.addCase(fetchActiveOn.rejected, rejected);

    b.addCase(fetchSummary.pending, pending);
    b.addCase(fetchSummary.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.summary = a.payload ?? null;
    });
    b.addCase(fetchSummary.rejected, rejected);

    // WRITE
    b.addCase(addShare.pending, pending);
    b.addCase(addShare.fulfilled, (s, a) => {
      s.status = "succeeded";
      const created = a.payload;
      s.current = created;
      upsertOne(s, created);
    });
    b.addCase(addShare.rejected, rejected);

    b.addCase(updateShare.pending, pending);
    b.addCase(updateShare.fulfilled, (s, a) => {
      s.status = "succeeded";
      const updated = a.payload;
      s.current = updated;
      upsertOne(s, updated);
    });
    b.addCase(updateShare.rejected, rejected);

    b.addCase(deleteShare.pending, pending);
    b.addCase(deleteShare.fulfilled, (s, a) => {
      s.status = "succeeded";
      const id = a.payload;
      if (s.entities.byId[id]) {
        delete s.entities.byId[id];
        s.entities.allIds = s.entities.allIds.filter((x) => x !== id);
      }
      if (s.current?.id === id) s.current = null;
      // activeOn/details listelerini de temizle
      s.details.list = s.details.list.filter((x) => x?.id !== id);
      s.activeOn = s.activeOn.filter((x) => x?.id !== id);
    });
    b.addCase(deleteShare.rejected, rejected);
  },
});

export const { resetShopFranchiseShares } = shopFranchiseSharesSlice.actions;
export default shopFranchiseSharesSlice.reducer;
