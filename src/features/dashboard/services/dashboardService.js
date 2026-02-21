import { api } from "../../../shared/services/apiClient";

const mapResponse = (res) =>
  res && typeof res === "object" && "data" in res ? res.data : res;

/** CustomTableV2 (legacy) query obj -> querystring */
const qsFromQueryObject = (q = {}) => {
  const sp = new URLSearchParams();
  Object.entries(q || {}).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
    else sp.append(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
};

export const dashboardService = {
  // Summary
  getFinance: async ({ fromUtc, toUtc, take } = {}) => {
    const sp = new URLSearchParams();
    if (fromUtc) sp.set("fromUtc", fromUtc);
    if (toUtc) sp.set("toUtc", toUtc);
    if (take != null) sp.set("take", String(take));
    const s = sp.toString();
    const res = await api.get(`/api/Dashboard/finance${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

  // Charts
  getCharts: async ({ fromUtc, toUtc, months = 3 } = {}) => {
    const sp = new URLSearchParams();
    if (fromUtc) sp.set("fromUtc", fromUtc);
    if (toUtc) sp.set("toUtc", toUtc);
    if (months != null) sp.set("months", String(months));
    const s = sp.toString();
    const res = await api.get(`/api/Dashboard/charts${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

  // Dollar rate
  getLatestDollarRate: async () => {
    const res = await api.get("/api/DollarRate/latest");
    return mapResponse(res);
  },
  addDollarRate: async ({ afnPerUsd, effectiveFromUtc } = {}) => {
    const dto = { afnPerUsd, effectiveFromUtc };
    const res = await api.post("/api/DollarRate", dto);
    return mapResponse(res);
  },

  // Server-side tables
  getMoneyAccountsDetails: async (tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Dashboard/money-accounts/details${s}`);
    return mapResponse(res);
  },

  getReserveAccountsDetails: async (tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Dashboard/reserve-accounts/details${s}`);
    return mapResponse(res);
  },

  getFamilyPoolDetails: async (tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Dashboard/family-pool/details${s}`);
    return mapResponse(res);
  },

  getFranchisePoolDetails: async (tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Dashboard/franchise-pool/details${s}`);
    return mapResponse(res);
  },

  getCollectionsDetails: async (tableQuery = {}, isApproved) => {
    const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
    if (isApproved !== undefined && isApproved !== null)
      sp.set("isApproved", String(isApproved));
    const s = sp.toString();
    const res = await api.get(`/api/Dashboard/collections/details${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

  getPeriodDebtsDetails: async (tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Dashboard/period-debts/details${s}`);
    return mapResponse(res);
  },

  // Approve (existing endpoint)
  approveCollection: async (id) => {
    const res = await api.post("/api/Collection/approve", { id });
    return mapResponse(res);
  },

  // getEntriesDetails: async ({ source, sourceId, fromUtc, toUtc, ...tableQuery } = {}) => {
  //   const s = qsFromQueryObject({ ...tableQuery, source, sourceId, fromUtc, toUtc });
  //   const res = await api.get(`/api/Dashboard/entries/details${s}`);
  //   return mapResponse(res);
  // },

  // Reserve / pool entries (Details modal)
  getEntriesDetails: async ({ source, sourceId, fromUtc, toUtc, ...tableQuery } = {}) => {
    const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
    if (source) sp.set("source", String(source));
    if (sourceId) sp.set("sourceId", String(sourceId));
    if (fromUtc) sp.set("fromUtc", String(fromUtc));
    if (toUtc) sp.set("toUtc", String(toUtc));
    const s = sp.toString();
    const res = await api.get(`/api/Dashboard/entries/details${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

//   getEntriesDetails: async ({ source, sourceId, fromUtc, toUtc, periodYear, periodMonth, ...tableQuery } = {}) => {
//   const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
//   if (source) sp.set("source", String(source));
//   if (sourceId) sp.set("sourceId", String(sourceId));
//   if (fromUtc) sp.set("fromUtc", String(fromUtc));
//   if (toUtc) sp.set("toUtc", String(toUtc));
//   if (periodYear) sp.set("periodYear", String(periodYear));
//   if (periodMonth) sp.set("periodMonth", String(periodMonth));

//   const s = sp.toString();
//   const res = await api.get(`/api/Dashboard/entries/details${s ? `?${s}` : ""}`);
//   return mapResponse(res);
// },


};
