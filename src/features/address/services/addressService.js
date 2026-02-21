import { api } from "../../../shared/services/apiClient";

export const AddressOwnerType = {
  User: 1,
  Tenant: 2,
  FranchiseOwner: 3,
  FamilyMember: 4,
  Employee: 5,
  ShspendNightop: 6, // TODO: isim düzeltilebilir
};

export const addressService = {
  // GET /api/Addresses
  getAll: () => api.get("/api/Addresses"),

  // GET /api/Addresses/{id}
  get: (id) => api.get(`/api/Addresses/${id}`),

  // GET /api/Addresses/details?...
  getDetails: (queryOptions = {}) => {
    const qs = new URLSearchParams();
    Object.entries(queryOptions || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/Addresses/details${suffix}`);
  },

  // GET /api/Addresses/owner/{ownerType}/{ownerId}
  getByOwner: (ownerType, ownerId) =>
    api.get(`/api/Addresses/owner/${ownerType}/${ownerId}`),

  // POST /api/Addresses
  add: (dto) => api.post("/api/Addresses", dto),

  // PUT /api/Addresses/{id}
  update: (id, dto) => api.put(`/api/Addresses/${id}`, dto),

  // DELETE /api/Addresses/{id}
  remove: (id) => api.del(`/api/Addresses/${id}`),

  // POST /api/Addresses/{id}/set-primary
  setPrimary: (id) => api.post(`/api/Addresses/${id}/set-primary`),
};
