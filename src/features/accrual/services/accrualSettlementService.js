import { api } from "../../../shared/services/apiClient";

export const accrualSettlementService = {
getAll: (params) => api.get("/api/AccrualSettlements", { params }),
get: (id) => api.get(`/api/AccrualSettlements/${id}`),
detail: (id) => api.get(`/api/AccrualSettlements/${id}/detail`),
add: (dto) => api.post("/api/AccrualSettlements", dto),
update: (id, dto) => api.put(`/api/AccrualSettlements/${id}`, dto),
remove: (id) => api.del(`/api/AccrualSettlements/${id}`),
};