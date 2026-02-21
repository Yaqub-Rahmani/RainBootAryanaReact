import { api } from "../../../shared/services/apiClient";

// ----------------------------
// Contract Service
// ----------------------------
export const contractService = {
getAll: (params) => api.get("/api/Contracts", { params }),
get: (id) => api.get(`/api/Contracts/${id}`),
detail: (id) => api.get(`/api/Contracts/${id}/detail`),

listItems: async (opt = {}) => {
  const qs = new URLSearchParams();

  qs.set("Page", String(opt.page ?? 1));
  qs.set("PageSize", String(opt.pageSize ?? 25));

  if (opt.sort) qs.set("Sort", opt.sort);
  if (opt.search) qs.set("Search", opt.search);

  (opt.filters || []).forEach(f => qs.append("Filters", f));
  (opt.includes || []).forEach(i => qs.append("Includes", i));

  return api.get(`/api/Contracts/list-items?${qs.toString()}`);
},

add: (dto) => api.post("/api/Contracts", dto),
update: (id, dto) => api.put(`/api/Contracts/${id}`, dto),
remove: (id) => api.del(`/api/Contracts/${id}`),
archive: (id, reason) => api.post(`/api/Contracts/${id}/archive`, reason ?? null),
unarchive: (id) => api.post(`/api/Contracts/${id}/unarchive`),
};