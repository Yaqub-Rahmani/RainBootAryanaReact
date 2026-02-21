import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { imageService } from "../services/imageService";

// Thunk — Data URL görseli kaydet
export const saveImageIfDataUrl = createAsyncThunk(
  "images/saveIfDataUrl",
  async ({ photoFolderUrl, baseFile }) => {
    const res = await imageService.saveIfDataUrl({ photoFolderUrl, baseFile });
    return res; // { saved, path, fileName, mime, width, height, sizeBytes, error }
  }
);

const initialState = {
  status: "idle",      // idle | loading | succeeded | failed
  lastResult: null,    // son kaydedilen görselin dönen objesi
  error: null,
};

const imagesSlice = createSlice({
  name: "images",
  initialState,
  reducers: {
    resetImages(state) {
      state.status = "idle";
      state.lastResult = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(saveImageIfDataUrl.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(saveImageIfDataUrl.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.lastResult = a.payload || null;
        // servis saved=false dönerse bile lastResult'ta durur, UI kontrol edebilir
      })
      .addCase(saveImageIfDataUrl.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.error?.message || "Görsel kaydedilemedi";
      });
  },
});

export const { resetImages } = imagesSlice.actions;
export default imagesSlice.reducer;
