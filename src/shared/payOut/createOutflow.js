import { guid } from "../person/onboardConstants";
import { OUTFLOW_CONFIG } from "./outflowRegistry";
import { savePaymentFingerprintIfAny } from "./outflowFiles";

/**
 * paymentId: aggregate/correlation id (payload.entryId)
 * moneyEntryId: finansal kayıt
 * domainEntryId: senaryoya özel kayıt (FranchiseBalanceEntry / TaxPaymentEntry / Expense / ...)
 */
export async function createOutflow(outflowType, payload, ctx) {
  const cfg = OUTFLOW_CONFIG[outflowType];
  if (!cfg) throw new Error("Desteklenmeyen outflowType.");

  const paymentId = payload?.entryId || guid();
  const ids = {
    paymentId,
    moneyEntryId: guid(),
    domainEntryId: guid(),
  };

  cfg.required?.(payload, ctx);

  // Fingerprint policy
  const hasAnyFinger = !!payload?.fingerprintBitmapPngBase64 || !!payload?.fingerprintTemplateBase64;

  if (cfg.fingerprintPolicy === "required" && !hasAnyFinger) {
    throw new Error("Bu ödeme türünde parmak izi zorunlu.");
  }

  // 1) Fingerprint varsa: MediaAsset + Biometric kaydet
  // Kayıt “mutlaka” yapılmalı dediğin için:
  // - bitmap gönderildiyse upload başarısızsa operasyon kırılır
  // - bitmap gönderildiyse template yoksa operasyon kırılır (outflowFiles’da bu karar var)
  const finger = await savePaymentFingerprintIfAny({
    paymentId: ids.paymentId,
    fingerprintBitmapPngBase64: payload?.fingerprintBitmapPngBase64 || null,
    fingerprintTemplateBase64: payload?.fingerprintTemplateBase64 || null,
  });

  // 2) MoneyEntry (her para çıkışı gerçek ödeme)
  const moneyEntryDto = cfg.moneyEntryDto(payload, ctx, ids);
  await cfg.addMoneyEntry(moneyEntryDto);

  // 3) Domain entry (FranchiseBalanceEntry / Expense / TaxPaymentEntry / ...)
  const entryDto = cfg.entryDto(payload, ctx, ids);
  await cfg.addEntry(entryDto);

  return {
    ids: {
      paymentId: ids.paymentId,
      moneyEntryId: ids.moneyEntryId,
      domainEntryId: ids.domainEntryId,
    },
    fingerprint: finger,
  };
}
