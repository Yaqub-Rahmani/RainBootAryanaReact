import { BalanceDirection, nowIso, s, toAmount, toPaymentMethod } from "./outflowConstants";

// projendeki gerçek servis yollarını kullan
import { moneyEntryService } from "./features/money/services/moneyEntryService";
import { franchiseBalanceEntryService } from "./features/franchiseOwners/services/franchiseBalanceEntryService";

// diğerleri için örnek: taxPaymentEntryService, charityPaymentEntryService, expenseService, reserveEntryService, ...

export const OutflowType = {
  FranchiseOwnerPayout: 1,
  Expense: 2,
  TaxPaymentEntry: 3,
  CharityPaymentEntry: 4,
  ReserveEntry: 5,
};

export const OUTFLOW_CONFIG = {
  [OutflowType.FranchiseOwnerPayout]: {
    fingerprintPolicy: "optional", // "required" yaparsan her ödemede zorunlu kılarsın.

    required: (payload, ctx) => {
      // payload: onSubmit :contentReference[oaicite:19]{index=19}
      const amount = toAmount(payload?.amount);
      if (!payload?.ownerId) throw new Error("ownerId (FranchiseOwnerId) zorunlu.");
      if (!ctx?.moneyAccountId) throw new Error("moneyAccountId zorunlu.");
      if (!ctx?.currency) throw new Error("currency zorunlu.");
      if (amount == null || amount <= 0) throw new Error("amount geçersiz.");
      if (!payload?.method) throw new Error("payment method zorunlu.");
    },

    // MoneyEntryCreateDto
    moneyEntryDto: (payload, ctx, ids) => ({
      id: ids.moneyEntryId,
      moneyAccountId: ctx.moneyAccountId,
      direction: BalanceDirection.Out,
      amount: toAmount(payload.amount),
      currency: ctx.currency,
      expenseId: null,
      collectionId: null,
    }),
    addMoneyEntry: (dto) => moneyEntryService.add(dto),

    // FranchiseBalanceEntryCreateDto
    entryDto: (payload, ctx, ids) => ({
      id: ids.domainEntryId,
      franchiseOwnerId: payload.ownerId,
      direction: BalanceDirection.Out,
      amount: toAmount(payload.amount),
      occurredAtUtc: payload.occurredAtUtc || nowIso(),
      notes: s(payload.description).trim() || null,
      paymentMethod: toPaymentMethod(payload.method),
      paymentReference: s(payload.reference).trim() || null,
      moneyEntryId: ids.moneyEntryId, // zorunlu link :contentReference[oaicite:20]{index=20}
    }),
    addEntry: (dto) => franchiseBalanceEntryService.add(dto),
  },

  // --- HAZIR SLOT’LAR (aynı interface) ---
  [OutflowType.Expense]: {
    fingerprintPolicy: "optional",
    required: () => { throw new Error("Expense config henüz bağlanmadı."); },
  },
  [OutflowType.TaxPaymentEntry]: {
    fingerprintPolicy: "optional",
    required: () => { throw new Error("TaxPaymentEntry config henüz bağlanmadı."); },
    // TaxPaymentEntry entity’de MoneyEntryId alanı var. :contentReference[oaicite:21]{index=21}
  },
  [OutflowType.CharityPaymentEntry]: {
    fingerprintPolicy: "optional",
    required: () => { throw new Error("CharityPaymentEntry config henüz bağlanmadı."); },
  },
  [OutflowType.ReserveEntry]: {
    fingerprintPolicy: "optional",
    required: () => { throw new Error("ReserveEntry config henüz bağlanmadı."); },
  },
};
