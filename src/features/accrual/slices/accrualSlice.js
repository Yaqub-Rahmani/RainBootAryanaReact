import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { accrualService } from "../services/accrualService";

export const fetchAccruals = createAsyncThunk(
  "accrual/fetchAll",
  async (params) => {
    return await accrualService.getAll(params);
  }
);
export const fetchOpenDebtsByContract = createAsyncThunk(
  "accrual/fetchOpenDebtsByContract",
  async (contractId) => {
    return await accrualService.getOpenDebtsByContract(contractId);
  }
);
export const addAccrual = createAsyncThunk("accrual/add", async (dto) => {
  return await accrualService.add(dto);
});
export const updateAccrual = createAsyncThunk(
  "accrual/update",
  async ({ id, dto }) => {
    await accrualService.update(id, dto);
    return { id, dto };
  }
);
export const removeAccrual = createAsyncThunk("accrual/remove", async (id) => {
  await accrualService.remove(id);
  return id;
});
export const settleAccrual = createAsyncThunk(
  "accrual/settle",
  async ({ id, payload }) => {
    return await accrualService.settle(id, payload); // API başarı mesajı döndürüyor olabilir
  }
);
export const reopenAccrual = createAsyncThunk("accrual/reopen", async (id) => {
  await accrualService.reopen(id);
  return id;
});
export const recalcAccrual = createAsyncThunk("accrual/recalc", async (id) => {
  await accrualService.recalc(id);
  return id;
});

export const baseInitial = {
  list: [],
  current: null,
  status: "idle",
  error: null,

  openDebts: [],
  openDebtsStatus: "idle",
  openDebtsError: null,
};
const toArray = (p) => (Array.isArray(p) ? p : []);

const accrualSlice = createSlice({
  name: "accrual",
  initialState: { ...baseInitial },
  reducers: {
    setCurrentAccrual: (s, a) => {
      s.current = a.payload || null;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchAccruals.pending, (s) => {
      s.status = "loading";
    })
      .addCase(fetchAccruals.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = toArray(a.payload);
      })
      .addCase(fetchAccruals.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.error?.message || "Hata";
      })

      .addCase(addAccrual.fulfilled, (s, a) => {
        if (a.payload?.id) s.list.push(a.payload);
      })
      .addCase(updateAccrual.fulfilled, (s, a) => {
        const idx = s.list.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
      })
      .addCase(removeAccrual.fulfilled, (s, a) => {
        s.list = s.list.filter((x) => x.id !== a.payload);
      });
    // Not: settle/reopen/recalc sonrasında detay ekranını yenilemek isteyebilirsiniz.

        // 🔹 Yeni: openDebts lifecycle
    b.addCase(fetchOpenDebtsByContract.pending, (s) => {
      s.openDebtsStatus = "loading";
      s.openDebtsError = null;
    })
      .addCase(fetchOpenDebtsByContract.fulfilled, (s, a) => {
        s.openDebtsStatus = "succeeded";
        s.openDebts = toArray(a.payload);
      })
      .addCase(fetchOpenDebtsByContract.rejected, (s, a) => {
        s.openDebtsStatus = "failed";
        s.openDebtsError = a.error?.message || "Hata";
      });
  },
});

export const { setCurrentAccrual } = accrualSlice.actions;
export default accrualSlice.reducer; // ✅ Bunu ekle
