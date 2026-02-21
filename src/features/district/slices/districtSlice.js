import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { districtService } from "../services/districtService";

// Tüm ilçeler (detaysız - sade liste)
export const fetchDistricts = createAsyncThunk("district/fetchAll", async () => {
  const res = await districtService.getAll();
  return res; // apiClient JSON döndürüyor → direkt dizi
});

// Province filtreli detaylı liste (opsiyonel)
export const fetchDistrictDetails = createAsyncThunk(
  "district/fetchDetails",
  async ({ queryOptions = {}, provinceId = null } = {}) => {
    const res = await districtService.getDetails(queryOptions, provinceId);
    return { res, provinceId };
  }
);

// Yeni ilçe ekle
export const addDistrict = createAsyncThunk("district/add", async (dto) => {
  const res = await districtService.add(dto);
  return res; // created District objesi
});

const initialState = {
  list: [],               // sade liste
  details: [],            // detay endpointinden gelen liste
  selectedProvinceId: null,
  status: "idle",
  detailsStatus: "idle",
  error: null,
};

const districtSlice = createSlice({
  name: "district",
  initialState,
  reducers: {
    setSelectedProvinceId(state, action) {
      state.selectedProvinceId = action.payload ?? null;
    },
    clearDetails(state) {
      state.details = [];
    },
  },
  extraReducers: (b) => {
    // ---- fetchAll ----
    b.addCase(fetchDistricts.pending,   (s)    => { s.status = "loading"; s.error = null; })
     .addCase(fetchDistricts.fulfilled, (s, a) => { s.status = "succeeded"; s.list = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchDistricts.rejected,  (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; });

    // ---- fetchDetails (province filtresiyle) ----
    b.addCase(fetchDistrictDetails.pending,   (s)    => { s.detailsStatus = "loading"; s.error = null; })
     .addCase(fetchDistrictDetails.fulfilled, (s, a) => {
        s.detailsStatus = "succeeded";
        const { res, provinceId } = a.payload || {};
        s.selectedProvinceId = provinceId ?? null;
        s.details = Array.isArray(res) ? res : (res?.items || res?.data || []);
     })
     .addCase(fetchDistrictDetails.rejected,  (s, a) => { s.detailsStatus = "failed"; s.error = a.error?.message || "Hata"; });

    // ---- add ----
    b.addCase(addDistrict.fulfilled, (s, a) => {
      // created District objesi
      const item = a.payload;
      if (!item) return;
      // list'e push
      if (!Array.isArray(s.list)) s.list = [];
      // Duplicate önle (id bazlı)
      if (!s.list.some(d => d.id === item.id)) s.list.push(item);

      // eğer seçili province'a aitse, details listesine de ekle
      if (s.selectedProvinceId && item.provinceId === s.selectedProvinceId) {
        if (!Array.isArray(s.details)) s.details = [];
        if (!s.details.some(d => d.id === item.id)) s.details.push(item);
      }
    });
  },
});

export const { setSelectedProvinceId, clearDetails } = districtSlice.actions;
export default districtSlice.reducer;
