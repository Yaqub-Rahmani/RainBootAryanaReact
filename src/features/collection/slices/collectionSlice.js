import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { collectionService } from "../services/collectionService";

export const fetchCollections = createAsyncThunk("collection/fetchAll", async (params) => {
return await collectionService.getAll(params);
});
export const addContractDebtPayment = createAsyncThunk(
  "collection/addContractDebtPayment",
  async (dto) => {
    return await collectionService.addContractDebtPayment(dto);
  }
);
export const addCollection = createAsyncThunk("collection/add", async (dto) => {
return await collectionService.add(dto);
});
export const updateCollection = createAsyncThunk("collection/update", async ({ id, dto }) => {
await collectionService.update(id, dto);
return { id, dto };
});
export const removeCollection = createAsyncThunk("collection/remove", async (id) => {
await collectionService.remove(id);
return id;
});
export const baseInitial = {
  list: [],
  current: null,
  status: 'idle',
  error: null,
};
const toArray = (p) => (Array.isArray(p) ? p : []);

const collectionSlice = createSlice({
name: "collection",
initialState: { ...baseInitial },
reducers: {
setCurrentCollection: (s, a) => { s.current = a.payload || null; },
},
extraReducers: (b) => {
b.addCase(fetchCollections.pending, (s) => { s.status = "loading"; })
.addCase(fetchCollections.fulfilled, (s, a) => { s.status = "succeeded"; s.list = toArray(a.payload); })
.addCase(fetchCollections.rejected, (s, a) => { s.status = "failed"; s.error = a.error?.message || "Hata"; })


.addCase(addCollection.fulfilled, (s, a) => { if (a.payload?.id) s.list.push(a.payload); })
.addCase(updateCollection.fulfilled, (s, a) => {
const idx = s.list.findIndex((x) => x.id === a.payload.id);
if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
})
.addCase(removeCollection.fulfilled, (s, a) => {
s.list = s.list.filter((x) => x.id !== a.payload);
});
}
});
export const { setCurrentCollection } = collectionSlice.actions;
export default collectionSlice.reducer;