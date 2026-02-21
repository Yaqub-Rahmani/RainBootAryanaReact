import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { provinceService } from "../services/provinceService";

export const fetchProvinces = createAsyncThunk("province/fetchAll", async () => {
  const res = await provinceService.getAll();
  return res; // apiClient JSON döndürüyor → direkt dizi
});

export const addProvince = createAsyncThunk("province/add", async (dto) => {
  const res = await provinceService.add(dto);
  return res; // created Province objesi
});

const initialState = { list: [], status: "idle", error: null };

const provinceSlice = createSlice({
  name: "province",
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProvinces.pending,   (s)    => { s.status = "loading"; })
     .addCase(fetchProvinces.fulfilled, (s, a) => { s.status = "succeeded"; s.list = Array.isArray(a.payload) ? a.payload : []; })
     .addCase(fetchProvinces.rejected,  (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; })

     // push yaklaşımı — backend created Province döndürdüğü için güvenli
    .addCase(addProvince.fulfilled, (s, a) => {
      if (!Array.isArray(s.list)) s.list = [];
      if (a.payload?.id) s.list.push(a.payload);
    })
  },
});

export default provinceSlice.reducer;
