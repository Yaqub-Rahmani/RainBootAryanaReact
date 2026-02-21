import { api } from "../../../shared/services/apiClient";


export const districtService = {
  getDetails: (opt = {}, provinceId = null) => {
    const params = { ...opt };
    // provinceId yalnızca gerçekten sayı ise gönder
    if (provinceId !== null && provinceId !== undefined && provinceId !== "") {
      params.provinceId = provinceId;
    }
    return api.get("/api/Districts/details", { params });
  },

  getAll: () => api.get("/api/Districts"),
  get:    (id) => api.get(`/api/Districts/${id}`),
  add:    (dto) => api.post("/api/Districts", dto),
  update: (id, dto) => api.put(`/api/Districts/${id}`, dto),
  remove: (id) => api.del(`/api/Districts/${id}`),

  // getAll: (provinceId) => apiClient.get(`/districts/details?provinceId=${provinceId ?? ""}`),
  // add: (data) => apiClient.post("/districts", data),
  // update: (id, data) => apiClient.put(`/districts/${id}`, data),
  // remove: (id) => apiClient.delete(`/districts/${id}`),
};