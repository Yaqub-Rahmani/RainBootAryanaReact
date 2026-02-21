import { api } from "../../../shared/services/apiClient";

export const mediaAssetService = {
  // GET /api/MediaAssets?ownerId=&ownerType=
  getAll: (ownerId = null, ownerType = null) => {
    const qs = new URLSearchParams();
    if (ownerId) qs.set("ownerId", ownerId);
    if (ownerType != null) qs.set("ownerType", ownerType);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/MediaAssets${suffix}`);
  },

  // GET /api/MediaAssets/{id}
  get: (id) => api.get(`/api/MediaAssets/${id}`),

  // GET /api/MediaAssets/details?...
  // QueryOptions: { page, pageSize, sortBy, sortDir, search, filters... } (sunucuna göre)
  getDetails: (queryOptions = {}) => {
    const qs = new URLSearchParams();
    Object.entries(queryOptions || {}).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.append(k, v);
    });
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get(`/api/MediaAssets/details${suffix}`);
  },

  // GET /api/MediaAssets/{id}/detail
  getDetailById: (id) => api.get(`/api/MediaAssets/${id}/detail`),

  // POST /api/MediaAssets
  add: (dto) => api.post("/api/MediaAssets", dto),

  // PUT /api/MediaAssets/{id}
  update: (id, dto) => api.put(`/api/MediaAssets/${id}`, dto),

  // DELETE /api/MediaAssets/{id}
  remove: (id) => api.del(`/api/MediaAssets/${id}`),

  // POST /api/MediaAssets/{id}/set-primary
  setPrimary: (id) => api.post(`/api/MediaAssets/${id}/set-primary`),
};
