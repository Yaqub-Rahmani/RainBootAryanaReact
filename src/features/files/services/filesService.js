import { api } from "../../../shared/services/apiClient";

/**
 * POST /api/Files/upload  (multipart/form-data)
 * fields: FolderUrl, File
 */
export const filesService = {
  /**
   * @param {File} file
   * @param {string} folderUrl  örn: `/storage/franchise-owners/{ownerId}/contracts/{contractId}`
   * @returns Promise<{ saved:boolean, relativePath:string, fileName:string, mime:string, sizeBytes:number, error?:string }>
   */
  upload(file, folderUrl) {
    const fd = new FormData();
    fd.append("FolderUrl", folderUrl);
    fd.append("File", file);

    // axios ise Content-Type'ı FormData için otomatik set eder — manuel set etme.
    return api.post("/api/Files/upload", fd);
  },
};
