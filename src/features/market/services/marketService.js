import { api } from "../../../shared/services/apiClient";

export const marketService = {
  // Okumalar
  getAll:   ({ status = null } = {}) => api.get("/api/Markets", { params: { status } }),
  get:      (id) => api.get(`/api/Markets/${id}`),
  getDetails: (opt = {}, status = null) => {
    const params = { ...opt };
    if (status !== undefined && status !== null) params.status = status;
    return api.get("/api/Markets/details", { params });
  },
  getDetail: (id) => api.get(`/api/Markets/${id}/detail`),

  // Yazmalar
  add:      (dto) => api.post("/api/Markets", dto),
  update:   (id, dto) => api.put(`/api/Markets/${id}`, dto),
  remove:   (id) => api.del(`/api/Markets/${id}`),

  // Durum
  activate:   (id) => api.post(`/api/Markets/${id}/activate`),
  deactivate: (id) => api.post(`/api/Markets/${id}/deactivate`),
};
