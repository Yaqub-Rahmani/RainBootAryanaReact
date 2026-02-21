import { api } from "../../../shared/services/apiClient";

export const singleRatePolicyService = {
  getAll: () => api.get("/api/SingleRatePolicy"),

  get: (id) => api.get(`/api/SingleRatePolicy/${id}`),

  getByType: (type) =>
    api.get(`/api/SingleRatePolicy/by-type/${type}`),

  getCurrent: (type, asOfUtc) =>
    api.get(`/api/SingleRatePolicy/current/${type}`, {
      params: asOfUtc ? { asOfUtc } : undefined,
    }),

  add: (dto) => api.post("/api/SingleRatePolicy", dto),

  update: (id, dto) => api.put(`/api/SingleRatePolicy/${id}`, dto),

  remove: (id) => api.del(`/api/SingleRatePolicy/${id}`),
};
