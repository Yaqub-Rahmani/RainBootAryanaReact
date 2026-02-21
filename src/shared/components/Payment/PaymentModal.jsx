import React, { useEffect, useMemo, useRef, useState } from "react";
import "./PaymentModal.css";

import {
  X,
  Check,
  CreditCard,
  Hash,
  FileText,
  Banknote,
  Fingerprint,
} from "lucide-react";

import Button from "../Button";
import Input from "../Input";
import SmartSelect from "../SmartSelect";
import FingerModal from "../../../features/fingerprint/Model/fingerModel";

const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);
const getEvtValue = (e) => (e?.target ? e.target.value : e);

const normalizeMethodValue = (m) => {
  if (!m) return null;
  if (typeof m === "string") return m;
  if (typeof m === "object") return m.value ?? null;
  return null;
};

const parseAmount = (raw) => {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const getBioUi = (effectiveStatus, errorMsg) => {
  switch (effectiveStatus) {
    case "reading":
      return {
        className: "is-reading",
        title: "در حال اسکن...",
        hint: "در حال اسکن...",
        colorVar: "var(--role-secondary-bg)",
      };
    case "failed":
      return {
        className: "is-failed",
        title: "ناموفق — دوباره تلاش کنید",
        hint: errorMsg?.trim() || "ناموفق — دوباره تلاش کنید",
        colorVar: "var(--role-danger-bg)",
      };
    case "success":
      return {
        className: "is-ok",
        title: "ثبت شد",
        hint: "بایومتریک ثبت شد",
        colorVar: "var(--role-primary-bg)",
      };
    case "idle":
    default:
      return {
        className: "is-idle",
        title: "ثبت بایومتریک",
        hint: "ثبت بایومتریک (اختیاری)",
        colorVar: "var(--role-neutral-soft-bg)",
      };
  }
};

export default function PaymentModal({
  open,
  dir = "rtl",

  title = "ثبت پرداخت",
  hint,

  value,
  onChange,

  onClose,
  onSubmit,

  submitLabel = "ثبت",
  closeLabel = "بستن",

  requiredMethod = true,
  requiredAmount = true,

  // ✅ sadece bu iki prop
  maxPayable = null, // number | null
  currencyLabel = "", // string

  disabled = false,
}) {
  const closeBtnRef = useRef(null);

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";


  const paymentMethodsOptions = useMemo(
    () => [
      { value: "cash", label: "نقده حضوری", pm: 1 },
      { value: "bank", label: "ازطریق بانک", pm: 2 },
      { value: "transfer", label: "از طریق حواله", pm: 2 },
    ],
    []
  );

  const baseModel = useMemo(
    () => ({
      method: null,
      amount: "",
      reference: "",
      description: "",
      fingerprintTemplateBase64: "",
      fingerprintBitmapPngBase64: "",
    }),
    []
  );

  const model = useMemo(
    () => ({ ...baseModel, ...(value || {}) }),
    [baseModel, value]
  );
  const modelRef = useRef(model);

  useEffect(() => {
    modelRef.current = model;
  }, [model]);

  const setField = (key, v) => {
    const next = { ...modelRef.current, [key]: v };
    onChange?.(next);
  };

  const setFields = (patch) => {
    const next = { ...modelRef.current, ...patch };
    onChange?.(next);
  };

  const [submitted, setSubmitted] = useState(false);

  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerStatus, setFingerStatus] = useState("idle"); // idle | reading | failed
  const [fingerError, setFingerError] = useState("");

  const [fingerCache, setFingerCache] = useState({ template: "", bitmap: "" });

  const effectiveTemplate =
    fingerCache.template || model.fingerprintTemplateBase64 || "";
  const effectiveBitmap =
    fingerCache.bitmap || model.fingerprintBitmapPngBase64 || "";
  const hasFinger = !!effectiveTemplate;

  const effectiveStatus = hasFinger ? "success" : fingerStatus;
  const bioUi = getBioUi(effectiveStatus, fingerError);

  useEffect(() => {
    if (!open) return;

    setSubmitted(false);

    setFingerCache({
      template: model.fingerprintTemplateBase64 || "",
      bitmap: model.fingerprintBitmapPngBase64 || "",
    });

    setFingerStatus("idle");
    setFingerError("");

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (
      model.fingerprintTemplateBase64 &&
      model.fingerprintTemplateBase64 !== fingerCache.template
    ) {
      setFingerCache({
        template: model.fingerprintTemplateBase64 || "",
        bitmap: model.fingerprintBitmapPngBase64 || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model.fingerprintTemplateBase64, model.fingerprintBitmapPngBase64, open]);

  const methodValue = model.method;

  const methodMissing =
    requiredMethod &&
    (methodValue == null ||
      (typeof methodValue === "string" && methodValue.trim() === "") ||
      (typeof methodValue === "object" && isEmpty(methodValue.value)));

  const amountMissing =
    requiredAmount &&
    (model.amount == null || String(model.amount).trim() === "");

  const amountNum = parseAmount(model.amount);
  const amountNonPositive =
    requiredAmount && (amountNum == null || amountNum <= 0);

  const exceedsMax =
    maxPayable != null &&
    Number.isFinite(maxPayable) &&
    amountNum != null &&
    Number.isFinite(amountNum) &&
    amountNum > maxPayable;
  const isValid =
    !methodMissing && !amountMissing && !amountNonPositive && !exceedsMax;
  const showErrors = submitted;

  const methodKey = normalizeMethodValue(methodValue);
  const MethodIcon = methodKey === "cash" ? Banknote : CreditCard;

  const buildPayload = () => ({
    method: normalizeMethodValue(model.method),
    amount: parseAmount(model.amount),
    reference: (model.reference ?? "").trim() || null,
    description: (model.description ?? "").trim() || null,
    fingerprintTemplateBase64: effectiveTemplate || null,
    fingerprintBitmapPngBase64: effectiveBitmap || null,
  });

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValid) return; // ✅ validasyon burada çalışır (senin eski davranış)
    onSubmit?.(buildPayload());
  };

  const handleOpenFinger = () => {
    if (disabled) return;
    setFingerError("");
    setFingerStatus("reading");
    setFingerOpen(true);
  };

  const handleFingerClose = () => {
    setFingerOpen(false);
    setFingerStatus((s) => (s === "reading" && !hasFinger ? "idle" : s));
  };

  if (!open) return null;

  return (
    <div
      className="pmd__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // onMouseDown={(e) => {
      //   if (e.target === e.currentTarget) onClose?.();
      // }}
    >
      <div
        className="pmd__modal"
        dir={dir}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pmd__header">
          <div className="pmd__titleWrap">
            <div className="pmd__titleRow">
              <div className="pmd__title">{title}</div>

              {maxPayable != null && Number.isFinite(maxPayable) ? (
                <div
                  className={
                    "pmd__capBadge" +
                    (showErrors && exceedsMax ? " is-danger" : "")
                  }
                >
                  حداکثر قابل پرداخت: {maxPayable} {currencyLabel}
                </div>
              ) : null}
            </div>

            {hint ? <div className="pmd__hint">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={onClose}
            title={closeLabel}
            disabled={disabled}
            primaryColor={dangerColor}
          />
        </div>

        {/* Body */}
        <div className="pmd__body">
          <div className="pmd__grid">
            {/* Method */}
            <div
              className={
                "pmd__field" +
                (showErrors && methodMissing ? " is-invalid" : "")
              }
            >
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <MethodIcon size={16} />
                  </span>
                  روش پرداخت
                  {requiredMethod ? <span className="pmd__req">*</span> : null}
                </label>
              </div>

              <div className="pmd__control">
                <SmartSelect
                  options={paymentMethodsOptions}
                  value={methodValue}
                  onChange={(v) => setField("method", v)}
                  placeholder="انتخاب کنید..."
                  clearable={!requiredMethod}
                  searchable={false}
                  disabled={disabled}
                />
              </div>

              {showErrors && methodMissing ? (
                <div className="pmd__error" role="alert">
                  روش پرداخت را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Amount */}
            <div
              className={
                "pmd__field" +
                (showErrors &&
                (amountMissing || amountNonPositive || exceedsMax)
                  ? " is-invalid"
                  : "")
              }
            >
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <CreditCard size={16} />
                  </span>
                  مبلغ
                  {requiredAmount ? <span className="pmd__req">*</span> : null}
                </label>

                {currencyLabel ? (
                  <span className="pmd__meta">{currencyLabel}</span>
                ) : null}
              </div>

              <div className="pmd__control">
                <Input
                  icon="CreditCard"
                  value={model.amount ?? ""}
                  onChange={(e) => setField("amount", getEvtValue(e))}
                  placeholder={
                    currencyLabel
                      ? `مبلغ پرداخت ${currencyLabel}`
                      : "مبلغ پرداخت"
                  }
                  label={null}
                  autoComplete="off"
                  type="number"
                  disabled={disabled}
                />
              </div>

              {showErrors && amountMissing ? (
                <div className="pmd__error" role="alert">
                  مبلغ را وارد کنید.
                </div>
              ) : null}

              {showErrors && !amountMissing && amountNonPositive ? (
                <div className="pmd__error" role="alert">
                  مبلغ باید بزرگ‌تر از 0 باشد.
                </div>
              ) : null}

              {showErrors && exceedsMax ? (
                <div className="pmd__error" role="alert">
                  مبلغ نباید بیشتر از {maxPayable} {currencyLabel} باشد.
                </div>
              ) : null}
            </div>

            {/* Reference */}
            <div className="pmd__field pmd__span2">
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <Hash size={16} />
                  </span>
                  رپرانس
                </label>
                <span className="pmd__meta">اختیاری</span>
              </div>

              <div className="pmd__control">
                <Input
                  icon="Hash"
                  value={model.reference ?? ""}
                  onChange={(e) => setField("reference", getEvtValue(e))}
                  placeholder="رپرانس"
                  label={null}
                  autoComplete="off"
                  disabled={disabled}
                />
              </div>
            </div>

            {/* Description + Finger */}
            <div className="pmd__field pmd__span2">
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <FileText size={16} />
                  </span>
                  توضیحات
                </label>
                <span className="pmd__meta">اختیاری</span>
              </div>

              <div className="pmd__descGrid">
                <div className="pmd__control">
                  <Input
                    multiline
                    rows={3}
                    type="text"
                    icon="FileText"
                    placeholder="توضیحات بیشتر..."
                    value={model.description ?? ""}
                    onChange={(e) => setField("description", getEvtValue(e))}
                    disabled={disabled}
                  />
                </div>

                <div className="pmd__bioWrap">
                  <div className="pmd__bioStack">
                    <Button
                      iconOnly
                      icon={Fingerprint}
                      iconSize={66}
                      size="lg"
                      type="button"
                      onClick={handleOpenFinger}
                      variant="soft"
                      className={"pmd__bioBtn " + bioUi.className}
                      title={bioUi.title}
                      data-test="btn-fingerprint"
                      disabled={disabled}
                      primaryColor={bioUi.colorVar}
                    />
                    <small
                      className={"pmd__bioHint " + bioUi.className}
                      aria-live="polite"
                    >
                      {bioUi.hint}
                    </small>
                  </div>
                </div>
              </div>

              {showErrors && !isValid ? (
                <div className="pmd__errorSummary" role="alert">
                  لطفاً فیلدهای ضروری را تکمیل کنید.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pmd__footer">
          <small className="pmd__footerNote">
            قبل از ثبت، لطفاً مبلغ و روش پرداخت را بررسی کنید.
          </small>

          <Button
            size="md"
            variant="soft"
            icon={X}
            onClick={onClose}
            disabled={disabled}
            primaryColor={secondaryColor}
          >
            {closeLabel}
          </Button>

          <Button
            size="md"
            variant="soft"
            icon={Check}
            onClick={handleSubmit}
            disabled={disabled || !onSubmit}
            primaryColor={primaryColor}
            title={
              exceedsMax
                ? "مبلغ از حد مجاز بیشتر است"
                : !isValid
                ? "ابتدا اطلاعات ضروری را تکمیل کنید"
                : undefined
            }
          >
            {submitLabel}
          </Button>
        </div>

        {/* Fingerprint Modal */}
        <FingerModal
          open={fingerOpen}
          onClose={handleFingerClose}
          mode="create"
          verbose={false}
          autoCloseOnSuccess={true}
          successCloseDelay={900}
          onCompleted={(res) => {
            const ok =
              res?.result === "success" &&
              res?.action === "create" &&
              res?.mergedTemplateBase64;

            if (ok) {
              const tpl = res.mergedTemplateBase64 || "";
              const bmp = res.lastBitmapPngBase64 || "";

              setFingerCache({ template: tpl, bitmap: bmp });

              setFields({
                fingerprintTemplateBase64: tpl,
                fingerprintBitmapPngBase64: bmp,
              });

              setFingerError("");
              setFingerStatus("idle");
            } else {
              const msg =
                res?.message ||
                res?.error ||
                res?.reason ||
                "ناموفق — دوباره تلاش کنید";
              setFingerError(msg);
              setFingerStatus("failed");
            }
          }}
        />
      </div>
    </div>
  );
}
