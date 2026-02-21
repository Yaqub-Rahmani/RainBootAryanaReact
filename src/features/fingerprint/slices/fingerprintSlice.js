import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fingerprintService } from "../services/fingerprintService";

// ---------- Thunks ----------

// /api/Fingerprint/scan
// payload: { TimeoutMs?, IncludeImage? }
export const scanFingerprint = createAsyncThunk(
  "fingerprint/scan",
  async (payload, { rejectWithValue }) => {
    try {
      // success: { message, templateBase64, imagePngBase64?, deviceId, serialNumber }
      const data = await fingerprintService.scan(payload);
      return data;
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "Scan failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/enroll
// payload: { UserId, RequiredSamples?, TimeoutMs?, IncludeImage? }
export const enrollFingerprint = createAsyncThunk(
  "fingerprint/enroll",
  async (payload, { rejectWithValue }) => {
    try {
      // success: { message, mergedTemplateBase64, collectedSampleCount, lastSampleImagePngBase64? }
      const data = await fingerprintService.enroll(payload);
      return data;
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "Enroll failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/verify
// payload: { EnrolledTemplateBase64, TimeoutMs?, IncludeImage? }
export const verifyFingerprint = createAsyncThunk(
  "fingerprint/verify",
  async (payload, { rejectWithValue }) => {
    try {
      // success: { message, score, capturedImagePngBase64? }
      const data = await fingerprintService.verify(payload);
      return data;
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "Verify failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/identify
// payload: { TimeoutMs?, IncludeImage? }
export const identifyFingerprint = createAsyncThunk(
  "fingerprint/identify",
  async (payload, { rejectWithValue }) => {
    try {
      // success: { message, matchedUserId, score, capturedImagePngBase64? }
      const data = await fingerprintService.identify(payload);
      return data;
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "Identify failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/status
export const getFingerprintStatus = createAsyncThunk(
  "fingerprint/status",
  async (_, { rejectWithValue }) => {
    try {
      // { deviceOpened, imageWidth, imageHeight, dpi, deviceCount }
      const data = await fingerprintService.status();
      return data;
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "Status failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/db/add
// payload: { UserId, TemplateBase64 }
export const addTemplateToDb = createAsyncThunk(
  "fingerprint/dbAdd",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await fingerprintService.dbAdd(payload);
      return data; // { message, userId }
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "DB Add failed" };
      return rejectWithValue(data);
    }
  }
);

// /api/Fingerprint/db/clear
export const clearFingerprintDb = createAsyncThunk(
  "fingerprint/dbClear",
  async (_, { rejectWithValue }) => {
    try {
      const data = await fingerprintService.dbClear();
      return data; // { message }
    } catch (err) {
      const data = err?.response?.data ?? { message: err?.message ?? "DB Clear failed" };
      return rejectWithValue(data);
    }
  }
);

// ---------- Slice ----------

const initialState = {
  // generic op status
  status: "idle", // idle | loading | success | error

  // last scan result
  result: null,   // { message, templateBase64, imagePngBase64?, deviceId, serialNumber }
  error: null,

  // device info
  device: null,   // { deviceOpened, imageWidth, imageHeight, dpi, deviceCount }

  // enroll / verify / identify last results
  enroll: null,   // { message, mergedTemplateBase64, collectedSampleCount, lastSampleImagePngBase64? }
  verify: null,   // { message, score, capturedImagePngBase64? }
  identify: null, // { message, matchedUserId, score, capturedImagePngBase64? }
};

const fingerprintSlice = createSlice({
  name: "fingerprint",
  initialState,
  reducers: {
    resetFingerprint(state) {
      state.status = "idle";
      state.result = null;
      state.error = null;
      state.enroll = null;
      state.verify = null;
      state.identify = null;
    },
  },
  extraReducers: (b) => {
    // ---- scan ----
    b.addCase(scanFingerprint.pending, (s) => {
      s.status = "loading";
      s.result = null;
      s.error = null;
    });
    b.addCase(scanFingerprint.fulfilled, (s, a) => {
      s.status = "success";
      s.result = a.payload;
    });
    b.addCase(scanFingerprint.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "Scan failed" };
    });

    // ---- enroll ----
    b.addCase(enrollFingerprint.pending, (s) => {
      s.status = "loading";
      s.enroll = null;
      s.error = null;
    });
    b.addCase(enrollFingerprint.fulfilled, (s, a) => {
      s.status = "success";
      s.enroll = a.payload;
    });
    b.addCase(enrollFingerprint.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "Enroll failed" };
    });

    // ---- verify ----
    b.addCase(verifyFingerprint.pending, (s) => {
      s.status = "loading";
      s.verify = null;
      s.error = null;
    });
    b.addCase(verifyFingerprint.fulfilled, (s, a) => {
      s.status = "success";
      s.verify = a.payload;
    });
    b.addCase(verifyFingerprint.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "Verify failed" };
    });

    // ---- identify ----
    b.addCase(identifyFingerprint.pending, (s) => {
      s.status = "loading";
      s.identify = null;
      s.error = null;
    });
    b.addCase(identifyFingerprint.fulfilled, (s, a) => {
      s.status = "success";
      s.identify = a.payload;
    });
    b.addCase(identifyFingerprint.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "Identify failed" };
    });

    // ---- status ----
    b.addCase(getFingerprintStatus.fulfilled, (s, a) => {
      s.device = a.payload;
    });

    // ---- DB add/clear (sadece mesajları dönüyor) ----
    b.addCase(addTemplateToDb.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(addTemplateToDb.fulfilled, (s) => {
      s.status = "success";
    });
    b.addCase(addTemplateToDb.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "DB Add failed" };
    });

    b.addCase(clearFingerprintDb.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(clearFingerprintDb.fulfilled, (s) => {
      s.status = "success";
    });
    b.addCase(clearFingerprintDb.rejected, (s, a) => {
      s.status = "error";
      s.error = a.payload ?? { message: "DB Clear failed" };
    });
  },
});

export const { resetFingerprint } = fingerprintSlice.actions;
export default fingerprintSlice.reducer;


// import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
// import { fingerprintService } from "../services/fingerprintService";

// // /api/Fingerprint/scan
// export const scanFingerprint = createAsyncThunk(
//   "fingerprint/scan",
//   async (_, { rejectWithValue }) => {
//     try {
//       // body: { message, templateBase64, deviceId, serialNumber }
//       const data = await fingerprintService.scan();
//       return data;
//     } catch (err) {
//       const data = err?.response?.data ?? { message: err?.message ?? "Scan failed" };
//       return rejectWithValue(data);
//     }
//   }
// );

// // /api/Fingerprint/status (opsiyonel)
// export const getFingerprintStatus = createAsyncThunk(
//   "fingerprint/status",
//   async (_, { rejectWithValue }) => {
//     try {
//       const data = await fingerprintService.status();
//       return data; // { deviceOpened, imageWidth, imageHeight, dpi, deviceCount }
//     } catch (err) {
//       const data = err?.response?.data ?? { message: err?.message ?? "Status failed" };
//       return rejectWithValue(data);
//     }
//   }
// );

// const initialState = {
//   status: "idle",   // idle | scanning | success | error
//   result: null,     // { message, templateBase64, deviceId, serialNumber }
//   error: null,      // { message, ... }
//   device: null,     // status body
// };

// const fingerprintSlice = createSlice({
//   name: "fingerprint",
//   initialState,
//   reducers: {
//     resetFingerprint(state) {
//       state.status = "idle";
//       state.result = null;
//       state.error = null;
//     },
//   },
//   extraReducers: (b) => {
//     b.addCase(scanFingerprint.pending, (s) => {
//       s.status = "scanning";
//       s.result = null;
//       s.error = null;
//     });
//     b.addCase(scanFingerprint.fulfilled, (s, a) => {
//       s.status = "success";
//       s.result = a.payload;
//     });
//     b.addCase(scanFingerprint.rejected, (s, a) => {
//       s.status = "error";
//       s.error = a.payload ?? { message: "Scan failed" };
//     });

//     b.addCase(getFingerprintStatus.fulfilled, (s, a) => {
//       s.device = a.payload;
//     });
//   },
// });

// export const { resetFingerprint } = fingerprintSlice.actions;
// export default fingerprintSlice.reducer;