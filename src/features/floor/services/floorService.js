// src/features/floors/services/floorService.js
import { api } from "../../../shared/services/apiClient";

export const floorService = {
  getAll:   () => api.get("/api/Floors"),
  get:      (id) => api.get(`/api/Floors/${id}`),
  getDetails: () => api.get("/api/Floors/details"), // varsa
  add:      (dto) => api.post("/api/Floors", dto),
  update:   (id, dto) => api.put(`/api/Floors/${id}`, dto),
  remove:   (id) => api.del(`/api/Floors/${id}`),
  activate:   (id) => api.post(`/api/Floors/${id}/activate`),
  deactivate: (id) => api.post(`/api/Floors/${id}/deactivate`),
};
