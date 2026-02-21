import { api } from "../../../shared/services/apiClient";

export const meterReadingService = {
  getAll: (params) => api.get("/api/MeterReadings", { params }),
  get:    (id) => api.get(`/api/MeterReadings/${id}`),
  detail: (id) => api.get(`/api/MeterReadings/${id}/detail`),
  add:    (dto) => api.post("/api/MeterReadings", dto),
  update: (id, dto) => api.put(`/api/MeterReadings/${id}`, dto),
  remove: (id) => api.del(`/api/MeterReadings/${id}`),
  finalize:   (id) => api.post(`/api/MeterReadings/${id}/finalize`),
  unfinalize: (id) => api.post(`/api/MeterReadings/${id}/unfinalize`),
  getNewContext: (contractId) => api.get(`/api/MeterReadings/new-context/${contractId}`),
};