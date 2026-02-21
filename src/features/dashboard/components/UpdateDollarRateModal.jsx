import React, { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import { X, Save, DollarSign, CalendarClock } from "lucide-react";
import "./UpdateDollarRateModal.css";

// ✅ senin date picker'in
import CustomDatePicker from "../../../shared/date/CustomDatePicker";

// ✅ time plugin
import TimePicker from "react-multi-date-picker/plugins/time_picker";
import DateObject from "react-date-object";

const getEvtValue = (e) => (e?.target ? e.target.value : e);

function parseNumber(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const cleaned = s.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function dateObjectToIso(val) {
  if (!val) return null;
  try {
    if (val instanceof DateObject) return val.toDate().toISOString();
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export default function UpdateDollarRateModal({
  open,
  dir = "rtl",

  title = "به‌روز رسانی نرخ دالر",
  hint,

  currentRate,

  onClose,
  onSubmit,

  submitLabel = "ثبت",
  closeLabel = "لغو",

  disabled = false,
  busy = false,
}) {
  const closeBtnRef = useRef(null);

  const [rate, setRate] = useState("");
  const [effective, setEffective] = useState(null); // DateObject
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSubmitted(false);
    setRate(currentRate != null ? String(currentRate) : "");

    // ✅ default: now (date + time)
    setEffective(new DateObject(new Date()));

    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, currentRate, busy, onClose]);

  const rateNum = useMemo(() => parseNumber(rate), [rate]);
  const effectiveIso = useMemo(() => dateObjectToIso(effective), [effective]);

  const rateMissing = rate == null || String(rate).trim() === "";
  const rateInvalid = rateNum == null || rateNum <= 0;

  const effectiveMissing = !effective;
  const effectiveInvalid = !effectiveIso;

  const isValid = !rateMissing && !rateInvalid && !effectiveMissing && !effectiveInvalid;
  const showErrors = submitted;

  const preview = useMemo(() => {
    if (!rateNum || rateNum <= 0) return null;
    const usdFor1000 = 1000 / rateNum;
    return { usdFor1000: usdFor1000.toFixed(2) };
  }, [rateNum]);

  const handleClose = () => {
    if (disabled || busy) return;
    onClose?.();
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (disabled || busy) return;
    if (!isValid) return;

    onSubmit?.({
      afnPerUsd: Number(rateNum),
      effectiveFromUtc: effectiveIso, // ✅ UTC ISO
    });
  };

  if (!open) return null;

  return (
    <div
      className="drm__overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="drm__modal" dir={dir} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="drm__header">
          <div className="drm__titleWrap">
            <div className="drm__titleRow">
              <div className="drm__title">{title}</div>
              {currentRate != null ? <div className="drm__badge">نرخ فعلی: {currentRate}</div> : null}
            </div>
            {hint ? <div className="drm__hintTop">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={handleClose}
            title={closeLabel}
            disabled={disabled || busy}
            primaryColor={"var(--role-danger-bg)"}
          />
        </div>

        {/* Body */}
        <div className="drm__body">
          <div className="drm__grid">
            {/* Rate */}
            <div className={"drm__field" + (showErrors && (rateMissing || rateInvalid) ? " is-invalid" : "")}>
              <div className="drm__labelRow">
                <label className="drm__label">
                  <span className="drm__labelIcon" aria-hidden="true">
                    <DollarSign size={16} />
                  </span>
                  ۱ دالر = چند افغانی؟
                  <span className="drm__req">*</span>
                </label>
              </div>

              <div className="drm__control">
                <Input
                  value={rate}
                  onChange={(v) => setRate(getEvtValue(v))}
                  placeholder="مثلاً 70.50"
                  type="number"
                  autoComplete="off"
                  disabled={disabled || busy}
                />
              </div>

              {preview ? (
                <div className="drm__subHint">۱۰۰۰ افغانی ≈ {preview.usdFor1000} دالر</div>
              ) : (
                <div className="drm__subHint">مثال: ۷۰.۵۰</div>
              )}

              {showErrors && rateMissing ? (
                <div className="drm__error" role="alert">نرخ را وارد کنید.</div>
              ) : null}
              {showErrors && !rateMissing && rateInvalid ? (
                <div className="drm__error" role="alert">نرخ باید بزرگ‌تر از 0 باشد.</div>
              ) : null}
            </div>

            {/* Effective (CustomDatePicker + time) */}
            <div className={"drm__field" + (showErrors && (effectiveMissing || effectiveInvalid) ? " is-invalid" : "")}>
              <div className="drm__labelRow">
                <label className="drm__label">
                  <span className="drm__labelIcon" aria-hidden="true">
                    <CalendarClock size={16} />
                  </span>
                  زمان اجرا
                  <span className="drm__req">*</span>
                </label>
              </div>

              <div className="drm__control">
                <CustomDatePicker
                  mode="single"
                  value={effective}
                  onChange={setEffective}
                  placeholder="تاریخ و ساعت را انتخاب کنید…"
                  // ✅ time support
                  format="YYYY-MM-DD HH:mm"
                  plugins={[<TimePicker position="bottom" hideSeconds />]}
                  // اگر خواستی: calendarMode="persian" یا "gregorian"
                />
              </div>

              <div className="drm__subHint">
                تاریخ/ساعت محلی انتخاب می‌شود و به UTC ارسال می‌گردد.
              </div>

              {showErrors && effectiveMissing ? (
                <div className="drm__error" role="alert">زمان اجرا را انتخاب کنید.</div>
              ) : null}
              {showErrors && !effectiveMissing && effectiveInvalid ? (
                <div className="drm__error" role="alert">زمان انتخاب‌شده نامعتبر است.</div>
              ) : null}
            </div>

            {showErrors && !isValid ? (
              <div className="drm__errorSummary" role="alert">
                لطفاً فیلدهای ضروری را درست تکمیل کنید.
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="drm__footer">
          <small className="drm__footerNote">قبل از ثبت، نرخ و زمان اجرا را بررسی کنید.</small>

          <div className="drm__actions">
            <Button
              variant="soft"
              onClick={handleClose}
              disabled={disabled || busy}
              primaryColor={"var(--role-secondary-bg)"}
            >
              {closeLabel}
            </Button>

            <Button
              icon={Save}
              onClick={handleSubmit}
              disabled={disabled || busy || !onSubmit}
              title={!isValid ? "ابتدا اطلاعات ضروری را تکمیل کنید" : undefined}
              primaryColor={"var(--role-primary-bg)"}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
