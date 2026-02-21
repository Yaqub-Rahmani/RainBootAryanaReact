import { api } from "../../../shared/services/apiClient";

export const collectionService = {
addContractDebtPayment: (dto) => api.post("/api/Collection/contract-debt-payment", dto),
getAll: (params) => api.get("/api/Collection", { params }),
get: (id) => api.get(`/api/Collection/${id}`),
detail: (id) => api.get(`/api/Collection/${id}/detail`),
add: (dto) => api.post("/api/Collection", dto),
update: (id, dto) => api.put(`/api/Collection/${id}`, dto),
remove: (id) => api.del(`/api/Collection/${id}`),
};