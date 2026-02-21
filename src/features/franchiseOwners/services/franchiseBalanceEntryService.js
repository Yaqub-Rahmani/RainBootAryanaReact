import { api } from "../../../shared/services/apiClient";

export const franchiseBalanceEntryService = {
  getDetails: (opt = {}, ownerId = null) => {
    const qs = new URLSearchParams();

    qs.set("Page", String(opt.page ?? 1));
    qs.set("PageSize", String(opt.pageSize ?? 10));
    qs.set("Sort", opt.sort ?? "");
    qs.set("Search", opt.search ?? "");
    (opt.filters ?? []).forEach((x) => qs.append("Filters", x));
    (opt.includes ?? []).forEach((x) => qs.append("Includes", x));
    if (ownerId) qs.set("ownerId", ownerId);
    return api.get(`/api/FranchiseBalanceEntries/details?${qs.toString()}`);
  },
};

