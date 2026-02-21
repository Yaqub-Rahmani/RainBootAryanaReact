import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { tenantService } from "../services/tenantService";

// ---------------- Thunks ----------------

// Entity listesi
export const fetchTenants = createAsyncThunk(
  "tenant/fetchAll",
  async ({ onlyActive } = {}) => {
    const res = await tenantService.getAll(onlyActive);
    return Array.isArray(res) ? res : [];
  }
);

// Tek entity
export const fetchTenant = createAsyncThunk("tenant/fetchOne", async (id) => {
  const res = await tenantService.get(id);
  return res;
});

// Sayfalı detay listesi
export const fetchTenantDetails = createAsyncThunk(
  "tenant/fetchDetails",
  async ({ opt = {}, onlyActive } = {}) => {
    const res = await tenantService.getDetails(opt, onlyActive);
    // Normalize: dizi dönerse {items,total,...} şekline çevir
    if (Array.isArray(res)) {
      return { items: res, total: res.length || 0, page: 1, pageSize: res.length || 0 };
    }
    return res || { items: [], total: 0, page: 1, pageSize: 0 };
  }
);

export const addTenant = createAsyncThunk("tenant/add", async (dto) => {
  const res = await tenantService.add(dto);
  return res; // created tenant objesi bekleniyor
});

export const updateTenant = createAsyncThunk("tenant/update", async ({ id, dto }) => {
  const res = await tenantService.update(id, dto);
  // Bazı backendlere göre response boş olabilir; bu yüzden dto'yu geri döndür.
  return res?.id ? res : { id, ...dto };
});

export const removeTenant = createAsyncThunk("tenant/remove", async (id) => {
  await tenantService.remove(id);
  return id;
});

// Durum (aktif/pasif)
export const activateTenant = createAsyncThunk("tenant/activate", async (id) => {
  await tenantService.activate(id);
  return id;
});
export const deactivateTenant = createAsyncThunk("tenant/deactivate", async (id) => {
  await tenantService.deactivate(id);
  return id;
});

// View listesi (FranchiseOwnerViewDto benzeri TenantViewDto)
export const fetchTenantViews = createAsyncThunk(
  "tenant/fetchViews",
  async ({ active } = {}) => {
    const res = await tenantService.getViewsAll(active);
    return Array.isArray(res) ? res : [];
  }
);

// ---------------- State & Helpers ----------------
const initialState = {
  list: [],                              // entity list
  details: { items: [], total: 0, page: 1, pageSize: 0 }, // paged list
  byId: {},                              // tekil cache
  views: [],                             // view list (TenantViewDto[])

  status: "idle",          // genel liste durumu
  detailsStatus: "idle",   // paged liste durumu
  itemStatus: "idle",      // tekil item durumu
  viewsStatus: "idle",     // view list durumu

  error: null,
  filters: { onlyActive: undefined },
};

const upsert = (arr, obj) => {
  if (!obj?.id) return arr;
  const i = arr.findIndex((x) => x.id === obj.id);
  if (i === -1) return [...arr, obj];
  const clone = arr.slice();
  clone[i] = { ...clone[i], ...obj };
  return clone;
};

// isActive bayrağını mutasyonsuz güncelle
const markIsActive = (arr, id, isActiveVal) => {
  const i = arr.findIndex((x) => x.id === id);
  if (i === -1) return arr;
  const clone = arr.slice();
  clone[i] = { ...clone[i], isActive: isActiveVal };
  return clone;
};

const tenantSlice = createSlice({
  name: "tenant",
  initialState,
  reducers: {
    setOnlyActive(state, action) {
      state.filters.onlyActive = action.payload;
    },
    clearTenantState() {
      return initialState;
    },
  },
  extraReducers: (b) => {
    // ------- fetchAll -------
    b.addCase(fetchTenants.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchTenants.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = Array.isArray(a.payload) ? a.payload : [];
      })
      .addCase(fetchTenants.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.error?.message || "Hata";
      });

    // ------- fetchDetails -------
    b.addCase(fetchTenantDetails.pending, (s) => {
      s.detailsStatus = "loading";
      s.error = null;
    })
      .addCase(fetchTenantDetails.fulfilled, (s, a) => {
        s.detailsStatus = "succeeded";
        const { items = [], total = 0, page = 1, pageSize = items.length } = a.payload || {};
        s.details = { items, total, page, pageSize };
      })
      .addCase(fetchTenantDetails.rejected, (s, a) => {
        s.detailsStatus = "failed";
        s.error = a.error?.message || "Hata";
      });

    // ------- fetchOne -------
    b.addCase(fetchTenant.pending, (s) => {
      s.itemStatus = "loading";
      s.error = null;
    })
      .addCase(fetchTenant.fulfilled, (s, a) => {
        s.itemStatus = "succeeded";
        const t = a.payload;
        if (t?.id) {
          s.byId[t.id] = t;
          s.list = upsert(s.list, t);
          s.details.items = upsert(s.details.items, t);
        }
      })
      .addCase(fetchTenant.rejected, (s, a) => {
        s.itemStatus = "failed";
        s.error = a.error?.message || "Hata";
      });

    // ------- add -------
    b.addCase(addTenant.fulfilled, (s, a) => {
      const t = a.payload;
      if (t?.id) {
        s.list = upsert(s.list, t);
        s.details.items = upsert(s.details.items, t);
        s.byId[t.id] = { ...(s.byId[t.id] || {}), ...t };
      }
    });

    // ------- update -------
    b.addCase(updateTenant.fulfilled, (s, a) => {
      const t = a.payload;
      if (t?.id) {
        s.list = upsert(s.list, t);
        s.details.items = upsert(s.details.items, t);
        s.byId[t.id] = { ...(s.byId[t.id] || {}), ...t };
      }
    });

    // ------- remove -------
    b.addCase(removeTenant.fulfilled, (s, a) => {
      const id = a.payload;
      s.list = s.list.filter((x) => x.id !== id);
      s.details.items = s.details.items.filter((x) => x.id !== id);
      if (s.byId[id]) delete s.byId[id];
    });

    // ------- activate/deactivate -------
    b.addCase(activateTenant.fulfilled, (s, a) => {
      const id = a.payload;
      s.list = markIsActive(s.list, id, true);
      s.details.items = markIsActive(s.details.items, id, true);
      if (s.byId[id]) s.byId[id] = { ...s.byId[id], isActive: true };
    });
    b.addCase(deactivateTenant.fulfilled, (s, a) => {
      const id = a.payload;
      s.list = markIsActive(s.list, id, false);
      s.details.items = markIsActive(s.details.items, id, false);
      if (s.byId[id]) s.byId[id] = { ...s.byId[id], isActive: false };
    });

    // ------- views (TenantViewDto list) -------
    b.addCase(fetchTenantViews.pending, (s) => {
      s.viewsStatus = "loading";
      s.error = null;
    })
      .addCase(fetchTenantViews.fulfilled, (s, a) => {
        s.viewsStatus = "succeeded";
        s.views = Array.isArray(a.payload) ? a.payload : [];
      })
      .addCase(fetchTenantViews.rejected, (s, a) => {
        s.viewsStatus = "failed";
        s.error = a.error?.message || "Hata";
      });
  },
});

export const { setOnlyActive, clearTenantState } = tenantSlice.actions;
export default tenantSlice.reducer;
