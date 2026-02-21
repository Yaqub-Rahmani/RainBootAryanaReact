import React, { useEffect, useMemo, useRef, useState } from "react";
import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";
import persian from "react-date-object/calendars/persian";
import persian_en from "react-date-object/locales/persian_en";

import CustomDatePicker from "../../../shared/date/CustomDatePicker";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import "../styles/FranchiseShopModal.css";
import { Check, X } from "lucide-react";
import FilePicker from "../../../shared/utils/fileUpload/FilePicker";

/* --------------------- yardımcılar --------------------- */
const getVal = (v) => (v && typeof v === "object" && "target" in v ? v.target.value : v);

/** 1..max aralığı; max prop’tan gelir (default 100) */
const clampToRange = (val, min, max) => {
  if (val === "" || val === null || typeof val === "undefined") return "";
  const n = Number(String(val).replace(",", "."));
  if (Number.isNaN(n)) return "";
  const clamped = Math.max(min, Math.min(max, Math.round(n)));
  return clamped;
};

const isBefore = (a, b) => { try { return a?.isBefore?.(b, "day"); } catch { return +a < +b; } };
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(1)} KB`;
};
/** Güvenli iki takvim formatı */
export const toFmt = (d) => {
  if (!d) return null;
  const base = d?.isValid ? d : new DateObject(d);
  const native = base.toDate();
  const g = new DateObject(native).set({ calendar: gregorian, locale: gregorian_en });
  const j = new DateObject(native).set({ calendar: persian,   locale: persian_en   });
  return { raw: d, gregorian: g.format("YYYY-MM-DD"), jalali: j.format("YYYY-MM-DD") };
};
/** Dosya doğrulama */
const validateFile = (f, { accept, maxFileSizeMB }) => {
  if (!f) return { ok: true };
  if (maxFileSizeMB && f.size > maxFileSizeMB * 1024 * 1024) {
    return { ok: false, msg: `حداکثر حجم فایل ${maxFileSizeMB} مگابایت است.` };
  }
  if (accept && accept !== "*") {
    const allow = accept.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    const ok = allow.some((p) => (p.startsWith(".") ? f.name.toLowerCase().endsWith(p) : f.type.toLowerCase() === p));
    if (!ok) return { ok: false, msg: `انواع مجاز: ${accept}` };
  }
  return { ok: true };
};

/* ------------------------ modal ------------------------ */
export default function FranchiseShopModal({
  open,
  onClose,
  onSubmit,
  title = "تنظیمات دکان فرنچایز",
  labels = {},
  calendarMode = "persian",
  dir = "rtl",
  className = "",
  style,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxFileSizeMB = 10,
  maxDescriptionLength = 1000,

  /** Yeni: pay aralığı (min sabit 1, max dışarıdan) */
  myShareMax = 100,   // 1..100 arası herhangi bir sayı olabilir (örn. 60, 80, 50)
}) {
  // min 1, max en az 1 olmalı; güvenlik
  const minShare = 1;
  const maxShare = Math.max(1, Math.min(100, Number(myShareMax) || 100));

  
  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  const L = useMemo(
    () => ({
      titleClose: "بستن",
      startDate: "تاریخ شروع",
      endDate: "تاریخ پایان",
      description: "توضیحات",
      myShare: "مقدار سهم", // <— İSTENEN ETİKET
      mySharePlaceholder: `از ${minShare} تا ${maxShare}`,
      file: "فایل / اسناد",
      chooseFile: "انتخاب فایل",
      changeFile: "تغییر فایل",
      removeFile: "حذف فایل",
      submit: "ثبت",
      cancel: "انصراف",
      // rehber mesajlar
      phStart: "تاریخ شروع را انتخاب کنید",
      phEndWait: "ابتدا تاریخ شروع را انتخاب کنید",
      phEndPick: "تاریخ پایان را انتخاب کنید",
      // hatalar
      errStartRequired: "تاریخ شروع الزامی است.",
      errEndRequired: "تاریخ پایان الزامی است.",
      errEndBefore: "تاریخ پایان نمی‌تواند قبل از شروع باشد.",
      errPercentNaN: "مقدار سهم باید عددی باشد.",
      errPercentRange: `مقدار سهم باید بین ${minShare} تا ${maxShare} باشد.`,
      errDescMax: (n) => `حداکثر ${n} کاراکتر.`,
    }),
    [labels, maxShare]
  );

  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [description, setDescription] = useState("");
  const [percent, setPercent] = useState(""); // "مقدار سهم من"
  const [file, setFile] = useState(null);
  const [fileErr, setFileErr] = useState(null);
  const [errors, setErrors] = useState({});  
  const [error, setError] = useState("");

  const overlayRef = useRef(null);
  const firstFocusableRef = useRef(null);

  // ESC & ilk odak
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => { firstFocusableRef.current?.focus?.(); }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose]);

  // start değişince end uygunsuzsa sıfırla
  useEffect(() => {
    if (startDate && endDate && isBefore(endDate, startDate)) setEndDate(null);
  }, [startDate, endDate]);

  // validasyon
  const validate = () => {
    const next = {};
    if (!startDate) next.startDate = L.errStartRequired;
    if (!endDate) next.endDate = L.errEndRequired;
    if (startDate && endDate && isBefore(endDate, startDate)) next.endDate = L.errEndBefore;

    const n = clampToRange(percent, minShare, maxShare);
    if (n === "") next.percent = L.errPercentNaN;
    else if (n < minShare || n > maxShare) next.percent = L.errPercentRange;

    if (description && description.length > maxDescriptionLength) next.description = L.errDescMax(maxDescriptionLength);
    if (fileErr) next.file = fileErr;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    onSubmit?.({
      startDate: toFmt(startDate), // {gregorian:"YYYY-MM-DD", jalali:"YYYY-MM-DD"}
      endDate: toFmt(endDate),
      description: description?.trim(),
      myShare: clampToRange(percent, minShare, maxShare),
      file: file || null,
      myShareMax: maxShare,
    });
  };

  const handlePercentChange = (v) => {
    const c = clampToRange(getVal(v), minShare, maxShare);
    setPercent(c === "" ? "" : String(c));
  };
  const onWheelPrevent = (e) => e.target?.blur?.();

  if (!open) return null;
  const errId = { startDate: "err-startDate", endDate: "err-endDate", percent: "err-percent", description: "err-description", file: "err-file" };
  const handleOverlayClick = (e) => { if (e.currentTarget === e.target) onClose?.(); };

  const endPlaceholder = !startDate ? L.phEndWait : L.phEndPick;

  return (
    <div
      ref={overlayRef}
      className={`fsm-overlay ${className}`}
      style={style}
      onClick={handleOverlayClick}
      data-dir={dir}
      dir={dir}
      aria-hidden={!open}
    >
      <div className="fsm-modal" role="dialog" aria-modal="true" aria-labelledby="fsm-title" onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div className="fsm-header">
          <div className="fsm-header-title" id="fsm-title">{title}</div>
          
          <Button
            as="button"
            type="button"
            ariaLabel={L.titleClose}
            primaryColor={dangerColor}
            onClick={onClose}
            ref={firstFocusableRef}
            iconOnly
            icon={X}
          >
            
          </Button>
        </div>

        {/* form */}
        <form className="fsm-form" onSubmit={handleSubmit} noValidate>
          <div className="fsm-grid">
            {/* başlangıç tarihi */}
            <div className="fsm-field">
              <label className="fsm-label" htmlFor="startDate">{L.startDate}</label>
              <CustomDatePicker
                id="startDate"
                mode="single"
                defaultCalendar={calendarMode}
                calendarMode={calendarMode}
                showToggle={false}
                placeholder={L.phStart}          // <— Farsça yönerge
                value={startDate}
                onChange={setStartDate}
                aria-invalid={Boolean(errors.startDate)}
                aria-describedby={errors.startDate ? errId.startDate : undefined}
              />
              {errors.startDate && <div className="fsm-error" id={errId.startDate}>{errors.startDate}</div>}
            </div>

            {/* bitiş tarihi */}
            <div className="fsm-field">
              <label className="fsm-label" htmlFor="endDate">{L.endDate}</label>
              <CustomDatePicker
                id="endDate"
                mode="single"
                defaultCalendar={calendarMode}
                calendarMode={calendarMode}
                showToggle={false}
                placeholder={endPlaceholder}     // <— Dinamik yönerge
                value={endDate}
                onChange={setEndDate}
                disabled={!startDate}
                minDate={startDate || undefined}
                aria-invalid={Boolean(errors.endDate)}
                aria-describedby={errors.endDate ? errId.endDate : undefined}
              />
              {errors.endDate && <div className="fsm-error" id={errId.endDate}>{errors.endDate}</div>}
            </div>

            {/* مقدار سهم من */}
            <div className="fsm-field fsm-col-2 fsm-field--percent">
              <Input
                id="percent"
                type="number"
                label={L.myShare}                 // <— Etiket
                placeholder={L.mySharePlaceholder}
                value={percent}
                onChange={handlePercentChange}
                onWheel={onWheelPrevent}
                min={minShare}
                max={maxShare}
                step="1"
                inputMode="numeric"
                pattern="[0-9]*"
                error={Boolean(errors.percent)}
                invalid={Boolean(errors.percent)}
                inputClassName="fsm-input"
                aria-invalid={Boolean(errors.percent)}
                aria-describedby={errors.percent ? errId.percent : undefined}
              />
              {errors.percent && <div className="fsm-error" id={errId.percent}>{errors.percent}</div>}
              <div className="fsm-hint">{`(حداکثر مجاز: ${maxShare})`}</div>
            </div>

            {/* توضیحات + فایل */}
            <div className="fsm-row-70-30">
              <div className="fsm-field">
                <Input
                  id="description"
                  multiline
                  rows={3}
                  label={L.description}
                  placeholder="..."
                  value={description}
                  onChange={(e) => setDescription(getVal(e))}
                  error={Boolean(errors.description)}
                  invalid={Boolean(errors.description)}
                  inputClassName="fsm-input"
                  maxLength={maxDescriptionLength}
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? errId.description : undefined}
                />
                {errors.description && <div className="fsm-error" id={errId.description}>{errors.description}</div>}
              </div>

              <div className="fsm-field">
                <label className="fsm-label">{L.file}</label>
                <FilePicker
                  value={file}
                  onChange={(f, err) => { setFile(f); setFileErr(err); }}
                  accept={accept}
                  maxFileSizeMB={maxFileSizeMB}
                  error={error}
                />
              </div>
            </div>
          </div>

          {/* actions */}
          <div className="fsm-actions fsm-actions--split">
            <Button
              as="button"
              type="button"
              onClick={onClose}
              primaryColor={secondaryColor}
              icon={X}
            >
              {L.cancel}
            </Button>

            <Button
              as="button"
              type="submit"
              primaryColor={primaryColor}
              icon={Check}
            >
              {L.submit}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
