import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collectionAllocationService } from "../services/collectionAllocationService";

export const fetchAllocations = createAsyncThunk("allocation/fetchAll", async (params) => {
return await collectionAllocationService.getAll(params);
});
export const addAllocation = createAsyncThunk("allocation/add", async (dto) => {
return await collectionAllocationService.add(dto);
});
export const updateAllocation = createAsyncThunk("allocation/update", async ({ id, dto }) => {
await collectionAllocationService.update(id, dto);
return { id, dto };
});
export const removeAllocation = createAsyncThunk("allocation/remove", async (id) => {
await collectionAllocationService.remove(id);
return id;
});
export const baseInitial = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};
const toArray = (p) => (Array.isArray(p) ? p : []);

const allocationSlice = createSlice({
name: "allocation",
initialState: { ...baseInitial },
reducers: {
setCurrentAllocation: (s, a) => { s.current = a.payload || null; },
},
extraReducers: (b) => {
b.addCase(fetchAllocations.pending, (s) => { s.status = "loading"; })
.addCase(fetchAllocations.fulfilled, (s, a) => { s.status = "succeeded"; s.list = toArray(a.payload); })
.addCase(fetchAllocations.rejected, (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; })


.addCase(addAllocation.fulfilled, (s, a) => { if (a.payload?.id) s.list.push(a.payload); })
.addCase(updateAllocation.fulfilled, (s, a) => {
const idx = s.list.findIndex((x) => x.id === a.payload.id);
if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
})
.addCase(removeAllocation.fulfilled, (s, a) => {
s.list = s.list.filter((x) => x.id !== a.payload);
});
}
});
export const { setCurrentAllocation } = allocationSlice.actions;
export default allocationSlice.reducer;