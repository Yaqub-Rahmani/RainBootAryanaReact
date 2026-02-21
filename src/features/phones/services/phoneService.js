import { api } from "../../../shared/services/apiClient";


// Sahip tipleri (diğer yerlerle tutarlı kalsın)
export const PhoneOwnerType = {
  User: 1,
  Tenant: 2,
  FranchiseOwner: 3,
  FamilyMember: 4,
  Employee: 5,
  ShspendNightop: 6, // TODO: isim temizlenebilir
};

export const phoneService = {
  // GET /api/Phones?ownerId=&ownerType=
  getAll: (ownerId = null, ownerType = null) => {
    const qs = new URLSearchParams();
    if (ownerId) qs.set("ownerId", ownerId);
    if (ownerType != null) qs.set("ownerType", ownerType);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/Phones${suffix}`);
  },

  // GET /api/Phones/{id}
  get: (id) => api.get(`/api/Phones/${id}`),

  // GET /api/Phones/details?{QueryOptions}&ownerId=&ownerType=
  getDetails: (queryOptions = {}, ownerId = null, ownerType = null) => {
    const qs = new URLSearchParams();
    Object.entries(queryOptions || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    if (ownerId) qs.append("ownerId", ownerId);
    if (ownerType != null) qs.append("ownerType", ownerType);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/Phones/details${suffix}`);
  },

  // GET /api/Phones/{id}/detail
  getDetailById: (id) => api.get(`/api/Phones/${id}/detail`),

  // POST /api/Phones
  add: (dto) => api.post("/api/Phones", dto),

  // PUT /api/Phones/{id}
  update: (id, dto) => api.put(`/api/Phones/${id}`, dto),

  // DELETE /api/Phones/{id}
  remove: (id) => api.del(`/api/Phones/${id}`),
};
