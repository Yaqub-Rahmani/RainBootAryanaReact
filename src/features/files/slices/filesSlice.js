import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { filesService } from "../services/filesService";
import { mediaAssetService } from "../../mediaAsset/services/mediaAssetService";


/** Basit GUID üretici (projenin ortak guid util'in varsa onu kullan) */
const guid = () =>
  (globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0,
        v = c === "x" ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    }));

/**
 * Tek dosya yükleme (yalın)
 * payload: { file: File, folderUrl: string }
 * return:  { saved, relativePath, fileName, mime, sizeBytes, error }
 */
export const uploadFile = createAsyncThunk(
  "files/uploadFile",
  async ({ file, folderUrl }, { rejectWithValue }) => {
    try {
      const res = await filesService.upload(file, folderUrl);
      const data = res?.data ?? res;
      return data;
    } catch (err) {
      const msg = err?.response?.data ?? err?.message ?? "Upload failed";
      return rejectWithValue(String(msg));
    }
  }
);

/**
 * Franchise sözleşmesi senaryosu: Yükle + MediaAssets kaydet
 * payload: { file: File, ownerId: string, ownerType?:number=3, kind?:number=5, folderUrl:string, isPrimary?:boolean=true }
 * return:  { upload, media, mediaDto }
 */
export const uploadContractAndSaveMedia = createAsyncThunk(
  "files/uploadContractAndSaveMedia",
  async (
    {
      file,
      ownerId,
      folderUrl,
      ownerType = 3, // FranchiseOwner
      kind = 5,      // FranchiseContract
      isPrimary = true,
      createdAt = new Date().toISOString(),
    },
    { dispatch, rejectWithValue }
  ) => {
    try {
      // 1) Dosyayı yükle
      const upload = await dispatch(uploadFile({ file, folderUrl })).unwrap();
      if (!upload?.saved) {
        throw new Error(upload?.error || "Upload not saved");
      }

      // 2) MediaAssets kaydı
      const mediaDto = {
        id: guid(),
        ownerType,
        ownerId,
        kind,
        storageUrl: upload.relativePath, // backend relativePath döndürüyor
        hashChecksum: "",
        isPrimary,
        createdAt,
      };

      const mediaRes = await mediaAssetService.add(mediaDto);
      const media = mediaRes?.data ?? mediaRes;

      return { upload, media, mediaDto };
    } catch (err) {
      const msg = err?.response?.data ?? err?.message ?? "Upload+Media failed";
      return rejectWithValue(String(msg));
    }
  }
);

const initialState = {
  status: "idle",           // idle | loading | succeeded | failed
  lastUpload: null,         // { saved, relativePath, ... }
  lastMediaLink: null,      // { upload, media, mediaDto }
  error: null,
};

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {
    resetFiles(state) {
      state.status = "idle";
      state.lastUpload = null;
      state.lastMediaLink = null;
      state.error = null;
    },
  },
  extraReducers: (b) => {
    // uploadFile
    b.addCase(uploadFile.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(uploadFile.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.lastUpload = a.payload ?? null;
      s.error = null;
    });
    b.addCase(uploadFile.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.payload || a.error?.message || "Upload failed";
    });

    // uploadContractAndSaveMedia
    b.addCase(uploadContractAndSaveMedia.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(uploadContractAndSaveMedia.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.lastMediaLink = a.payload ?? null;
      // lastUpload da faydalı olsun diye güncelleyebiliriz
      s.lastUpload = a.payload?.upload ?? s.lastUpload;
      s.error = null;
    });
    b.addCase(uploadContractAndSaveMedia.rejected, (s, a) => {
      s.status = "failed";
      s.error = a.payload || a.error?.message || "Upload+Media failed";
    });
  },
});

export const { resetFiles } = filesSlice.actions;
export default filesSlice.reducer;

/** Selectors */
export const selectFilesStatus = (state) => state.files.status;
export const selectFilesError = (state) => state.files.error;
export const selectLastUpload = (state) => state.files.lastUpload;
export const selectLastMediaLink = (state) => state.files.lastMediaLink;
