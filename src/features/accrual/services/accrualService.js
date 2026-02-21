import { api } from "../../../shared/services/apiClient";

export const accrualService = {
  getAll: (params) => api.get("/api/Accruals", { params }),
  getOpenDebtsByContract: (contractId) => api.get(`/api/Accruals/open-debts-by-contract/${contractId}`),
  get: (id) => api.get(`/api/Accruals/${id}`),
  detail: (id) => api.get(`/api/Accruals/${id}/detail`),
  add: (dto) => api.post("/api/Accruals", dto),
  update: (id, dto) => api.put(`/api/Accruals/${id}`, dto),
  remove: (id) => api.del(`/api/Accruals/${id}`),
  settle: (id, payload) => api.post(`/api/Accruals/${id}/settle`, payload),
  reopen: (id) => api.post(`/api/Accruals/${id}/reopen`),
  recalc: (id) => api.post(`/api/Accruals/${id}/recalc`),
  getAccrualSettlements: async (accrualId) => {
  const res = await api.get(`/api/Accruals/${accrualId}/settlements`);
  return mapResponse(res);
},
};
