import React, { useEffect, useMemo, useRef, useState } from "react";
import "./TxFlowModal.css";

import { X, Check, ArrowDownCircle, ArrowUpCircle, Banknote, Calendar } from "lucide-react";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import SmartSelect from "../../../shared/components/SmartSelect";

const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

const getEvtValue = (e) => (e?.target ? e.target.value : e);

const parseAmount = (raw) => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const onlyDigits = (v) => String(v ?? "").replace(/[^\d]/g, "");

const parseOptionalInt = (raw) => {
  const d = onlyDigits(raw);
  if (!d) return null;
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
};

export default function TxFlowModal({
  open,
  dir = "rtl",

  title = "ثبت جریان",
  hint,

  value,
  onChange,

  onClose,
  onSubmit,

  submitLabel = "تأیید",
  closeLabel = "لغو",

  disabled = false,
  busy = false,
}) {
  const closeBtnRef = useRef(null);

  const baseModel = useMemo(
    () => ({
      direction: 1, // 1=ورود, 2=خروج
      amount: "",
      year: "",
      month: "",
    }),
    []
  );

  const model = useMemo(
    () => ({ ...baseModel, ...(value || {}) }),
    [baseModel, value]
  );

  const setField = (key, v) => onChange?.({ ...model, [key]: v });

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  const directionOptions = useMemo(
    () => [
      { value: 1, label: "دریافت (ورود)" },
      { value: 2, label: "پرداخت (خروج)" },
    ],
    []
  );

  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSubmitted(false);

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const directionVal = model.direction;
  const directionMissing =
    directionVal == null ||
    (typeof directionVal === "object" && isEmpty(directionVal.value));

  const amountNum = parseAmount(model.amount);
  const amountMissing = model.amount == null || String(model.amount).trim() === "";
  const amountInvalid = amountNum == null || amountNum <= 0;

  const yearNum = parseOptionalInt(model.year);
  const monthNum = parseOptionalInt(model.month);

  const yearInvalid = model.year ? onlyDigits(model.year).length !== 4 : false;
  const monthInvalid = model.month ? !(monthNum >= 1 && monthNum <= 12) : false;

  const isValid =
    !directionMissing &&
    !amountMissing &&
    !amountInvalid &&
    !yearInvalid &&
    !monthInvalid;

  const showErrors = submitted;

  const DirectionIcon = Number(directionVal) === 1 ? ArrowDownCircle : ArrowUpCircle;

  const buildPayload = () => ({
    direction: Number(directionVal),
    amount: amountNum,
    year: yearNum,
    month: monthNum,
  });

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid || busy || disabled) return;
    onSubmit?.(buildPayload());
  };

  if (!open) return null;

  return (
    <div className="txm__overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="txm__modal" dir={dir} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="txm__header">
          <div className="txm__titleWrap">
            <div className="txm__titleRow">
              <div className="txm__title">{title}</div>

              <div className={"txm__badge " + (Number(directionVal) === 1 ? "is-in" : "is-out")}>
                <DirectionIcon size={16} />
                <span>{Number(directionVal) === 1 ? "ورود" : "خروج"}</span>
              </div>
            </div>

            {hint ? <div className="txm__hint">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={() => (!busy ? onClose?.() : null)}
            title={closeLabel}
            disabled={disabled || busy}
            primaryColor={dangerColor}
          />
        </div>

        {/* Body */}
        <div className="txm__body">
          <div className="txm__grid">
            {/* Direction */}
            <div className={"txm__field" + (showErrors && directionMissing ? " is-invalid" : "")}>
              <div className="txm__labelRow">
                <label className="txm__label">
                  <span className="txm__labelIcon" aria-hidden="true">
                    <DirectionIcon size={16} />
                  </span>
                  نوع
                  <span className="txm__req">*</span>
                </label>
              </div>

              <div className="txm__control">
                <SmartSelect
                  options={directionOptions}
                  value={directionVal}
                  onChange={(v) => {
                    // SmartSelect bazen object döndürebilir; burada iki ihtimali de handle ediyoruz
                    const next =
                      typeof v === "object" && v?.value != null ? Number(v.value) : Number(v);
                    setField("direction", next);
                  }}
                  placeholder="انتخاب کنید..."
                  clearable={false}
                  searchable={false}
                  disabled={disabled || busy}
                />
              </div>

              {showErrors && directionMissing ? (
                <div className="txm__error" role="alert">
                  نوع جریان را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Amount */}
            <div
              className={
                "txm__field" +
                (showErrors && (amountMissing || amountInvalid) ? " is-invalid" : "")
              }
            >
              <div className="txm__labelRow">
                <label className="txm__label">
                  <span className="txm__labelIcon" aria-hidden="true">
                    <Banknote size={16} />
                  </span>
                  مبلغ
                  <span className="txm__req">*</span>
                </label>
              </div>

              <div className="txm__control">
                <Input
                  icon="CreditCard"
                  value={model.amount ?? ""}
                  onChange={(e) => setField("amount", getEvtValue(e))}
                  placeholder="مبلغ"
                  label={null}
                  autoComplete="off"
                  type="number"
                  disabled={disabled || busy}
                />
              </div>

              {showErrors && amountMissing ? (
                <div className="txm__error" role="alert">
                  مبلغ را وارد کنید.
                </div>
              ) : null}

              {showErrors && !amountMissing && amountInvalid ? (
                <div className="txm__error" role="alert">
                  مبلغ باید بزرگ‌تر از 0 باشد.
                </div>
              ) : null}
            </div>

            {/* Year */}
            <div className={"txm__field" + (showErrors && yearInvalid ? " is-invalid" : "")}>
              <div className="txm__labelRow">
                <label className="txm__label">
                  <span className="txm__labelIcon" aria-hidden="true">
                    <Calendar size={16} />
                  </span>
                  سال
                </label>
                <span className="txm__meta">اختیاری</span>
              </div>

              <div className="txm__control">
                <Input
                  value={model.year ?? ""}
                  onChange={(e) => setField("year", onlyDigits(getEvtValue(e)).slice(0, 4))}
                  placeholder="مثلاً 1404"
                  label={null}
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  disabled={disabled || busy}
                />
              </div>

              {showErrors && yearInvalid ? (
                <div className="txm__error" role="alert">
                  سال باید 4 رقم باشد.
                </div>
              ) : null}
            </div>

            {/* Month */}
            <div className={"txm__field" + (showErrors && monthInvalid ? " is-invalid" : "")}>
              <div className="txm__labelRow">
                <label className="txm__label">
                  <span className="txm__labelIcon" aria-hidden="true">
                    <Calendar size={16} />
                  </span>
                  ماه
                </label>
                <span className="txm__meta">اختیاری</span>
              </div>

              <div className="txm__control">
                <Input
                  value={model.month ?? ""}
                  onChange={(e) => setField("month", onlyDigits(getEvtValue(e)).slice(0, 2))}
                  placeholder="1 تا 12"
                  label={null}
                  autoComplete="off"
                  type="text"
                  inputMode="numeric"
                  disabled={disabled || busy}
                />
              </div>

              {showErrors && monthInvalid ? (
                <div className="txm__error" role="alert">
                  ماه باید بین 1 تا 12 باشد.
                </div>
              ) : null}
            </div>

            {showErrors && !isValid ? (
              <div className="txm__errorSummary" role="alert">
                لطفاً فیلدهای ضروری را درست تکمیل کنید.
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="txm__footer">
          <small className="txm__footerNote">
            قبل از تأیید، مبلغ و نوع جریان را بررسی کنید.
          </small>

          <div className="txm__actions">
            <Button
              size="md"
              variant="soft"
              icon={X}
              onClick={() => (!busy ? onClose?.() : null)}
              disabled={disabled || busy}
              primaryColor={secondaryColor}
            >
              {closeLabel}
            </Button>

            <Button
              size="md"
              variant="soft"
              icon={Check}
              onClick={handleSubmit}
              disabled={disabled || busy || !onSubmit}
              primaryColor={primaryColor}
              title={!isValid ? "ابتدا اطلاعات ضروری را تکمیل کنید" : undefined}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
