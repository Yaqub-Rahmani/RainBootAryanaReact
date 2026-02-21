import { api } from "../../../shared/services/apiClient";

// Family balance entries (server-side paged)
export const familyBalanceEntryService = {
  getDetails: (opt = {}, familyMemberId = null) => {
    const qs = new URLSearchParams();

    // QueryOptions binder C# tarafında genelde PascalCase bekliyor
    qs.set("Page", String(opt.page ?? 1));
    qs.set("PageSize", String(opt.pageSize ?? 10));
    qs.set("Sort", opt.sort ?? "");
    qs.set("Search", opt.search ?? "");
    (opt.filters ?? []).forEach((x) => qs.append("Filters", x));
    (opt.includes ?? []).forEach((x) => qs.append("Includes", x));

    if (familyMemberId) qs.set("familyMemberId", familyMemberId);

    return api.get(`/api/FamilyBalanceEntries/details?${qs.toString()}`);
  },

  getDetail: (id) => api.get(`/api/FamilyBalanceEntries/${id}/detail`),
  add: (dto) => api.post("/api/FamilyBalanceEntries", dto),
  update: (id, dto) => api.put(`/api/FamilyBalanceEntries/${id}`, dto),
  remove: (id) => api.del(`/api/FamilyBalanceEntries/${id}`),
};
