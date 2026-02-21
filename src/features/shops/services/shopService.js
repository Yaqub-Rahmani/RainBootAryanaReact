import { api } from "../../../shared/services/apiClient";

// Small helpers
const unwrap = (res) =>
  res && typeof res === "object" && "data" in res ? res.data : res;
const isBool = (v) => typeof v === "boolean";

// /list-view için QueryOptions query string
export const buildQueryOptions = (q = {}) => {
  const params = new URLSearchParams();
  if (isBool(q.onlyActive)) params.set("onlyActive", String(q.onlyActive));
  if (q.marketId) params.set("marketId", String(q.marketId));
  if (q.floorId) params.set("floorId", String(q.floorId));
  if (q.page) params.set("page", String(q.page));
  if (q.pageSize) params.set("pageSize", String(q.pageSize));
  if (q.search) params.set("search", String(String(q.search).trim()));
  if (q.sort) params.set("sort", String(q.sort));
  const s = params.toString();
  return s ? `?${s}` : "";
};

export const shopService = {
  // GET /api/Shops/{id}
  async get(id) {
    const res = await api.get(`/api/Shops/${id}`);
    return unwrap(res);
  },

  // ✅ GET /api/Shops/list-view[?query]
  // GetShopListView ile uyumlu, fetchShops thunk’ı bunu kullanıyor
  async getAll(query = {}) {
    const qs = buildQueryOptions(query);
    const res = await api.get(`/api/Shops/list-view${qs}`);
    const data = unwrap(res);

    // Güvenli normalizasyon: dizi / {data:[]} / {items:[]}
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.items)) return data.items;
    if (data && Array.isArray(data.data)) return data.data;
    return [];
  },

  async getAvailableForContracts() {
    const res = await api.get(`/api/Shops/available-for-contracts`);
    return unwrap(res); // ShopPickerDto[]
  },

  // GET /api/Shops/with-shares?ownerId=...
  async getWithShares(ownerId) {
    const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : "";
    const res = await api.get(`/api/Shops/with-shares${query}`);
    return unwrap(res); // ShopShareSummaryDto[]
  },

  // ✅ GET /api/Shops/franchise-owners/{ownerId}/shops
  async getFranchiseOwnerShops(ownerId) {
    const res = await api.get(
      `/api/Shops/franchise-owners/${encodeURIComponent(ownerId)}/shops`
    );
    return unwrap(res); // FranchiseOwnerShopsDto[]
  },

  // POST /api/Shops
  async add(dto) {
    const res = await api.post("/api/Shops", dto);
    return unwrap(res);
  },

  // PUT /api/Shops/{id}
  async update(id, dto) {
    const res = await api.put(`/api/Shops/${id}`, dto);
    return unwrap(res);
  },

  // DELETE /api/Shops/{id}
  async remove(id) {
    const res = await api.del(`/api/Shops/${id}`);
    return unwrap(res);
  },

  // ShopAssignScreen (paged) - legacy QueryOptions transport (CustomTableV2)
// GET /api/Shops/assign-screen/mine?ownerId=...&Page=..&PageSize=..&Sort=..&Search=..&Filters=..
// GET /api/Shops/assign-screen/available?ownerId=...&...
async listAssignMine(ownerId, opt = {}) {
  const qs = new URLSearchParams();

  qs.set("ownerId", String(ownerId));
  qs.set("Page", String(opt.page ?? 1));
  qs.set("PageSize", String(opt.pageSize ?? 25));
  if (opt.sort) qs.set("Sort", String(opt.sort));
  if (opt.search) qs.set("Search", String(opt.search));
  (opt.filters || []).forEach((f) => qs.append("Filters", f));
  (opt.includes || []).forEach((i) => qs.append("Includes", i));

  const res = await api.get(`/api/Shops/assign-screen/mine?${qs.toString()}`);
  return unwrap(res); // {items,totalCount,totalPages}
},

async listAssignAvailable(ownerId, opt = {}) {
  const qs = new URLSearchParams();

  qs.set("ownerId", String(ownerId));
  qs.set("Page", String(opt.page ?? 1));
  qs.set("PageSize", String(opt.pageSize ?? 25));
  if (opt.sort) qs.set("Sort", String(opt.sort));
  if (opt.search) qs.set("Search", String(opt.search));
  (opt.filters || []).forEach((f) => qs.append("Filters", f));
  (opt.includes || []).forEach((i) => qs.append("Includes", i));

  const res = await api.get(`/api/Shops/assign-screen/available?${qs.toString()}`);
  return unwrap(res);
},


};
