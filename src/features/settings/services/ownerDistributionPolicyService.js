import { api } from "../../../shared/services/apiClient";

export const ownerDistributionPolicyService = {
  getAll: () => api.get("/api/OwnerDistributionPolicy"),
  get: (id) => api.get(`/api/OwnerDistributionPolicy/${id}`),

  // GET /api/OwnerDistributionPolicy/current?asOfUtc=...
  getCurrent: () =>
    api.get("/api/OwnerDistributionPolicy/current"),

  add: (dto) => api.post("/api/OwnerDistributionPolicy", dto),

  update: (id, dto) => api.put(`/api/OwnerDistributionPolicy/${id}`, dto),

  remove: (id) => api.del(`/api/OwnerDistributionPolicy/${id}`),
};
