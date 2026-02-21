import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { meterReadingService } from "../services/meterReadingService";

const baseInitial = {
  list: [],
  status: "idle",
  error: null,
  current: null,
  newContext: {
    data: null,
    status: "idle",
    error: null,
  },
};
const toArray = (p) => (Array.isArray(p) ? p : []);

export const fetchMeterReadings = createAsyncThunk(
  "meterReading/fetchAll",
  async (params) => {
    return await meterReadingService.getAll(params);
  }
);
export const addMeterReading = createAsyncThunk(
  "meterReading/add",
  async (dto) => {
    return await meterReadingService.add(dto); // backend mesaj döndürebilir; create edilen entity tercih edilir
  }
);
export const updateMeterReading = createAsyncThunk(
  "meterReading/update",
  async ({ id, dto }) => {
    await meterReadingService.update(id, dto);
    return { id, dto };
  }
);
export const removeMeterReading = createAsyncThunk(
  "meterReading/remove",
  async (id) => {
    await meterReadingService.remove(id);
    return id;
  }
);
export const finalizeMeterReading = createAsyncThunk(
  "meterReading/finalize",
  async (id) => {
    await meterReadingService.finalize(id);
    return id;
  }
);
export const unfinalizeMeterReading = createAsyncThunk(
  "meterReading/unfinalize",
  async (id) => {
    await meterReadingService.unfinalize(id);
    return id;
  }
);
export const fetchMeterReadingNewContext = createAsyncThunk(
  "meterReading/fetchNewContext",
  async (contractId) => {
    return await meterReadingService.getNewContext(contractId);
  }
);

const meterReadingSlice = createSlice({
  name: "meterReading",
  initialState: { ...baseInitial },
  reducers: {
    setCurrentMeterReading: (s, a) => {
      s.current = a.payload || null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchMeterReadings.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchMeterReadings.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = toArray(a.payload);
      })
      .addCase(fetchMeterReadings.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.error?.message || "Hata";
      })

      .addCase(addMeterReading.fulfilled, (s, a) => {
        if (a.payload?.id) s.list.push(a.payload);
      })
      .addCase(updateMeterReading.fulfilled, (s, a) => {
        const idx = s.list.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
      })
      .addCase(removeMeterReading.fulfilled, (s, a) => {
        s.list = s.list.filter((x) => x.id !== a.payload);
      })
      .addCase(finalizeMeterReading.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload);
        if (i >= 0) {
          s.list[i].isFinalized = true;
        }
      })
      .addCase(unfinalizeMeterReading.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload);
        if (i >= 0) {
          s.list[i].isFinalized = false;
        }
      })
      .addCase(fetchMeterReadingNewContext.pending, (s) => {
        s.newContext.status = "loading";
        s.newContext.error = null;
      })
      .addCase(fetchMeterReadingNewContext.fulfilled, (s, a) => {
        s.newContext.status = "succeeded";
        s.newContext.data = a.payload || null;
      })
      .addCase(fetchMeterReadingNewContext.rejected, (s, a) => {
        s.newContext.status = "failed";
        s.newContext.error = a.error?.message || "Yeni context alınamadı";
      });
  },
});

export const { setCurrentMeterReading } = meterReadingSlice.actions;
export const meterReadingReducer = meterReadingSlice.reducer;

// 🔽 BUNU EKLE
export default meterReadingSlice.reducer;

// export const { setCurrentMeterReading } = meterReadingSlice.actions;
// export const meterReadingReducer = meterReadingSlice.reducer;
