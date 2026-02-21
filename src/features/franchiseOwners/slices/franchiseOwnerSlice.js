import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { franchiseOwnerService } from "../services/franchiseOwnerService";

/* ---------------- Helpers ---------------- */
const isUuidLike = (v) => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
const makeId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0, v = c === "x" ? r : (r & 0x3) | 0x8; return v.toString(16);
  });
};

export const toApiFranchiseOwner = (form) => {
  const { id, displayName, phone, email, notes, isActive = true } = form || {};
  const payload = {
    id: id ?? (globalThis.crypto?.randomUUID ? crypto.randomUUID() : undefined),
    displayName: displayName?.trim(),
    phone: (phone ?? "").toString().trim() || undefined,
    email: (email ?? "").toString().trim() || undefined,
    notes: (notes ?? "").toString().trim() || undefined,
    isActive: Boolean(isActive),
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
  return payload;
};

/* ---------------- Thunks ---------------- */
// owners (basic)
export const fetchFranchiseOwners = createAsyncThunk(
  "franchiseOwner/fetchAll",
  async (active = null, { rejectWithValue }) => {
    try {
      const res = await franchiseOwnerService.getAll(active);
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Franchise sahipleri alınamadı");
    }
  }
);

export const fetchOwnerLedger = createAsyncThunk(
  "franchiseOwner/fetchOwnerLedger",
  async ({ ownerId, opt = {}, fromDate, toDate, direction, paymentMethod, minAmount, maxAmount, search, sort } = {}, { rejectWithValue }) => {
    try {
      if (!ownerId) throw new Error("ownerId gereklidir.");

      const q = {
        page: opt.page ?? 1,
        pageSize: opt.pageSize ?? 25,

        // arama/sıralama
        search: search ?? opt.search ?? undefined,
        sort: sort ?? opt.sort ?? undefined,

        // filtreler
        fromDate: fromDate ?? undefined,
        toDate: toDate ?? undefined,
        direction: direction ?? undefined,
        paymentMethod: paymentMethod ?? undefined,
        minAmount: minAmount ?? undefined,
        maxAmount: maxAmount ?? undefined,
      };

      const res = await franchiseOwnerService.getBalanceEntries(ownerId, q);

      // axios response vs direct data
      const raw = res?.data ?? res;

      // SuccessDataResult<Data> -> data
      const dto = raw?.data ?? raw;

      // FranchiseOwnerBalanceEntryPageDto -> { page, totalIn, totalOut, net }
      const page = dto?.page ?? dto; // eğer direkt PagedResult dönüyorsa

      return {
        paged: {
          items: page?.items ?? [],
          page: page?.page ?? q.page,
          pageSize: page?.pageSize ?? q.pageSize,
          totalCount: page?.totalCount ?? 0,
        },
        totals: {
          totalIn: dto?.totalIn ?? 0,
          totalOut: dto?.totalOut ?? 0,
          net: dto?.net ?? ((dto?.totalIn ?? 0) - (dto?.totalOut ?? 0)),
        },
      };
    } catch (err) {
      const msg = err?.response?.data?.message || err?.payload || err?.message || "Ledger alınamadı";
      return rejectWithValue(msg);
    }
  }
);


// Owner View - full
export const fetchAllOwnerViews = createAsyncThunk(
  "franchiseOwner/fetchAllOwnerViews",
  async (active = null, { rejectWithValue }) => {
    try {
      const res = await franchiseOwnerService.getAllOwnerView(active);
      return Array.isArray(res) ? res : (res?.data || []);
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Owner view listesi alınamadı");
    }
  }
);

// Owner View - paged
export const fetchOwnerViews = createAsyncThunk(
  "franchiseOwner/fetchOwnerViews",
  async ({ opt = {}, active = null } = {}, { rejectWithValue }) => {
    try {
      const res = await franchiseOwnerService.getOwnerViews(opt, active);
      const data = res?.data ?? res;
      return {
        items: data?.items || [],
        page: data?.page || opt.page || 1,
        pageSize: data?.pageSize || opt.pageSize || 20,
        totalCount: data?.totalCount || 0
      };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Owner view sayfası alınamadı");
    }
  }
);

// Owner Profile
export const fetchOwnerProfile = createAsyncThunk(
  "franchiseOwner/fetchOwnerProfile",
  async (ownerId, { rejectWithValue }) => {
    try {
      if (!ownerId) throw new Error("ownerId gereklidir.");
      const res = await franchiseOwnerService.getProfile(ownerId);
      return res?.data ?? res; // Controller Ok(dto) döndürüyor
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Profil alınamadı");
    }
  }
);

// CRUD
export const addFranchiseOwner = createAsyncThunk(
  "franchiseOwner/add",
  async (formDto, { rejectWithValue }) => {
    try {
      const p = toApiFranchiseOwner({ id: makeId(), ...formDto });
      if (!p.displayName) throw new Error("İsim (displayName) zorunludur.");
      const res = await franchiseOwnerService.add(p);
      return res?.data ?? res;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Kayıt eklenemedi");
    }
  }
);

export const updateFranchiseOwner = createAsyncThunk(
  "franchiseOwner/update",
  async ({ id, formDto }, { rejectWithValue }) => {
    try {
      if (!isUuidLike(String(id))) throw new Error("Geçersiz id");
      const p = toApiFranchiseOwner({ ...formDto, id });
      if (!p.displayName) throw new Error("İsim (displayName) zorunludur.");
      const res = await franchiseOwnerService.update(id, p);
      return res?.data ?? { ...p };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Kayıt güncellenemedi");
    }
  }
);

export const removeFranchiseOwner = createAsyncThunk(
  "franchiseOwner/remove",
  async (id, { rejectWithValue }) => {
    try {
      await franchiseOwnerService.remove(id);
      return id;
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Kayıt silinemedi");
    }
  }
);

export const activateFranchiseOwner = createAsyncThunk(
  "franchiseOwner/activate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await franchiseOwnerService.activate(id);
      return { id, message: res?.message || "Aktifleştirildi" };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Aktifleştirme başarısız");
    }
  }
);

