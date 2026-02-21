import { api } from "../../../shared/services/apiClient";

export const shopFranchiseShareService = {
  // ---- READ ----
  getAll(params = {}) {
    // params: { shopId?, franchiseOwnerId? }
    return api.get("/api/ShopFranchiseShares", { params });
  },

  getById(id) {
    return api.get(`/api/ShopFranchiseShares/${id}`);
  },

  getDetails(params = {}) {
    // params: { on?, shopId?, franchiseOwnerId?, ...QueryOptions }
    return api.get("/api/ShopFranchiseShares/details", { params });
  },

  getDetailById(id) {
    return api.get(`/api/ShopFranchiseShares/${id}/detail`);
  },

  getActiveOn(shopId, on /* YYYY-MM-DD */) {
    return api.get(`/api/ShopFranchiseShares/active/${shopId}`, { params: { on } });
  },

  getSummary(shopId, on /* YYYY-MM-DD */) {
    return api.get(`/api/ShopFranchiseShares/summary/${shopId}`, { params: { on } });
  },

  // ---- WRITE ----
  add(dto) {
    // dto: { id, shopId, franchiseOwnerId, sharePercent, effectiveFrom, effectiveTo, notes }
    return api.post("/api/ShopFranchiseShares", dto);
  },

  update(id, dto) {
    return api.put(`/api/ShopFranchiseShares/${id}`, dto);
  },

  remove(id) {
    return api.delete(`/api/ShopFranchiseShares/${id}`);
  },
};
