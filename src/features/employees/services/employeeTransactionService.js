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

export const employeeTransactionService = {
  getByEmployee: async (employeeId, tableQuery = {}, year = null, month = null) => {
    const sp = new URLSearchParams(qsFromQueryObject(tableQuery).replace(/^\?/, ""));
    if (year != null && year !== "") sp.set("year", String(year));
    if (month != null && month !== "") sp.set("month", String(month));
    const s = sp.toString();
    const res = await api.get(`/api/EmployeeTransaction/by-employee/${employeeId}${s ? `?${s}` : ""}`);
    return mapResponse(res);
  },
  add: async (dto) => {
    const res = await api.post(`/api/EmployeeTransaction`, dto);
    return mapResponse(res);
  },
  remove: async (id) => {
    const res = await api.del(`/api/EmployeeTransaction/${id}`);
    return mapResponse(res);
  },
};
