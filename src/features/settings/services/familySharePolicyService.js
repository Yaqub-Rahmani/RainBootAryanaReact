import { api } from "../../../shared/services/apiClient";

export const familySharePolicyService = {
  getAll: () => api.get("/api/FamilySharePolicy"),
  get: (id) => api.get(`/api/FamilySharePolicy/${id}`),

  // GET /api/FamilySharePolicy/current?asOfUtc=...
  getCurrent: (asOfUtc) =>
    api.get("/api/FamilySharePolicy/current", {
      params: asOfUtc ? { asOfUtc } : undefined,
    }),

  add: (dto) => api.post("/api/FamilySharePolicy", dto),

  update: (id, dto) => api.put(`/api/FamilySharePolicy/${id}`, dto),

  remove: (id) => api.del(`/api/FamilySharePolicy/${id}`),
};

// dto formatını backend’teki FamilySharePolicyCreateDto / UpdateDto’ya göre dolduracaksın, örneğin:

// const dto = {
//   effectiveFromUtc: "2025-01-01T00:00:00Z",
//   motherSharePercent: 8,
//   childShareUnit: 1,
//   notes: "Yeni politika",
// };