import { api } from "../../../shared/services/apiClient";

const mapResponse = (res) =>
  res && typeof res === "object" && "data" in res ? res.data : res;

/** CustomTableV2 query obj -> querystring (projede employeeService ile aynı) */
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

export const adminUserService = {
  getDetails: async (tableQuery = {}, active) => {
    const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
    if (active !== undefined && active !== null) sp.set("active", String(active));
    const s = sp.toString();
    const res = await api.get(`/api/AdminUsers/details${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

  getAll: async (active) => {
    const sp = new URLSearchParams();
    if (active !== undefined && active !== null) sp.set("active", String(active));
    const s = sp.toString();
    const res = await api.get(`/api/AdminUsers${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },

  getById: async (id) => {
    const res = await api.get(`/api/AdminUsers/${id}`);
    return mapResponse(res);
  },

  add: async (dto) => {
    const res = await api.post(`/api/AdminUsers`, dto);
    return mapResponse(res);
  },

  update: async (id, dto) => {
    const res = await api.put(`/api/AdminUsers/${id}`, dto);
    return mapResponse(res);
  },

  remove: async (id) => {
    const res = await api.del(`/api/AdminUsers/${id}`);
    return mapResponse(res);
  },
};
