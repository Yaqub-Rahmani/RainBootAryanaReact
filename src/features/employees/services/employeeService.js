import { api } from "../../../shared/services/apiClient";

const mapResponse = (res) => (res && typeof res === "object" && "data" in res ? res.data : res);

/** CustomTableV2 query obj -> querystring */
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

export const employeeService = {
  getDetails: async (tableQuery = {}, active) => {
    const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
    if (active !== undefined && active !== null) sp.set("active", String(active));
    const s = sp.toString();
    const res = await api.get(`/api/Employees/details${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },
  getProfile: async (id) => {
    const res = await api.get(`/api/Employees/${id}/profile`);
    return mapResponse(res);
  },
  getWorkInfo: async (id) => {
    const res = await api.get(`/api/Employees/${id}/work-info`);
    return mapResponse(res);
  },
  upsertWorkInfo: async (id, dto) => {
    const res = await api.put(`/api/Employees/${id}/work-info`, dto);
    return mapResponse(res);
  },
  getSalaryPayments: async (id, tableQuery = {}) => {
    const s = qsFromQueryObject(tableQuery);
    const res = await api.get(`/api/Employees/${id}/salary-payments/details${s}`);
    return mapResponse(res);
  },
  upsertFingerprint: async (id, dto) => {
    const res = await api.post(`/api/Employees/${id}/fingerprint`, dto);
    return mapResponse(res);
  },
  add: async (dto) => {
    const res = await api.post(`/api/Employees`, dto);
    return mapResponse(res);
  },
  update: async (id, dto) => {
    const res = await api.put(`/api/Employees/${id}`, dto);
    return mapResponse(res);
  },
  remove: async (id) => {
    const res = await api.del(`/api/Employees/${id}`);
    return mapResponse(res);
  },
  activate: async (id) => {
    const res = await api.post(`/api/Employees/${id}/activate`);
    return mapResponse(res);
  },
  deactivate: async (id) => {
    const res = await api.post(`/api/Employees/${id}/deactivate`);
    return mapResponse(res);
  },
};
