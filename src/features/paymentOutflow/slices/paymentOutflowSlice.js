import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { paymentOutflowService } from "../services/paymentOutflowService";

export const createPaymentOutflow = createAsyncThunk(
  "paymentOutflows/create",
  async ({ dto } = {}, thunkApi) => {
    try {
      const res = await paymentOutflowService.create(dto);
      const data = res?.data ?? res;
      return { data, dto };
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Hata";
      return thunkApi.rejectWithValue(msg);
    }
  }
);

const initialState = {
  createStatus: "idle",
  createError: null,
  lastCreated: null, // { paymentId, moneyEntryId, domainEntryId, ... }
};

const paymentOutflowSlice = createSlice({
  name: "paymentOutflows",
  initialState,
  reducers: {
    clearCreate(state) {
      state.createStatus = "idle";
      state.createError = null;
      state.lastCreated = null;
    },
  },
  extraReducers: (b) => {
    b.addCase(createPaymentOutflow.pending, (s) => {
      s.createStatus = "loading";
      s.createError = null;
      s.lastCreated = null;
    })
      .addCase(createPaymentOutflow.fulfilled, (s, a) => {
        s.createStatus = "succeeded";
        s.lastCreated = a.payload?.data ?? null;
      })
      .addCase(createPaymentOutflow.rejected, (s, a) => {
        s.createStatus = "failed";
        s.createError = a.payload || a.error?.message || "Hata";
      });
  },
});

export const { clearCreate } = paymentOutflowSlice.actions;
export default paymentOutflowSlice.reducer;
