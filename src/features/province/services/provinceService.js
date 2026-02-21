import { api } from "../../../shared/services/apiClient";

export const provinceService = {
  getAll: () => api.get("/api/Provinces"),
  get:    (id) => api.get(`/api/Provinces/${id}`),
  add:    (dto) => api.post("/api/Provinces", dto),
  update: (id, dto) => api.put(`/api/Provinces/${id}`, dto),
  remove: (id) => api.del(`/api/Provinces/${id}`),
};