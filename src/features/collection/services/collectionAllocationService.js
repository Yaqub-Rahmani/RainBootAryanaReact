import { api } from "../../../shared/services/apiClient";

export const collectionAllocationService = {
getAll: (params) => api.get("/api/CollectionAllocations", { params }),
get: (id) => api.get(`/api/CollectionAllocations/${id}`),
detail: (id) => api.get(`/api/CollectionAllocations/${id}/detail`),
add: (dto) => api.post("/api/CollectionAllocations", dto),
update: (id, dto) => api.put(`/api/CollectionAllocations/${id}`, dto),
remove: (id) => api.del(`/api/CollectionAllocations/${id}`),
};