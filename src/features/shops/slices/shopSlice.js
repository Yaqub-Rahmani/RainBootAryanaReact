import { createSlice, createAsyncThunk, createEntityAdapter } from "@reduxjs/toolkit";
import { shopService } from "../services/shopService";

// --- helpers ---
const isUuidLike = (v) =>
  typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
export const makeId = () =>
  globalThis.crypto?.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0,
          v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

// API payload’ı şemaya göre hazırla (ShopCreateDto / ShopUpdateDto)
export const toApiShop = (form = {}) => {
  const { marketId, floorId, name, areaM2 } = form;

  const payload = {
    marketId: marketId ? String(marketId) : undefined,
    floorId: floorId ? String(floorId) : undefined,
    name: name?.trim() || null,
    areaM2:
      areaM2 === "" || areaM2 == null
        ? null
        : Number(areaM2),
  };

  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  return payload;
};

// --- entity adapter for shops list ---
const shopsAdapter = createEntityAdapter({
  selectId: (shop) => shop.id,
  sortComparer: (a, b) =>
    (a?.name ?? a?.unitNumber ?? "").localeCompare(
      b?.name ?? b?.unitNumber ?? ""
    ),
});

// --- thunks ---
export const fetchShops = createAsyncThunk(
  "shop/fetchAll",
  async (query = {}, { rejectWithValue }) => {
    try {
      const data = await shopService.getAll(query); // ✅ GetShopListView
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Mağazalar alınamadı"
      );
    }
  }
);

export const addShop = createAsyncThunk(
  "shop/add",
  async (formDto, { rejectWithValue }) => {
    try {
      const p = toApiShop(formDto);

      if (!p.name) throw new Error("Mağaza adı zorunludur.");
      if (!p.marketId || !isUuidLike(p.marketId))
        throw new Error("Geçerli bir MarketId zorunludur.");
      if (!p.floorId || !isUuidLike(p.floorId))
        throw new Error("Geçerli bir FloorId zorunludur.");

      const created = await shopService.add(p);
      return created || null;
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Mağaza eklenemedi"
      );
    }
  }
);

export const updateShop = createAsyncThunk(
  "shop/update",
  async ({ id, formDto }, { getState, rejectWithValue }) => {
    try {
      const p = toApiShop(formDto);

      if (!p.name) throw new Error("Mağaza adı zorunludur.");
      if (!p.marketId || !isUuidLike(p.marketId))
        throw new Error("Geçerli bir MarketId zorunludur.");
      if (!p.floorId || !isUuidLike(p.floorId))
        throw new Error("Geçerli bir FloorId zorunludur.");

      await shopService.update(id, p);

      const existing = shopsSelectors.selectById(getState(), id) || {};
      return { ...existing, ...p };
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Mağaza güncellenemedi"
      );
    }
  }
);

export const removeShop = createAsyncThunk(
  "shop/remove",
  async (id, { rejectWithValue }) => {
    try {
      await shopService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Mağaza silinemedi"
      );
    }
  }
);

export const fetchShopsWithShares = createAsyncThunk(
  "shop/fetchWithShares",
  async (ownerId, { rejectWithValue }) => {
    try {
      if (!ownerId || !isUuidLike(ownerId))
        throw new Error("Geçerli ownerId zorunludur.");
      const data = await shopService.getWithShares(ownerId);
      const clean = (Array.isArray(data) ? data : []).map((x) => ({
        ...x,
        ownersCount: Number(x.ownersCount ?? 0),
        percentFilled: Number(x.percentFilled ?? 0),
        percentOpen: Number(x.percentOpen ?? 0),
        percentMy: Number(x.percentMy ?? 0),
      }));
      return clean;
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Pay özetleri alınamadı"
      );
    }
  }
);

// --- FRANCHISE OWNER SHOPS ---
export const fetchFranchiseOwnerShops = createAsyncThunk(
  "shop/fetchFranchiseOwnerShops",
  async (ownerId, { rejectWithValue }) => {
    try {
      if (!ownerId || !isUuidLike(ownerId))
        throw new Error("Geçerli ownerId zorunludur.");
      const data = await shopService.getFranchiseOwnerShops(ownerId);
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Mağazalar getirilemedi"
      );
    }
  }
);

export const fetchAvailableShopsForContracts = createAsyncThunk(
  "shop/fetchAvailableShopsForContracts",
  async (_arg, { rejectWithValue }) => {
    try {
      const data = await shopService.getAvailableForContracts();
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return rejectWithValue(
        err?.payload || err?.message || "Uygun dükkânlar alınamadı"
      );
    }
  }
);

