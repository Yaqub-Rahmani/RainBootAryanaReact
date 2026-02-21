import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { familyMemberService } from "../service/familyMemberService";

const toArray = (p) => (Array.isArray(p) ? p : []);

// Tüm üyeleri getir (normal GetAll)
export const fetchFamilyMembers = createAsyncThunk(
  "familyMember/fetchAll",
  async (includeInactive) => {
    // api.get doğrudan data döndürüyor
    const data = await familyMemberService.getAll(includeInactive);
    return data; // liste
  }
);

// Tek bir üyeyi getir
export const fetchFamilyMember = createAsyncThunk(
  "familyMember/fetchOne",
  async (id) => {
    const data = await familyMemberService.get(id);
    return data; // tek kayıt
  }
);

// VIEW ALL: /api/FamilyMember/views/all
export const fetchFamilyView = createAsyncThunk(
  "familyMember/fetchFamilyView",
  async (active) => {
    const data = await familyMemberService.getAllFamilyView(active);
    return data; // api.get zaten data döndürüyor
  }
);

// Yeni üye ekle
export const addFamilyMember = createAsyncThunk(
  "familyMember/add",
  async (dto) => {
    // backend sadece mesaj dönüyor
    await familyMemberService.add(dto);
    // listeyi güncellemek için dto'yu geri döndürüyoruz
    return dto;
  }
);

// Üye güncelle
export const updateFamilyMember = createAsyncThunk(
  "familyMember/update",
  async ({ id, dto }) => {
    await familyMemberService.update(id, dto);
    return dto;
  }
);

// Üye sil
export const removeFamilyMember = createAsyncThunk(
  "familyMember/remove",
  async (id) => {
    await familyMemberService.remove(id);
    return id;
  }
);

// ✅ EKLE: Profile
export const fetchFamilyMemberProfile = createAsyncThunk(
  "familyMember/fetchProfile",
  async (id, thunkApi) => {
    try {
      const data = await familyMemberService.getProfile(id);
      return { id, data };
    } catch (err) {
      return thunkApi.rejectWithValue(err?.message || "Hata");
    }
  }
);

const initialState = {
  list: [],      // normal GetAll listesi
  viewList: [],  // views/all listesi
  current: null,
  status: "idle",
  error: null,

  
  // ✅ EKLE
  profile: null,
  profileStatus: "idle",
  profileError: null,

  status: "idle",
  error: null,
};

const familyMemberSlice = createSlice({
  name: "familyMember",
  initialState,
  reducers: {
    setCurrentFamilyMember: (state, action) => {
      state.current = action.payload || null;
    },
        // ✅ EKLE
    clearFamilyMemberProfile: (state) => {
      state.profile = null;
      state.profileStatus = "idle";
      state.profileError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Liste (GetAll)
      .addCase(fetchFamilyMembers.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFamilyMembers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.list = toArray(action.payload);
      })
      .addCase(fetchFamilyMembers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Hata";
      })

            // ✅ EKLE: profile
      .addCase(fetchFamilyMemberProfile.pending, (state) => {
        state.profileStatus = "loading";
        state.profileError = null;
      })
      .addCase(fetchFamilyMemberProfile.fulfilled, (state, action) => {
        state.profileStatus = "succeeded";
        state.profile = action.payload?.data ?? null;
      })
      .addCase(fetchFamilyMemberProfile.rejected, (state, action) => {
        state.profileStatus = "failed";
        state.profileError = action.payload || action.error?.message || "Hata";
      })

      // Tek kayıt
      .addCase(fetchFamilyMember.fulfilled, (state, action) => {
        state.current = action.payload || null;
      })

      // VIEW ALL (views/all)
      .addCase(fetchFamilyView.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchFamilyView.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.viewList = toArray(action.payload);
      })
      .addCase(fetchFamilyView.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.error?.message || "Hata";
      })

      // Ekle
      .addCase(addFamilyMember.fulfilled, (state, action) => {
        if (action.payload?.id) {
          state.list.push(action.payload);
        }
      })

      
      // Güncelle
      .addCase(updateFamilyMember.fulfilled, (state, action) => {
        const updated = action.payload;
        const idx = state.list.findIndex((x) => x.id === updated.id);
        if (idx >= 0) state.list[idx] = updated;
        if (state.current?.id === updated.id) {
          state.current = updated;
        }
      })

      // Sil
      .addCase(removeFamilyMember.fulfilled, (state, action) => {
        const id = action.payload;
        state.list = state.list.filter((x) => x.id !== id);
        if (state.current?.id === id) {
          state.current = null;
        }
      });
  },
});



export const { setCurrentFamilyMember, clearFamilyMemberProfile } = familyMemberSlice.actions;
export default familyMemberSlice.reducer;