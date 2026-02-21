// store/slices/contractSlice.js
import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { contractService } from "../services/contractService";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const toArray = (p) => (Array.isArray(p) ? p : []);
const toPaged = (p) => ({
  items: Array.isArray(p?.items) ? p.items : [],
  page: Number(p?.page ?? 1),
  pageSize: Number(p?.pageSize ?? 25),
  totalCount: Number(p?.totalCount ?? 0),
  totalPages: Number(p?.totalPages ?? 1),
});


// ─────────────────────────────────────────────────────────────
// Thunks — CRUD (mevcut uçlar)
// ─────────────────────────────────────────────────────────────
export const fetchContracts = createAsyncThunk(
  "contract/fetchAll",
  async (params, thunkAPI) => {
    try {
      const data = await contractService.getAll(params);
      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

export const addContract = createAsyncThunk(
  "contract/add",
  async (dto, thunkAPI) => {
    try {
      const data = await contractService.add(dto);
      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

export const updateContract = createAsyncThunk(
  "contract/update",
  async ({ id, dto }, thunkAPI) => {
    try {
      await contractService.update(id, dto);
      return { id, dto };
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

export const removeContract = createAsyncThunk(
  "contract/remove",
  async (id, thunkAPI) => {
    try {
      await contractService.remove(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

export const archiveContract = createAsyncThunk(
  "contract/archive",
  async ({ id, reason }, thunkAPI) => {
    try {
      await contractService.archive(id, reason ?? null);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

export const unarchiveContract = createAsyncThunk(
  "contract/unarchive",
  async (id, thunkAPI) => {
    try {
      await contractService.unarchive(id);
      return id;
    } catch (err) {
      return thunkAPI.rejectWithValue(err?.response?.data || "Beklenmeyen hata");
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Thunk — GetListItems (PagedResult<ContractListItemDto>)
// ─────────────────────────────────────────────────────────────
// export const fetchContractListItems = createAsyncThunk(
//   "contract/fetchListItems",
//   async ({ queryOptions = {} } = {}, thunkAPI) => {
//     try {
//       // NEW: paged döner
//       const data = await contractService.listItems(queryOptions);
//       return { data, queryOptions };
//     } catch (err) {
//       return thunkAPI.rejectWithValue(
//         err?.response?.data || err?.message || "Beklenmeyen hata"
//       );
//     }
//   }
// );

export const fetchContractListItems = createAsyncThunk(
  "contract/fetchListItems",
  async ({ queryOptions = {} } = {}, thunkAPI) => {
    try {
      const res = await contractService.listItems(queryOptions);
      const data = res?.data ?? res; // ← KRİTİK
      return { data, queryOptions };
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data || err?.message || "Beklenmeyen hata"
      );
    }
  }
);


// ─────────────────────────────────────────────────────────────
// Thunk — Detail (ContractDetailDto)
// ─────────────────────────────────────────────────────────────
export const fetchContractDetail = createAsyncThunk(
  "contract/fetchDetail",
  async (id, thunkAPI) => {
    try {
      const data = await contractService.detail(id);
      return data;
    } catch (err) {
      return thunkAPI.rejectWithValue(
        err?.response?.data || err?.message || "Beklenmeyen hata"
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────
// Initial State
// ─────────────────────────────────────────────────────────────
export const baseInitial = {
  // /api/Contracts → Contract (temel)
  list: [],
  current: null,
  status: "idle",
  error: null,

  // /api/Contracts/list-items → PagedResult<ContractListItemDto>
  listItemsPaged: { items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 1 },
  listItemsStatus: "idle",
  listItemsError: null,
  lastListItemsQuery: null,

  // /api/Contracts/{id}/detail → ContractDetailDto
  detail: null,
  detailStatus: "idle",
  detailError: null,
};

// ─────────────────────────────────────────────────────────────
// Slice
// ─────────────────────────────────────────────────────────────
const contractSlice = createSlice({
  name: "contract",
  initialState: { ...baseInitial },
  reducers: {
    setCurrentContract: (s, a) => {
      s.current = a.payload || null;
    },
    clearContractError: (s) => {
      s.error = null;
    },
    clearListItemsError: (s) => {
      s.listItemsError = null;
    },
    clearListItems: (s) => {
      s.listItemsPaged = { items: [], page: 1, pageSize: 25, totalCount: 0, totalPages: 1 };
      s.listItemsStatus = "idle";
      s.listItemsError = null;
      s.lastListItemsQuery = null;
    },
    clearDetail: (s) => {
      s.detail = null;
      s.detailStatus = "idle";
      s.detailError = null;
    },
    clearAll: () => ({ ...baseInitial }),
  },
  extraReducers: (b) => {
    // ── fetchContracts
    b.addCase(fetchContracts.pending, (s) => {
      s.status = "loading";
      s.error = null;
    })
      .addCase(fetchContracts.fulfilled, (s, a) => {
        s.status = "succeeded";
        s.list = toArray(a.payload);
      })
      .addCase(fetchContracts.rejected, (s, a) => {
        s.status = "failed";
        s.error = a.payload || a.error?.message || "Hata";
      });

    // ── add / update / remove / archive / unarchive
    b.addCase(addContract.fulfilled, (s, a) => {
      if (a.payload?.id) s.list.push(a.payload);
    })
      .addCase(updateContract.fulfilled, (s, a) => {
        const idx = s.list.findIndex((x) => x.id === a.payload.id);
        if (idx >= 0) s.list[idx] = { ...s.list[idx], ...a.payload.dto };
      })
      .addCase(removeContract.fulfilled, (s, a) => {
        s.list = s.list.filter((x) => x.id !== a.payload);
      })
      .addCase(archiveContract.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload);
        if (i >= 0) s.list[i].status = 2; // Archived
      })
      .addCase(unarchiveContract.fulfilled, (s, a) => {
        const i = s.list.findIndex((x) => x.id === a.payload);
        if (i >= 0) s.list[i].status = 1; // Active
      });

    // ── fetchContractListItems (NEW: paged)
    b.addCase(fetchContractListItems.pending, (s) => {
      s.listItemsStatus = "loading";
      s.listItemsError = null;
    })
      .addCase(fetchContractListItems.fulfilled, (s, a) => {
        s.listItemsStatus = "succeeded";
        s.lastListItemsQuery = a.payload?.queryOptions ?? null;
        s.listItemsPaged = toPaged(a.payload?.data);
      })
      .addCase(fetchContractListItems.rejected, (s, a) => {
        s.listItemsStatus = "failed";
        s.listItemsError = a.payload || a.error?.message || "Hata";
      });

    // ── fetchContractDetail
    b.addCase(fetchContractDetail.pending, (s) => {
      s.detailStatus = "loading";
      s.detailError = null;
    })
      .addCase(fetchContractDetail.fulfilled, (s, a) => {
        s.detailStatus = "succeeded";
        s.detail = a.payload || null;
      })
      .addCase(fetchContractDetail.rejected, (s, a) => {
        s.detailStatus = "failed";
        s.detailError = a.payload || a.error?.message || "Hata";
      });
  },
});

// ─────────────────────────────────────────────────────────────
// Selectors
// ─────────────────────────────────────────────────────────────
export const selectContracts = (s) => ({
  data: s.contract.list,
  status: s.contract.status,
  error: s.contract.error,
});

export const selectContractListItems = (s) => ({
  page: s.contract.listItemsPaged,
  status: s.contract.listItemsStatus,
  error: s.contract.listItemsError,
  lastQuery: s.contract.lastListItemsQuery,
});

export const selectContractDetail = (s) => ({
  data: s.contract.detail,
  status: s.contract.detailStatus,
  error: s.contract.detailError,
});

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────
export const {
  setCurrentContract,
  clearContractError,
  clearListItemsError,
  clearListItems,
  clearDetail,
  clearAll,
} = contractSlice.actions;

export default contractSlice.reducer;
