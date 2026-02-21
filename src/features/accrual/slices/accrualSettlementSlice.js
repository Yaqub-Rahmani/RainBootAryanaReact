import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

export const fetchAccrualSettlements = createAsyncThunk("accrualSettlement/fetchAll", async (params) => {
return await accrualSettlementService.getAll(params);
});
export const addAccrualSettlement = createAsyncThunk("accrualSettlement/add", async (dto) => {
return await accrualSettlementService.add(dto);
});
export const updateAccrualSettlement = createAsyncThunk("accrualSettlement/update", async ({ id, dto }) => {
await accrualSettlementService.update(id, dto);
return { id, dto };
});
export const removeAccrualSettlement = createAsyncThunk("accrualSettlement/remove", async (id) => {
await accrualSettlementService.remove(id);
return id;
});
export const baseInitial = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};
const toArray = (p) => (Array.isArray(p) ? p : []);

const accrualSettlementSlice = createSlice({
name: "accrualSettlement",
initialState: { ...baseInitial },
reducers: {
setCurrentAccrualSettlement: (s, a) => { s.current = a.payload || null; },
},
extraReducers: (b) => {
b.addCase(fetchAccrualSettlements.pending, (s) => { s.status = "loading"; })
.addCase(fetchAccrualSettlements.fulfilled, (s, a) => { s.status = "succeeded"; s.list = toArray(a.payload); })
.addCase(fetchAccrualSettlements.rejected, (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; })


.addCase(addAccrualSettlement.fulfilled, (s, a) => { if (a.payload?.id) s.list.push(a.payload); })
.addCase(updateAccrualSettlement.fulfilled, (s, a) => {
const idx = s.list.findIndex((x) => x.id === a.payload.id);
if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
})
.addCase(removeAccrualSettlement.fulfilled, (s, a) => {
s.list = s.list.filter((x) => x.id !== a.payload);
});
}
});
export const { setCurrentAccrualSettlement } = accrualSettlementSlice.actions;
export default accrualSettlementSlice.reducer;
