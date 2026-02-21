// src/features/floors/slices/floorSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { floorService } from "../services/floorService";

// form + state'den gelen market bilgisi ile API payload'ı hazırla
const toApiFloor = (form, selectedMarket) => {
  const { id, marketId, floorName, level = 0, status = true, market } = form || {};

  const payload = {
    // Backend senin id üretmeni kabul ediyor: evetse bırak; etmiyorsa bu satırı kaldır.
    id: id ?? (globalThis.crypto?.randomUUID ? crypto.randomUUID() : undefined),
    marketId,
    floorName,
    level: Number(level ?? 0),
    status: Boolean(status),
    market: {
      id: market?.id ?? marketId,
      // *** ZORUNLU ***: Backend MarketName istiyor
      marketName: selectedMarket?.marketName ?? market?.marketName,
      // opsiyonel
      ...(typeof (selectedMarket?.status) === "boolean" ? { status: selectedMarket.status } : {}),
    },
  };

  // undefined alanları temizle
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  if (payload.market) {
    Object.keys(payload.market).forEach(k => payload.market[k] === undefined && delete payload.market[k]);
  }

  return payload;
};

// Tüm liste
export const fetchFloors = createAsyncThunk("floor/fetchAll", async () => {
  const res = await floorService.getAll();
  return Array.isArray(res) ? res : (res?.data || []);
});

// *** DÜZELTİLDİ: MarketName ekleniyor ***
export const addFloor = createAsyncThunk(
  "floor/add",
  async (formDto, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      // Market slice'ında seçili marketi veya market listesinden ilgili marketi bul
      const selectedMarket =
        state.market?.selected ??
        state.market?.list?.find(m => m.id === (formDto.marketId || formDto?.market?.id));

      const payload = toApiFloor(formDto, selectedMarket);

      // Validasyon: MarketName zorunlu — yoksa erken hata ver
      if (!payload.market?.marketName) {
        throw new Error("MarketName gerekli: lütfen market adını sağlayın.");
      }
      const res = await floorService.add(payload); // backend created objeyi döndürür
      return res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Floor ekleme başarısız");
    }
  }
);

// Güncelle/sil örnekleri aynı kalabilir
export const updateFloor = createAsyncThunk("floor/update",
  async ({ id, formDto }, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const selectedMarket =
        state.market?.selected ??
        state.market?.list?.find(m => m.id === (formDto.marketId || formDto?.market?.id));
      const payload = toApiFloor({ ...formDto, id }, selectedMarket);

      if (!payload.market?.marketName) throw new Error("MarketName gerekli.");

      const res = await floorService.update(id, payload);
      return res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Floor güncelleme başarısız");
    }
  }
);

export const removeFloor = createAsyncThunk("floor/remove",
  async (id, { rejectWithValue }) => {
    try { await floorService.remove(id); return id; }
    catch (err) { return rejectWithValue(err?.message || "Floor silme başarısız"); }
  }
);

const initialState = { list: [], status: "idle", error: null };

const floorSlice = createSlice({
  name: "floor",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchFloors.pending,   (s) => { s.status = "loading"; s.error = null; })
     .addCase(fetchFloors.fulfilled, (s, a) => { s.status = "succeeded"; s.list = a.payload; })
     .addCase(fetchFloors.rejected,  (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; });

    b.addCase(addFloor.fulfilled, (s, a) => {
      const item = a.payload; if (!item) return;
      const i = s.list.findIndex(f => f.id === item.id);
      if (i === -1) s.list.push(item); else s.list[i] = item;
    });

    b.addCase(updateFloor.fulfilled, (s, a) => {
      const item = a.payload; if (!item?.id) return;
      const i = s.list.findIndex(f => f.id === item.id);
      if (i !== -1) s.list[i] = item;
    });

    b.addCase(removeFloor.fulfilled, (s, a) => {
      const id = a.payload; s.list = (s.list || []).filter(f => f.id !== id);
    });
  },
});

export default floorSlice.reducer;