// --- initial state ---
const initialFilters = { onlyActive: true, marketId: null, floorId: null };

const initialState = {
  ...shopsAdapter.getInitialState(),
  status: "idle",
  error: null,
  filters: initialFilters,
  details: {
    items: [],
    page: 1,
    pageSize: 20,
    totalCount: 0,
    status: "idle",
    error: null,
  },
  shares: { list: [], status: "idle", error: null, lastOwnerId: null },
  ownerShops: {
    list: [],
    status: "idle",
    error: null,
    lastOwnerId: null,
    lastFetched: null,
  },
  availableForContracts: {
    list: [],
    status: "idle",
    error: null,
    lastFetched: null,
  },
};

const shopSlice = createSlice({
  name: "shop",
  initialState,
  reducers: {
    setShopFilters: (s, a) => {
      s.filters = { ...s.filters, ...a.payload };
    },
    clearShopFilters: (s) => {
      s.filters = initialFilters;
    },
    clearShopShares: (s) => {
      s.shares = {
        list: [],
        status: "idle",
        error: null,
        lastOwnerId: null,
      };
    },
    clearOwnerShops: (s) => {
      s.ownerShops = {
        list: [],
        status: "idle",
        error: null,
        lastOwnerId: null,
        lastFetched: null,
      };
    },
    clearAvailableForContracts: (s) => {
      s.availableForContracts = {
        list: [],
        status: "idle",
        error: null,
        lastFetched: null,
      };
    },
  },
  extraReducers: (b) => {
    // fetchAll
    b.addCase(fetchShops.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchShops.fulfilled, (s, a) => {
        s.status = "succeeded";
        shopsAdapter.setAll(s, a.payload || []);
      })
      .addCase(fetchShops.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload || a.error?.message || "Hata";
      });

    // add
    b.addCase(addShop.fulfilled, (s, a) => {
      if (a.payload) shopsAdapter.upsertOne(s, a.payload);
    });

    // update
    b.addCase(updateShop.fulfilled, (s, a) => {
      if (a.payload?.id) shopsAdapter.upsertOne(s, a.payload);
    });

    // remove
    b.addCase(removeShop.fulfilled, (s, a) => {
      if (a.payload) shopsAdapter.removeOne(s, a.payload);
    });

    // with-shares
    b.addCase(fetchShopsWithShares.pending, (s, a) => {
      s.shares.status = "loading";
      s.shares.error = null;
      s.shares.lastOwnerId = a.meta.arg || null;
    });
    b.addCase(fetchShopsWithShares.fulfilled, (s, a) => {
      s.shares.status = "succeeded";
      s.shares.list = a.payload || [];
    });
    b.addCase(fetchShopsWithShares.rejected, (s, a) => {
      s.shares.status = "failed";
      s.shares.error = a.payload || a.error?.message || "Hata";
    });

    // franchise owner shops
    b.addCase(fetchFranchiseOwnerShops.pending, (s, a) => {
      s.ownerShops.status = "loading";
      s.ownerShops.error = null;
      s.ownerShops.lastOwnerId = a.meta.arg || null;
    });
    b.addCase(fetchFranchiseOwnerShops.fulfilled, (s, a) => {
      s.ownerShops.status = "succeeded";
      s.ownerShops.list = a.payload || [];
      s.ownerShops.lastFetched = Date.now();
    });
    b.addCase(fetchFranchiseOwnerShops.rejected, (s, a) => {
      s.ownerShops.status = "failed";
      s.ownerShops.error = a.payload || a.error?.message || "Hata";
    });

    // available-for-contracts
    b.addCase(fetchAvailableShopsForContracts.pending, (s) => {
      s.availableForContracts.status = "loading";
      s.availableForContracts.error = null;
    });
    b.addCase(fetchAvailableShopsForContracts.fulfilled, (s, a) => {
      s.availableForContracts.status = "succeeded";
      s.availableForContracts.list = a.payload || [];
      s.availableForContracts.lastFetched = Date.now();
    });
    b.addCase(fetchAvailableShopsForContracts.rejected, (s, a) => {
      s.availableForContracts.status = "failed";
      s.availableForContracts.error =
        a.payload || a.error?.message || "Hata";
    });
  },
});

export const {
  setShopFilters,
  clearShopFilters,
  clearShopShares,
  clearOwnerShops,
  clearAvailableForContracts,
} = shopSlice.actions;
export default shopSlice.reducer;

// expose adapter selectors bound to this slice later in selectors file
export const shopsSelectors = shopsAdapter.getSelectors((state) => state.shop);
