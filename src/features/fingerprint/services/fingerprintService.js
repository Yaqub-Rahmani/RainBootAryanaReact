// services/fingerprintService.js
import { api } from "../../../shared/services/apiClient";

const pickBody = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

export const fingerprintService = {
  status: () => api.get("/api/Fingerprint/status").then(pickBody),

  // Tek tarama (opsiyonel PNG için IncludeImage:true)
  scan: (payload = { TimeoutMs: 12000, IncludeImage: true }) =>
    api.post("/api/Fingerprint/scan", payload).then(pickBody),

  // 1:1 doğrulama
  verify: (payload /* { EnrolledTemplateBase64, TimeoutMs?, IncludeImage? } */) =>
    api.post("/api/Fingerprint/verify", payload).then(pickBody),

  // 1:N kimlik tespiti
  identify: (payload = { TimeoutMs: 8000, IncludeImage: false }) =>
    api.post("/api/Fingerprint/identify", payload).then(pickBody),

  // (opsiyonel) Sunucuda 3 örnek toplayarak kayıt (sunucu kendi okur)
  enroll: (payload /* { UserId, RequiredSamples, TimeoutMs, IncludeImage } */) =>
    api.post("/api/Fingerprint/enroll", payload).then(pickBody),

  // (opsiyonel) RAM/SDK DB’ye ekleme — merge edilmiş template gerekir
  dbAdd: (payload /* { userId, templateBase64 } */) =>
    api.post("/api/Fingerprint/db/add", payload).then(pickBody),

  // (opsiyonel) RAM/SDK DB temizleme
  dbClear: () => api.post("/api/Fingerprint/db/clear").then(pickBody),

  matchTemplates: ({ TemplateA, TemplateB }) =>
  api.post("/api/Fingerprint/templates/compare", { TemplateA, TemplateB }).then(pickBody),

  mergeTemplates: ({ TemplatesBase64 }) =>
    api.post("/api/Fingerprint/templates/merge", { TemplatesBase64 }).then(pickBody),

};

// import { api } from "../../../shared/services/apiClient";

// // axios/fetch normalize: her zaman JSON body döndür
// const pickBody = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

// export const fingerprintService = {
//   // ---- Device/SDK ----
//   status: () => api.get("/api/Fingerprint/status").then(pickBody),
//   dbAdd: (payload /* { userId, templateBase64 } */) =>
//     api.post("/api/Fingerprint/db/add", payload).then(pickBody),
//   dbClear: () => api.post("/api/Fingerprint/db/clear").then(pickBody),

//   // ---- Capture/Match ----
//   // body: { TimeoutMs?, IncludeImage? }
//   scan: (payload = {}) =>
//     api.post("/api/Fingerprint/scan", payload).then(pickBody),

//   // body: { UserId, RequiredSamples?, TimeoutMs?, IncludeImage? }
//   enroll: (payload) =>
//     api.post("/api/Fingerprint/enroll", payload).then(pickBody),

//   // body: { EnrolledTemplateBase64, TimeoutMs?, IncludeImage? }
//   verify: (payload) =>
//     api.post("/api/Fingerprint/verify", payload).then(pickBody),

//   // body: { TimeoutMs?, IncludeImage? }
//   identify: (payload = {}) =>
//     api.post("/api/Fingerprint/identify", payload).then(pickBody),
// };


// import { api } from "../../../shared/services/apiClient";

// // axios/fetch farkına karşı normalize: her zaman JSON body döndür
// const pickBody = (r) => (r && typeof r === "object" && "data" in r ? r.data : r);

// export const fingerprintService = {
//   status: () => api.get("/api/Fingerprint/status").then(pickBody),
//   scan:   () => api.post("/api/Fingerprint/scan").then(pickBody),
// };