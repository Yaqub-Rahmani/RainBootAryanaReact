export const OwnerType = {
  User: 1,
  Tenant: 2,
  FranchiseOwner: 3,
  FamilyMember: 4,
  Employee: 5,
  Contract: 6,
  Worker: 7,
  Payment: 8,
}; // :contentReference[oaicite:4]{index=4}

export const MediaKind = {
  Avatar: 1,
  IdFront: 2,
  IdBack: 3,
  FingerBitmap: 4,
  FranchiseContract: 5,
  TenantContract: 6,
  Other: 99,
}; // :contentReference[oaicite:5]{index=5}

export const BalanceDirection = { In: 1, Out: 2 }; // :contentReference[oaicite:6]{index=6}

export const PaymentMethod = {
  Unknown: 0,
  Cash: 1,
  BankTransfer: 2,
  Pos: 3,
  Cheque: 4,
  Other: 9,
}; // :contentReference[oaicite:7]{index=7}

export const Currency = { Afn: 1, Usd: 2 }; // :contentReference[oaicite:8]{index=8}

export const isDataUrl = (v) => typeof v === "string" && v.startsWith("data:image/"); // :contentReference[oaicite:9]{index=9}
export const s = (v) => (v == null ? "" : String(v)); // :contentReference[oaicite:10]{index=10}
export const nowIso = () => new Date().toISOString(); // :contentReference[oaicite:11]{index=11}

// export const guid = () =>
//   globalThis.crypto?.randomUUID?.() ??
//   "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
//     const r = (Math.random() * 16) | 0;
//     const v = c === "x" ? r : (r & 0x3) | 0x8;
//     return v.toString(16);
//   }); // :contentReference[oaicite:12]{index=12}

export const toPaymentMethod = (v) => {
  if (typeof v === "number") return v;
  const x = String(v || "").toLowerCase().trim();
  if (x === "cash") return PaymentMethod.Cash;
  if (x === "banktransfer" || x === "bank_transfer" || x === "transfer") return PaymentMethod.BankTransfer;
  if (x === "pos") return PaymentMethod.Pos;
  if (x === "cheque" || x === "check") return PaymentMethod.Cheque;
  return x ? PaymentMethod.Other : PaymentMethod.Unknown;
};

export const toAmount = (v) => {
  if (v == null || String(v).trim() === "") return null;
  const num = Number(String(v).replace(/[, ]/g, ""));
  return Number.isFinite(num) ? num : null;
};
