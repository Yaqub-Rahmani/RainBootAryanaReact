import { api } from "../../../shared/services/apiClient";

export const familyMemberService = {
  getAll: (includeInactive) =>
    api.get("/api/FamilyMember" + (includeInactive ? `?includeInactive=true` : "")),

  getAllFamilyView: (active = null) => {
    const qs = active == null ? "" : `?active=${String(active)}`;
    return api.get(`/api/FamilyMember/views/all${qs}`);
  },

  getProfile: (id) => api.get(`/api/FamilyMember/${id}/profile`),

  get: (id) => api.get(`/api/FamilyMember/${id}`),

  add: (dto) => api.post("/api/FamilyMember", dto),

  update: (id, dto) => api.put(`/api/FamilyMember/${id}`, dto),

  remove: (id) => api.del(`/api/FamilyMember/${id}`),

  // ✅ NEW: fingerprint upsert
  upsertFingerprint: (id, dto) => api.post(`/api/FamilyMember/${id}/fingerprint`, dto),
  
};
