export const OwnerType = {
  User: 1,
  Tenant: 2,
  FranchiseOwner: 3,
  FamilyMember: 4,
  Employee: 5,
  Contract: 6,
  Worker: 7,
  Payment: 8
};

export const GenderEnum = {
  Unknown: 0,
  Male: 1,
  Female: 2,
};

export const MediaKind = {
  Avatar: 1,
  IdFront: 2,
  IdBack: 3,
  FingerBitmap: 4,
  FranchiseContract: 5,
  TenantContract: 6,
  Other: 99,
};

export const isDataUrl = (v) =>
  typeof v === "string" && v.startsWith("data:image/");

export const isPlaceholderAsset = (v) =>
  typeof v === "string" && v.startsWith("/src/assets/");

export const s = (v) => (v == null ? "" : String(v));

export const toGenderEnum = (g) => {
  if (typeof g === "number")
    return [0, 1, 2].includes(g) ? g : GenderEnum.Unknown;
  const x = String(g || "")
    .toLowerCase()
    .trim();
  if (x === "male") return GenderEnum.Male;
  if (x === "female") return GenderEnum.Female;
  return GenderEnum.Unknown;
};

export const guid = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export const nowIso = () => new Date().toISOString();
