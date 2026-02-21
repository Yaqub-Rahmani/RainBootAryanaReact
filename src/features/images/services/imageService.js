import { api } from "../../../shared/services/apiClient";

export const imageService = {
  // body: { photoFolderUrl: string, baseFile: string (data URL) }
  saveIfDataUrl: (body) => api.post("/api/Images/save-if-dataurl", body),
};
