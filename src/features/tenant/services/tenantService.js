import { api } from "../../../shared/services/apiClient";

const qs = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (!entries.length) return "";
  const s = entries
    .map(([k, v]) =>
      Array.isArray(v)
        ? v.map((x) => `${encodeURIComponent(k)}=${encodeURIComponent(x)}`).join("&")
        : `${encodeURIComponent(k)}=${encodeURIComponent(v)}`
    )
    .join("&");
  return `?${s}`;
};

const mapResponse = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

/** ✅ CustomTableV2 (legacy/modern) query obj -> querystring */
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

export const tenantService = {
  // -------- mevcutlar --------
  getAll: async (onlyActive) => {
    const res = await api.get(`/api/Tenants${qs({ onlyActive })}`);
    return mapResponse(res);
  },
  get: async (id) => {
    const res = await api.get(`/api/Tenants/${id}`);
    return mapResponse(res);
  },
  getDetails: async (opt = {}, onlyActive) => {
    const merged = { ...opt, onlyActive };
    const res = await api.get(`/api/Tenants/details${qs(merged)}`);
    return mapResponse(res);
  },
  getDetail: async (id) => {
    const res = await api.get(`/api/Tenants/${id}/detail`);
    return mapResponse(res);
  },
  add: async (dto) => {
    const res = await api.post(`/api/Tenants`, dto);
    return mapResponse(res);
  },
  update: async (id, dto) => {
    const res = await api.put(`/api/Tenants/${id}`, dto);
    return mapResponse(res);
  },
  remove: async (id) => {
    const res = await api.del(`/api/Tenants/${id}`);
    return mapResponse(res);
  },
  activate: async (id) => {
    const res = await api.post(`/api/Tenants/${id}/activate`);
    return mapResponse(res);
  },
  deactivate: async (id) => {
    const res = await api.post(`/api/Tenants/${id}/deactivate`);
    return mapResponse(res);
  },
  getViewsAll: async (active) => {
    const res = await api.get(`/api/Tenants/views/all${qs({ active })}`);
    return mapResponse(res);
  },

  // ✅ -------- yeni API’ler --------
  getProfile: async (id) => {
    const res = await api.get(`/api/Tenants/${id}/profile`);
    return mapResponse(res);
  },

  /** GET /api/Tenants/{id}/contracts */
  getContracts: async (id) => {
    const res = await api.get(`/api/Tenants/${id}/contracts`);
    return mapResponse(res);
  },

  /** GET /api/Tenants/{id}/period-summaries (CustomTableV2 legacy query destekli) */
  getPeriodSummaries: async (id, tableQuery = {}) => {
    const res = await api.get(
      `/api/Tenants/${id}/period-summaries${qsFromQueryObject(tableQuery)}`
    );
    return mapResponse(res);
  },

  /** POST /api/Tenants/{id}/fingerprint */
  upsertFingerprint: async (id, dto) => {
    const res = await api.post(`/api/Tenants/${id}/fingerprint`, dto);
    return mapResponse(res);
  },

  // ✅ Ödemeler (Collections) - TenantProfile
  getPayments: async (tenantId) => {
    const res = await api.get(`/api/Collection/by-tenant/${tenantId}`);
    return mapResponse(res);
  },

  // ✅ Ödeme dağılımları (Allocations)
  getPaymentAllocations: async (collectionId) => {
    const res = await api.get(`/api/CollectionAllocation/by-collection/${collectionId}`);
    return mapResponse(res);
  },
};
