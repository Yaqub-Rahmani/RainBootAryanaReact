import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import { X, Check } from "lucide-react";
import "../styles/SimpleModal.css";

const getNowIso = () => new Date().toISOString().slice(0, 16); // for datetime-local

export default function BalanceEntryModal({
  open,
  dir = "rtl",
  title = "ثبت حرکت جدید",
  initialValue,
  onClose,
  onSubmit,
  submitLabel = "ثبت",
  busy = false,
}) {
  const closeBtnRef = useRef(null);

  const base = useMemo(
    () => ({
      id: null,
      familyMemberId: "",
      direction: "In", // In|Out
      amount: "",
      occurredAtLocal: "",
      notes: "",
      familyPayoutId: "",
      ownerDistributionId: "",
      collectionId: "",
      contractId: "",
    }),
    []
  );

  const [m, setM] = useState(base);

  useEffect(() => {
    if (!open) return;
    const v = initialValue || {};
    setM({
      ...base,
      ...v,
      id: v?.id ?? v?.Id ?? null,
      familyMemberId: v?.familyMemberId ?? v?.FamilyMemberId ?? base.familyMemberId,
      direction: v?.direction ?? v?.Direction ?? base.direction,
      amount: String(v?.amount ?? v?.Amount ?? ""),
      occurredAtLocal:
        v?.occurredAtLocal ||
        (v?.occurredAtUtc || v?.OccurredAtUtc
          ? new Date(v?.occurredAtUtc || v?.OccurredAtUtc).toISOString().slice(0, 16)
          : getNowIso()),
      notes: v?.notes ?? v?.Notes ?? "",
      familyPayoutId: v?.familyPayoutId ?? v?.FamilyPayoutId ?? "",
      ownerDistributionId: v?.ownerDistributionId ?? v?.OwnerDistributionId ?? "",
      collectionId: v?.collectionId ?? v?.CollectionId ?? "",
      contractId: v?.contractId ?? v?.ContractId ?? "",
    });

    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const amountNum = Number(String(m.amount).replace(/[, ]/g, ""));
  const validAmount = Number.isFinite(amountNum) && amountNum > 0;

  const toGuidOrNull = (s) => {
    const t = String(s || "").trim();
    return t ? t : null;
  };

  const handleSubmit = () => {
    if (!m.familyMemberId) return;

    const occurredAtUtc = new Date(m.occurredAtLocal).toISOString();

    onSubmit?.({
      id: m.id,
      familyMemberId: m.familyMemberId,
      direction: m.direction, // backend enum binder: "In"/"Out"
      amount: amountNum,
      occurredAtUtc,
      notes: m.notes?.trim() || null,
      familyPayoutId: toGuidOrNull(m.familyPayoutId),
      ownerDistributionId: toGuidOrNull(m.ownerDistributionId),
      collectionId: toGuidOrNull(m.collectionId),
      contractId: toGuidOrNull(m.contractId),
    });
  };

  return (
    <div className="sm__overlay" dir={dir} onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="sm__modal">
        <div className="sm__header">
          <div className="sm__title">{title}</div>
          <button ref={closeBtnRef} className="sm__x" onClick={onClose} type="button" aria-label="close">
            <X size={18} />
          </button>
        </div>

        <div className="sm__body">
          <div className="sm__grid">
            <div className="sm__field">
              <label>نوع</label>
              <select value={m.direction} onChange={(e) => setM((p) => ({ ...p, direction: e.target.value }))}>
                <option value="In">دریافت (ورود)</option>
                <option value="Out">پرداخت (خروج)</option>
              </select>
            </div>

            <div className="sm__field">
              <label>مبلغ</label>
              <Input value={m.amount} onChange={(e) => setM((p) => ({ ...p, amount: e.target.value }))} />
              {!validAmount && <div className="sm__hint bad">مبلغ معتبر نیست.</div>}
            </div>

            <div className="sm__field">
              <label>تاریخ/زمان</label>
              <input
                type="datetime-local"
                value={m.occurredAtLocal}
                onChange={(e) => setM((p) => ({ ...p, occurredAtLocal: e.target.value }))}
              />
            </div>

            <div className="sm__field sm__span2">
              <label>یادداشت</label>
              <Input value={m.notes} onChange={(e) => setM((p) => ({ ...p, notes: e.target.value }))} />
            </div>

            <div className="sm__field">
              <label>ContractId (اختیاری)</label>
              <Input value={m.contractId} onChange={(e) => setM((p) => ({ ...p, contractId: e.target.value }))} />
            </div>

            <div className="sm__field">
              <label>CollectionId (اختیاری)</label>
              <Input value={m.collectionId} onChange={(e) => setM((p) => ({ ...p, collectionId: e.target.value }))} />
            </div>

            <div className="sm__field">
              <label>FamilyPayoutId (اختیاری)</label>
              <Input value={m.familyPayoutId} onChange={(e) => setM((p) => ({ ...p, familyPayoutId: e.target.value }))} />
            </div>

            <div className="sm__field">
              <label>OwnerDistributionId (اختیاری)</label>
              <Input
                value={m.ownerDistributionId}
                onChange={(e) => setM((p) => ({ ...p, ownerDistributionId: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="sm__footer">
          <Button onClick={onClose} primaryColor="var(--role-secondary-bg)" icon={X}>
            بستن
          </Button>
          <Button onClick={handleSubmit} disabled={busy || !validAmount} icon={Check}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
