import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { mediaAssetService } from "../services/mediaAssetService";

const isUuid = (v) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
const makeId = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

// Thunks
export const fetchMediaAssets = createAsyncThunk(
  "mediaAsset/fetchAll",
  async ({ ownerId = null, ownerType = null } = {}, { rejectWithValue }) => {
    try {
      const res = await mediaAssetService.getAll(ownerId, ownerType);
      // apiClient bazen .data döndürüyor olabilir — her iki durumu da karşıla
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "MediaAssets alınamadı");
    }
  }
);

export const fetchMediaAsset = createAsyncThunk(
  "mediaAsset/fetchOne",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await mediaAssetService.get(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "MediaAsset getirilemedi");
    }
  }
);

export const fetchMediaAssetDetail = createAsyncThunk(
  "mediaAsset/fetchDetail",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await mediaAssetService.getDetailById(id);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay getirilemedi");
    }
  }
);

export const fetchMediaAssetDetails = createAsyncThunk(
  "mediaAsset/fetchDetails",
  async (queryOptions = {}, { rejectWithValue }) => {
    try {
      const res = await mediaAssetService.getDetails(queryOptions);
      return res?.data ?? res; // beklenen: sayfalı liste/obj
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Detay listesi alınamadı");
    }
  }
);

export const addMediaAsset = createAsyncThunk(
  "mediaAsset/add",
  async (dto, { rejectWithValue }) => {
    try {
      const payload = { id: dto?.id || makeId(), ...dto };
      const res = await mediaAssetService.add(payload);
      // CreatedAtAction ile dto dönebilir; yoksa request payload’ını dön
      return res?.data ?? payload;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Kayıt eklenemedi");
    }
  }
);

export const updateMediaAsset = createAsyncThunk(
  "mediaAsset/update",
  async ({ id, dto }, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await mediaAssetService.update(id, { ...dto, id });
      return res?.data ?? { ...dto, id };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Güncelleme başarısız");
    }
  }
);

export const removeMediaAsset = createAsyncThunk(
  "mediaAsset/remove",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      await mediaAssetService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Silme başarısız");
    }
  }
);

export const setPrimaryMediaAsset = createAsyncThunk(
  "mediaAsset/setPrimary",
  async (id, { rejectWithValue }) => {
    try {
      if (!isUuid(String(id))) throw new Error("Geçersiz id");
      const res = await mediaAssetService.setPrimary(id);
      return { id, message: res?.message || "Primary atandı" };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Primary atanamadı");
    }
  }
);

// Slice
const initialState = {
  list: [],
  byId: {},
  detailById: {},  // /detail endpoint’i için
  status: "idle",
  error: null,
  detailsStatus: "idle",
  details: null,   // sayfalı sonuç dönebilir
};

const mediaAssetSlice = createSlice({
  name: "mediaAsset",
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
    clearError: (s) => { s.error = null; },
    resetMediaAssets: () => initialState,
  },
  extraReducers: (b) => {
    // fetchAll
    b.addCase(fetchMediaAssets.pending, (s) => { s.status = "loading"; s.error = null; });
    b.addCase(fetchMediaAssets.fulfilled, (s, a) => {
      s.status = "succeeded";
      const arr = a.payload || [];
      s.list = arr;
      s.byId = {};
      arr.forEach((x) => { if (x?.id) s.byId[x.id] = x; });
    });
    b.addCase(fetchMediaAssets.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.payload || a.error?.message || "Hata";
    });

    // fetchOne
    b.addCase(fetchMediaAsset.fulfilled, (s, a) => {
      const it = a.payload;
      if (!it?.id) return;
      s.byId[it.id] = it;
      const idx = s.list.findIndex((x) => x.id === it.id);
      if (idx === -1) s.list.push(it); else s.list[idx] = it;
    });

    // fetchDetail
    b.addCase(fetchMediaAssetDetail.fulfilled, (s, a) => {
      const d = a.payload;
      if (!d?.id) return;
      s.detailById[d.id] = d;
    });

    // fetchDetails (paged)
    b.addCase(fetchMediaAssetDetails.pending, (s) => { s.detailsStatus = "loading"; s.error = null; });
    b.addCase(fetchMediaAssetDetails.fulfilled, (s, a) => {
      s.detailsStatus = "succeeded";
      s.details = a.payload || null; // dizi veya sayfalı obje gelebilir
    });
    b.addCase(fetchMediaAssetDetails.rejected, (s, a) => {
      s.detailsStatus = "failed";
      s.error = a.payload || a.error?.message || "Hata";
    });

    // add
    b.addCase(addMediaAsset.fulfilled, (s, a) => {
      const it = a.payload;
      if (!it?.id) return;
      s.byId[it.id] = it;
      const idx = s.list.findIndex((x) => x.id === it.id);
      if (idx === -1) s.list.push(it); else s.list[idx] = it;
    });

    // update
    b.addCase(updateMediaAsset.fulfilled, (s, a) => {
      const it = a.payload;
      if (!it?.id) return;
      s.byId[it.id] = it;
      const idx = s.list.findIndex((x) => x.id === it.id);
      if (idx !== -1) s.list[idx] = it;
    });

    // remove
    b.addCase(removeMediaAsset.fulfilled, (s, a) => {
      const id = a.payload;
      s.list = s.list.filter((x) => x.id !== id);
      delete s.byId[id];
      delete s.detailById[id];
    });

    // setPrimary: sadece list/byId üzerinde flag güncellemesi
    b.addCase(setPrimaryMediaAsset.fulfilled, (s, a) => {
      const id = a.payload?.id;
      if (!id) return;
      // aynı owner/kind grubunda tek primary varsayımı yoksa sadece bu kaydı true yapmak yeterli.
      if (s.byId[id]) s.byId[id].isPrimary = true;
      const idx = s.list.findIndex((x) => x.id === id);
      if (idx !== -1) s.list[idx].isPrimary = true;
    });
  },
});

export const {
  upsertMany,
  clearError,
  resetMediaAssets,
} = mediaAssetSlice.actions;

export default mediaAssetSlice.reducer;