export const deactivateFranchiseOwner = createAsyncThunk(
  "franchiseOwner/deactivate",
  async (id, { rejectWithValue }) => {
    try {
      const res = await franchiseOwnerService.deactivate(id);
      return { id, message: res?.message || "Pasifleştirildi" };
    } catch (err) {
      return rejectWithValue(err?.payload || err?.message || "Pasifleştirme başarısız");
    }
  }
);

/* ---------------- Slice ---------------- */
const initialState = {
  list: [],
  status: "idle",
  error: null,
  filters: { active: null },

  ownerViews: {
    list: [],
    paged: { items: [], page: 1, pageSize: 20, totalCount: 0 },
    status: "idle",
    error: null,
    table: { search: "", sort: "DisplayName:asc", page: 1, pageSize: 20 }
  },

  ownerProfile: {
    data: null,   // OwnerProfileDto
    status: "idle",
    error: null
  },

 ownerLedger: {
  paged: { items: [], page: 1, pageSize: 25, totalCount: 0 },
  status: "idle",
  error: null,
  table: { page: 1, pageSize: 25 },
  filters: { from: null, to: null, direction: null }
}


  
};

const franchiseOwnerSlice = createSlice({
  name: "franchiseOwner",
  initialState,
  reducers: {
    setFranchiseOwnerFilters: (s, a) => { s.filters = { ...s.filters, ...a.payload }; },
    clearFranchiseOwnerFilters: (s) => { s.filters = { active: null }; },

    setOwnerViewTable: (s, a) => { s.ownerViews.table = { ...s.ownerViews.table, ...a.payload }; },
    resetOwnerViewTable: (s) => { s.ownerViews.table = { search: "", sort: "DisplayName:asc", page: 1, pageSize: 20 }; },

    resetOwnerProfile: (s) => { s.ownerProfile = { data: null, status: "idle", error: null }; },

    setOwnerLedgerTable: (s, a) => { s.ownerLedger.table = { ...s.ownerLedger.table, ...a.payload }; },
    resetOwnerLedger: (s) => {
      s.ownerLedger = {
        paged: { items: [], page: 1, pageSize: 25, totalCount: 0 },
        totals: { totalIn: 0, totalOut: 0, net: 0 },
        status: "idle",
        error: null,
        table: { page: 1, pageSize: 25, fromDate: null, toDate: null, direction: null, search: "", sort: "OccurredAtUtc:desc" }
      };
    },

  },
  extraReducers: (b) => {
    // basic list
    b.addCase(fetchFranchiseOwners.pending,   (s) => { s.status = "loading"; s.error = null; })
     .addCase(fetchFranchiseOwners.fulfilled, (s, a) => { s.status = "succeeded"; s.list = a.payload || []; })
     .addCase(fetchFranchiseOwners.rejected,  (s, a) => { s.status = "failed"; s.error = a.payload || a.error?.message || "Hata"; });

    b.addCase(addFranchiseOwner.fulfilled, (s, a) => {
      const item = a.payload; if (!item) return;
      const i = s.list.findIndex(x => x.id === item.id);
      if (i === -1) s.list.push(item); else s.list[i] = item;
    });

    b.addCase(updateFranchiseOwner.fulfilled, (s, a) => {
      const item = a.payload; if (!item?.id) return;
      const i = s.list.findIndex(x => x.id === item.id);
      if (i !== -1) s.list[i] = item;
    });

    b.addCase(removeFranchiseOwner.fulfilled, (s, a) => {
      const id = a.payload; s.list = (s.list || []).filter(x => x.id !== id);
    });

    b.addCase(activateFranchiseOwner.fulfilled, (s, a) => {
      const id = a.payload?.id; const i = s.list.findIndex(x => x.id === id);
      if (i !== -1) s.list[i].isActive = true;
    });

    b.addCase(deactivateFranchiseOwner.fulfilled, (s, a) => {
      const id = a.payload?.id; const i = s.list.findIndex(x => x.id === id);
      if (i !== -1) s.list[i].isActive = false;
    });

    // owner views
    b.addCase(fetchAllOwnerViews.pending,   (s) => { s.ownerViews.status = "loading"; s.ownerViews.error = null; })
     .addCase(fetchAllOwnerViews.fulfilled, (s, a) => { s.ownerViews.status = "succeeded"; s.ownerViews.list = a.payload || []; })
     .addCase(fetchAllOwnerViews.rejected,  (s, a) => { s.ownerViews.status = "failed"; s.ownerViews.error = a.payload || a.error?.message || "Hata"; });

    b.addCase(fetchOwnerViews.pending,   (s) => { s.ownerViews.status = "loading"; s.ownerViews.error = null; })
     .addCase(fetchOwnerViews.fulfilled, (s, a) => {
        s.ownerViews.status = "succeeded";
        const { items, page, pageSize, totalCount } = a.payload || {};
        s.ownerViews.paged.items = items || [];
        s.ownerViews.paged.page = page || 1;
        s.ownerViews.paged.pageSize = pageSize || 20;
        s.ownerViews.paged.totalCount = totalCount || 0;
     })
     .addCase(fetchOwnerViews.rejected,  (s, a) => {
        s.ownerViews.status = "failed";
        s.ownerViews.error = a.payload || a.error?.message || "Hata";
     });

    // profile
    b.addCase(fetchOwnerProfile.pending,   (s) => {
      s.ownerProfile.status = "loading";
      s.ownerProfile.error = null;
    });
    b.addCase(fetchOwnerProfile.fulfilled, (s, a) => {
      s.ownerProfile.status = "succeeded";
      const d = a.payload || {};
      // null-safe normalize (UI undefined görmesin)
      s.ownerProfile.data = {
        id: d.id ?? "",
        displayName: d.displayName ?? "",
        fatherName: d.fatherName ?? "",
        gender: d.gender ?? 0,
        nationalId: d.nationalId ?? "",
        phonePrimary: d.phonePrimary ?? "",
        phoneSecondary: d.phoneSecondary ?? "",
        province: d.province ?? "",
        district: d.district ?? "",
        addressLine: d.addressLine ?? "",
        addressFull: d.addressFull ?? "",
        description: d.description ?? "",
        balance: d.balance ?? 0,
        avatarUrl: d.avatarUrl ?? "",
        idFrontUrl: d.idFrontUrl ?? "",
        idBackUrl: d.idBackUrl ?? "",
        fingerBitmapUrl: d.fingerBitmapUrl ?? "",
        contractUrl: d.contractUrl ?? ""
      };
    });
    b.addCase(fetchOwnerProfile.rejected,  (s, a) => {
      s.ownerProfile.status = "failed";
      s.ownerProfile.error = a.payload || a.error?.message || "Hata";
    });

    // owner ledger
    b.addCase(fetchOwnerLedger.pending, (s) => {
      s.ownerLedger.status = "loading";
      s.ownerLedger.error = null;
    });
    b.addCase(fetchOwnerLedger.fulfilled, (s, a) => {
      s.ownerLedger.status = "succeeded";
      s.ownerLedger.paged = a.payload?.paged ?? s.ownerLedger.paged;
      s.ownerLedger.totals = a.payload?.totals ?? s.ownerLedger.totals;
    });
    b.addCase(fetchOwnerLedger.rejected, (s, a) => {
      s.ownerLedger.status = "failed";
      s.ownerLedger.error = a.payload || a.error?.message || "Hata";
    });

  },
});

export const {
  setFranchiseOwnerFilters,
  clearFranchiseOwnerFilters,
  setOwnerViewTable,
  resetOwnerViewTable,
  resetOwnerProfile,
  setOwnerLedgerTable,
  resetOwnerLedger
} = franchiseOwnerSlice.actions;

export default franchiseOwnerSlice.reducer;
