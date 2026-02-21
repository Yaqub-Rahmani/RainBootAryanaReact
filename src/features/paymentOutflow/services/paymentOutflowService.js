import { api } from "../../../shared/services/apiClient";

export const paymentOutflowService = {
  create: (dto) => api.post("/api/PaymentOutflows", dto),
};
