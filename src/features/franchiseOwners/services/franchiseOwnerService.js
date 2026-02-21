import { api } from "../../../shared/services/apiClient";

/* ---------------- QueryOptions helpers ---------------- */
const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

export const toQs = (obj = {}) =>
  Object.entries(obj)
    .filter(([, v]) => !isEmpty(v))
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        return v.map((x) => `${encodeURIComponent(k)}=${encodeURIComponent(x)}`).join("&");
      }
      const val =
        typeof v === "boolean" ? String(v) :
        typeof v === "number"  ? String(v) : v;
      return `${encodeURIComponent(k)}=${encodeURIComponent(val)}`;
    })
    .join("&");

export const buildQueryOptions = (opt = {}) => {
  const { page, pageSize, search, sort, filters } = opt || {};
  const base = {};
  if (!isEmpty(page))     base.page = page;
  if (!isEmpty(pageSize)) base.pageSize = pageSize;
  if (!isEmpty(search))   base.search = search;
  if (!isEmpty(sort))     base.sort = sort;

  if (filters && typeof filters === "object" && !Array.isArray(filters)) {
    Object.entries(filters).forEach(([k, v]) => (base[`filters.${k}`] = v));
  }
  if (Array.isArray(filters)) {
    filters.forEach((f, i) => {
      if (!f) return;
      if (f.field) base[`filters[${i}].field`] = f.field;
      if (f.op)    base[`filters[${i}].op`]    = f.op;
      if (f.value !== undefined) base[`filters[${i}].value`] = f.value;
    });
  }

  const qs = toQs(base);
  return qs ? `?${qs}` : "";
};

/* ---------------- HTTP helpers ---------------- */
const httpDelete = (url) => (api.del ? api.del(url) : api.delete(url));

/* ---------------- Service ---------------- */
export const franchiseOwnerService = {
  getAll: (active = null) => {
    const qs = active == null ? "" : `?active=${String(active)}`;
    return api.get(`/api/FranchiseOwners${qs}`);
  },

  get: (id) => api.get(`/api/FranchiseOwners/${id}`),

  getDetails: (active = null) => {
    const qs = active == null ? "" : `?active=${String(active)}`;
    return api.get(`/api/FranchiseOwners/details${qs}`);
  },

  // Owner View (full)
  getAllOwnerView: (active = null) => {
    const qs = active == null ? "" : `?active=${String(active)}`;
    return api.get(`/api/FranchiseOwners/views/all${qs}`);
  },

  // Owner View (paged + query options)
  getOwnerViews: (opt = {}, active = null) => {
    const qsOpt = buildQueryOptions(opt);
    const glue = qsOpt ? "&" : "?";
    const qsActive = active == null ? "" : `${glue}active=${String(active)}`;
    return api.get(`/api/FranchiseOwners/views${qsOpt}${qsActive}`);
  },

    getBalanceEntries: (ownerId, q = {}) => {
      const qs = toQs(q);
      return api.get(`/api/FranchiseOwners/${ownerId}/balance-entries${qs ? `?${qs}` : ""}`);
    },
    
  // Owner Profile
  getProfile: (ownerId) => api.get(`/api/FranchiseOwners/${ownerId}/profile`),
  

  add:    (dto)      => api.post(`/api/FranchiseOwners`, dto),
  update: (id, dto)  => api.put(`/api/FranchiseOwners/${id}`, dto),
  remove: (id)       => httpDelete(`/api/FranchiseOwners/${id}`),
  activate:   (id)   => api.post(`/api/FranchiseOwners/${id}/activate`),
  deactivate: (id)   => api.post(`/api/FranchiseOwners/${id}/deactivate`),
  // Fingerprint (template upsert)
upsertFingerprint: (ownerId, dto) =>  api.post(`/api/FranchiseOwners/${ownerId}/fingerprint`, dto),

};

export const downloadFranchiseOwnerBalanceEntriesPdf = async (ownerId, params) => {
  const res = await api.get(`/api/FranchiseOwners/${ownerId}/balance-entries/report`, {
    params,
    responseType: "blob",
  });
  return res?.data ?? res;
};

export default franchiseOwnerService;
