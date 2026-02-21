import { api } from "../../../shared/services/apiClient";

// Opsiyonel enum sabitleri (UI tarafında da kullanılabilir)
export const BiometricOwnerType = {
  User: 1,
  Tenant: 2,
  FranchiseOwner: 3,
  FamilyMember: 4,
  Employee: 5,
  ShspendNightop: 6, // TODO: enum adını temizleyebilirsin
};

export const BiometricType = {
  Fingerprint: 1,
};

export const biometricService = {
  // GET /api/Biometrics
  getAll: () => api.get("/api/Biometrics"),

  // GET /api/Biometrics/{id}
  get: (id) => api.get(`/api/Biometrics/${id}`),

  // GET /api/Biometrics/details?...
  getDetails: (queryOptions = {}) => {
    const qs = new URLSearchParams();
    Object.entries(queryOptions || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/Biometrics/details${suffix}`);
  },

  // GET /api/Biometrics/{id}/detail
  getDetailById: (id) => api.get(`/api/Biometrics/${id}/detail`),

  // POST /api/Biometrics
  add: (dto) => api.post("/api/Biometrics", dto),

  // PUT /api/Biometrics/{id}
  update: (id, dto) => api.put(`/api/Biometrics/${id}`, dto),

  // DELETE /api/Biometrics/{id}
  remove: (id) => api.del(`/api/Biometrics/${id}`),
};
