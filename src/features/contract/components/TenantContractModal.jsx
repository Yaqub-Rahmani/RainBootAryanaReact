import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";

import CustomDatePicker from "../../../shared/date/CustomDatePicker";
import SmartSelect from "../../../shared/components/SmartSelect";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import FilePicker from "../../../shared/utils/fileUpload/FilePicker";
import { X, ArrowBigLeft, ArrowBigRight, UserCog } from "lucide-react";
import "../styles/TenantContractModal.css";

/* ----------------------------- Utilities ------------------------------ */

const clamp = (v, min, max) => {
  if (v === "" || v === null || typeof v === "undefined") return "";
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return "";
  return Math.max(min, Math.min(max, n));
};

const toISODate = (d) => d?.toDate?.()?.toISOString()?.slice(0, 10) ?? null;

const toFiniteNumber = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

/* --------------------------- Component -------------------------------- */

export default function TenantContractModal({
  open,
  onClose,
  onSubmit,
  markets = [],
  floors = [],
  shops = [],
  tenants = [],
  accept = ".pdf,.jpg,.jpeg,.png",
  maxFileSizeMB = 10,
  maxDescriptionLength = 1000,
  calendarMode = "persian",
  dir = "rtl",
}) {
  const { show, hide } = useGlobalLoading();

  
  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  // Step control
  const [step, setStep] = useState(1);
  const goNext = () => setStep(2);
  const goBack = () => setStep(1);

  // Form state — Step 1
  const [marketId, setMarketId] = useState("");
  const [floorId, setFloorId] = useState("");
  const [shopId, setShopId] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [activity, setActivity] = useState("");
  const [electricityNote, setElectricityNote] = useState("");
  const [ownerAmt, setOwnerAmt] = useState("");
  const [marketAmt, setMarketAmt] = useState("");

  // Form state — Step 2
  const [franchAmt, setFranchAmt] = useState("");
  const [dueDay, setDueDay] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);

  // UX
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  /* -------------------------- Derived Data --------------------------- */

  const floorOptions = useMemo(
    () => floors.filter((f) => String(f.marketId) === String(marketId)),
    [floors, marketId]
  );

  const shopOptions = useMemo(
    () =>
      shops.filter(
        (s) =>
          String(s.marketId) === String(marketId) &&
          String(s.floorId) === String(floorId)
      ),
    [shops, marketId, floorId]
  );

  const selectedShop = useMemo(
    () =>
      shopOptions.find((s) => String(s.value ?? s.id) === String(shopId)) ||
      null,
    [shopOptions, shopId]
  );

  const tenantOptions = useMemo(
    () =>
      Array.isArray(tenants)
        ? tenants.map((t) => ({
            value: String(t.id),
            label: `${t.label}${t.fatherName ? ` __  (${t.fatherName})` : ""}`,
          }))
        : [],
    [tenants]
  );

  // Franchise edit rule
  const hasFrOwner =
    selectedShop?.hasActiveFranchiseOwner ??
    selectedShop?.HasActiveFranchiseOwner ??
    false;
  const canEditFranchiseAmt = Boolean(hasFrOwner);

  // Currency formatter (AFN — narrow symbol, no decimals)
  const fmtAF = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "AFN",
        maximumFractionDigits: 0,
        currencyDisplay: "narrowSymbol",
      }),
    []
  );

  const totalMoney = useMemo(() => {
    const o = toFiniteNumber(ownerAmt);
    const m = toFiniteNumber(marketAmt);
    const f = canEditFranchiseAmt ? toFiniteNumber(franchAmt) : 0;
    return o + m + f;
  }, [ownerAmt, marketAmt, franchAmt, canEditFranchiseAmt]);

  const subtitle =
    step === 1 ? "انتخاب‌ها و یادداشت‌ها" : "مبالغ و تاریخ‌ها + فایل";

  /* ------------------------- Lifecycle/Handlers ---------------------- */

  // Modal overlay shouldn’t close the dialog; also block ESC:
  // (We intentionally DO NOT attach overlay click or keydown listeners)

  // Reset all state
  const resetAll = useCallback(() => {
    setStep(1);

    setMarketId("");
    setFloorId("");
    setShopId("");
    setTenantId("");
    setActivity("");
    setElectricityNote("");

    setOwnerAmt("");
    setMarketAmt("");
    setFranchAmt("");

    setDueDay("");
    setStartDate(null);
    setEndDate(null);

    setDescription("");
    setFile(null);

    setErrors({});
  }, []);

  // Close button: reset + parent onClose
  const handleClose = useCallback(() => {
    resetAll();
    onClose?.();
  }, [onClose, resetAll]);

  // When modal becomes closed externally, ensure cleanup (idempotent)
  useEffect(() => {
    if (!open) {
      resetAll();
      hide(); // just-in-case global loading was left open
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* ----------------------------- Validation ------------------------- */

  const validateStep1 = useCallback(() => {
    const e = {};

    if (!marketId) e.marketId = "لطفاً مارکیت را انتخاب کنید.";
    if (!floorId) e.floorId = "لطفاً طبقه را انتخاب کنید.";
    if (!shopId) e.shopId = "لطفاً دوکان را انتخاب کنید.";
    if (!tenantId) e.tenantId = "لطفاً مستأجر را انتخاب کنید.";

    if (!activity || activity.trim() === "")
      e.activity = "لطفاً فعالیت تجاری را وارد کنید.";
    else if (activity.length > 100)
      e.activity = "فعالیت تجاری نمی‌تواند بیشتر از 100 کاراکتر باشد.";

    const nOwner = Number(ownerAmt);
    if (ownerAmt === "" || ownerAmt === null || ownerAmt === undefined)
      e.ownerAmt = "لطفاً مقدار سهم مالک را مشخص کنید.";
    else if (!Number.isFinite(nOwner) || nOwner < 0)
      e.ownerAmt = "مقدار وارد شده برای سهم مالک معتبر نیست.";

    const nMarket = Number(marketAmt);
    if (marketAmt === "" || marketAmt === null || marketAmt === undefined)
      e.marketAmt = "لطفاً مقدار سهم مارکیت را مشخص کنید.";
    else if (!Number.isFinite(nMarket) || nMarket < 0)
      e.marketAmt = "مقدار وارد شده برای سهم مارکیت معتبر نیست.";

    if (
      electricityNote === "" ||
      electricityNote === null ||
      electricityNote === undefined
    ) {
      e.electricityNote = "لطفاً ابتدایی برق را وارد کنید.";
    } else if (!/^\d{1,6}$/.test(electricityNote)) {
      e.electricityNote = "قرائت برق حداکثر 6 رقم باشد.";
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    marketId,
    floorId,
    shopId,
    tenantId,
    activity,
    electricityNote,
    ownerAmt,
    marketAmt,
  ]);

  const validateStep2 = useCallback(() => {
    const e = {};

    if (canEditFranchiseAmt) {
      const nFranch = Number(franchAmt || 0);
      if (!Number.isFinite(nFranch) || nFranch < 0)
        e.franchAmt = "مقدار نامعتبر";
    }

    const nDue = Number(dueDay || 0);
    if (!Number.isFinite(nDue) || nDue < 1 || nDue > 31)
      e.dueDay = "روز باید بین 1 و 31 باشد.";

    if (!startDate) e.startDate = "تاریخ شروع الزامی است.";
    if (!endDate) e.endDate = "تاریخ پایان الزامی است.";

    // if both available, endDate must be >= startDate
    if (startDate && endDate) {
      const s = startDate?.toDate?.() ?? startDate;
      const eDate = endDate?.toDate?.() ?? endDate;
      if (s && eDate && eDate < s) {
        e.endDate = "تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.";
      }
    }

    if (description && description.length > maxDescriptionLength)
      e.description = `حداکثر ${maxDescriptionLength} کاراکتر.`;

    if (file && file.size > maxFileSizeMB * 1024 * 1024)
      e.file = `حداکثر ${maxFileSizeMB}MB.`;

    setErrors(e);
    return Object.keys(e).length === 0;
  }, [
    canEditFranchiseAmt,
    franchAmt,
    dueDay,
    startDate,
    endDate,
    description,
    maxDescriptionLength,
    file,
    maxFileSizeMB,
  ]);

  const handleNext = useCallback(() => {
    if (validateStep1()) goNext();
  }, [validateStep1]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateStep2()) return;

      const dto = {
        marketId,
        floorId,
        shopId,
        tenantId,
        businessActivity: activity?.trim() || null,
        electricityNote: electricityNote?.trim() || null,
        ownerPortionAmount: toFiniteNumber(ownerAmt, 0),
        marketPortionAmount: toFiniteNumber(marketAmt, 0),
        franchisePortionAmount: canEditFranchiseAmt
          ? toFiniteNumber(franchAmt, 0)
          : 0,
        dueDayOfMonth: toFiniteNumber(dueDay, 0),
        startDate: toISODate(startDate),
        endDate: toISODate(endDate),
        description: description?.trim() || null,
        file: file || null,
      };

      try {
        setIsSubmitting(true);
        show(); // global loading on
        await onSubmit?.(dto);
        // success: reset + close
        resetAll();
        onClose?.();
      } catch (err) {
        // Here you can surface a toast if your design system has one
        console.error(err);
      } finally {
        hide(); // global loading off
        setIsSubmitting(false);
      }
    },
    [
      validateStep2,
      marketId,
      floorId,
      shopId,
      tenantId,
      activity,
      electricityNote,
      ownerAmt,
      marketAmt,
      canEditFranchiseAmt,
      franchAmt,
      dueDay,
      startDate,
      endDate,
      description,
      file,
      onSubmit,
      onClose,
      show,
      hide,
      resetAll,
    ]
  );

  if (!open) return null;

  /* ------------------------------- Render ---------------------------- */

  return (
    <div dir={dir} className="tcm-overlay">
      <div
        className="tcm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="tcm-title"
        onMouseDown={(e) => e.stopPropagation()} // defensive
      >
        {/* Header */}
        <header className="tcm-header">
          <div className="tcm-header-left">
            <h2 id="tcm-title" className="tcm-title">
              ثبت قرارداد{" "}
              <span
                className="tcm-total tcm-total-colored"
                aria-label={`مجموع: ${fmtAF.format(totalMoney)}`}
                title={`مجموع: ${fmtAF.format(totalMoney)}`}
              >
                {fmtAF.format(totalMoney)}
              </span>
            </h2>

            <p className="tcm-sub">{subtitle}</p>
          </div>

          <div className="tcm-header-right">
            <div className="tcm-stepper" aria-hidden>
              <span className={step === 1 ? "is-active" : ""}>1</span>
              <i aria-hidden>—</i>
              <span className={step === 2 ? "is-active" : ""}>2</span>
            </div>
            <Button
              type="button"
              primaryColor={dangerColor}
              iconOnly
              icon={X}
              aria-label="بستن"
              onClick={handleClose}
              disabled={isSubmitting}
            />
          </div>
        </header>

        {/* Body */}
        <form
          className="tcm-body"
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
        >
          {step === 1 && (
            <div className="tcm-grid tcm-grid-step1">
              {/* Market → Floor → Shop */}
              <section className="tcm-card">
                <fieldset className="tcm-fieldset">
                  <legend>مشخصات مکان</legend>
                  <div className="tcm-row">
                    <div className="tcm-field">
                      <label className="tcm-label">مارکیت</label>
                      <SmartSelect
                        options={markets}
                        value={marketId}
                        onChange={(v) => {
                          setMarketId(v);
                          setFloorId("");
                          setShopId("");
                        }}
                        placeholder="مارکیت را انتخاب کنید..."
                        searchable
                        clearable
                        disabled={isSubmitting}
                      />
                      {errors.marketId && (
                        <div className="tcm-error">{errors.marketId}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <label className="tcm-label">طبقه</label>
                      <SmartSelect
                        options={floorOptions}
                        value={floorId}
                        onChange={(v) => {
                          setFloorId(v);
                          setShopId("");
                        }}
                        placeholder={
                          marketId
                            ? "طبقه را انتخاب کنید..."
                            : "اول مارکیت را انتخاب کنید"
                        }
                        searchable
                        clearable
                        disabled={!marketId || isSubmitting}
                      />
                      {errors.floorId && (
                        <div className="tcm-error">{errors.floorId}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <label className="tcm-label">دوکان</label>
                      <SmartSelect
                        options={shopOptions}
                        value={shopId}
                        onChange={setShopId}
                        placeholder={
                          floorId
                            ? "دوکان را انتخاب کنید..."
                            : "اول طبقه را انتخاب کنید"
                        }
                        searchable
                        clearable
                        disabled={!floorId || isSubmitting}
                      />
                      {errors.shopId && (
                        <div className="tcm-error">{errors.shopId}</div>
                      )}
                    </div>
                  </div>
                </fieldset>
              </section>

              {/* Tenant */}
              <section className="tcm-card">
                <fieldset className="tcm-fieldset">
                  <legend>مشخصات مستأجر</legend>
                  <div className="tcm-row">
                    <div className="tcm-field">
                      <label className="tcm-label mt-1">مستأجر</label>
                      <SmartSelect
                        options={tenantOptions}
                        value={tenantId}
                        onChange={setTenantId}
                        placeholder="انتخاب مستأجر..."
                        searchable
                        clearable
                        disabled={isSubmitting}
                      />
                      {errors.tenantId && (
                        <div className="tcm-error">{errors.tenantId}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <Input
                        label="فعالیت تجاری"
                        placeholder="نوع فعالیت تجاری..."
                        value={activity}
                        onChange={setActivity}
                        inputClassName="tcm-input"
                        disabled={isSubmitting}
                      />
                      {errors.activity && (
                        <span className="tcm-error">{errors.activity}</span>
                      )}
                    </div>

                    <div className="tcm-field">
                      <Input
                        label="آخرین قرائت برق"
                        placeholder="آخرین رقم میتر..."
                        type="number"
                        value={electricityNote}
                        onChange={setElectricityNote}
                        inputClassName="tcm-input"
                        disabled={isSubmitting}
                        maxLength={6}
                      />
                      {errors.electricityNote && (
                        <span className="tcm-error">
                          {errors.electricityNote}
                        </span>
                      )}
                    </div>
                  </div>
                </fieldset>
              </section>

              {/* Owner / Market / Franchise amounts */}
              <section className="tcm-card">
                <fieldset className="tcm-fieldset">
                  <legend>تقسیم مبالغ</legend>
                  <div className="tcm-row">
                    <div className="tcm-field">
                      <Input
                        label="سهم مالک"
                        placeholder="مبلغ سهم مالک..."
                        value={ownerAmt}
                        type="number"
                        onChange={setOwnerAmt}
                        inputClassName="tcm-input"
                        disabled={isSubmitting}
                      />
                      {errors.ownerAmt && (
                        <span className="tcm-error">{errors.ownerAmt}</span>
                      )}
                    </div>

                    <div className="tcm-field">
                      <Input
                        label="سهم مارکیت"
                        placeholder="مبلغ سهم مارکیت..."
                        value={marketAmt}
                        type="number"
                        onChange={setMarketAmt}
                        inputClassName="tcm-input"
                        disabled={isSubmitting}
                      />
                      {errors.marketAmt && (
                        <span className="tcm-error">{errors.marketAmt}</span>
                      )}
                    </div>

                    <div className="tcm-field">
                      <Input
                        label="سهم صاحب امتیاز"
                        type="number"
                        placeholder="مبلغ سهم صاحب امتیاز..."
                        value={franchAmt}
                        onChange={setFranchAmt}
                        inputClassName="tcm-input"
                        disabled={!canEditFranchiseAmt || isSubmitting}
                        title={
                          canEditFranchiseAmt
                            ? undefined
                            : "برای این دوکان صاحب امتیاز فعال وجود ندارد"
                        }
                      />
                      {errors.franchAmt && (
                        <span className="tcm-error">{errors.franchAmt}</span>
                      )}
                    </div>

                    <div
                      className="tcm-field tcm-inline-hints"
                      role="status"
                      aria-live="polite"
                    />
                  </div>
                </fieldset>
              </section>
            </div>
          )}

          {step === 2 && (
            <div className="tcm-grid tcm-grid-step2">
              <section className="tcm-card">
                <fieldset className="tcm-fieldset">
                  <legend>زمان‌بندی و مبالغ دوره‌ای</legend>
                  <div className="tcm-row">
                    <div className="tcm-field">
                      <label className="tcm-label">شروع قرارداد</label>
                      <CustomDatePicker
                        mode="single"
                        value={startDate}
                        onChange={setStartDate}
                        calendarMode={calendarMode}
                        placeholder="انتخاب تاریخ"
                        showToggle={false}
                        disabled={isSubmitting}
                      />
                      {errors.startDate && (
                        <div className="tcm-error">{errors.startDate}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <label className="tcm-label">پایان قرارداد</label>
                      <CustomDatePicker
                        mode="single"
                        value={endDate}
                        onChange={setEndDate}
                        minDate={startDate || undefined}
                        disabled={!startDate || isSubmitting}
                        calendarMode={calendarMode}
                        placeholder={
                          startDate
                            ? "تاریخ پایان را انتخاب کنید"
                            : "ابتدا تاریخ شروع را انتخاب کنید"
                        }
                        showToggle={false}
                      />
                      {errors.endDate && (
                        <div className="tcm-error">{errors.endDate}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <Input
                        label="روز پرداخت"
                        type="number"
                        placeholder="1..31"
                        value={dueDay}
                        onChange={(v) =>
                          setDueDay(v === "" ? "" : String(clamp(v, 1, 31)))
                        }
                        inputMode="numeric"
                        inputClassName="tcm-input"
                        disabled={isSubmitting}
                      />
                      <div
                        className="tcm-field tcm-inline-hints"
                        role="status"
                        aria-live="polite"
                      >
                        {errors.dueDay && (
                          <span className="tcm-error">{errors.dueDay}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </section>

              <section className="tcm-card">
                <fieldset className="tcm-fieldset">
                  <legend>ضمائم</legend>
                  <div className="tcm-row tcm-row--split">
                    <div className="tcm-field tcm-field--flex">
                      <label className="tcm-label">توضیحات قرارداد</label>
                      <textarea
                        className="tcm-textarea"
                        rows={3}
                        maxLength={maxDescriptionLength}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="توضیحات مربوط به قرارداد..."
                        aria-invalid={Boolean(errors.description)}
                        disabled={isSubmitting}
                      />
                      <div className="tcm-counter" aria-hidden>
                        {description.length}/{maxDescriptionLength}
                      </div>
                      {errors.description && (
                        <div className="tcm-error">{errors.description}</div>
                      )}
                    </div>

                    <div className="tcm-field">
                      <label className="tcm-label">فایل قرارداد</label>
                      <FilePicker
                        value={file}
                        onChange={(f, err) => {
                          setFile(f);
                          setErrors((p) => ({ ...p, file: err || undefined }));
                        }}
                        accept={accept}
                        maxFileSizeMB={maxFileSizeMB}
                        error={errors.file}
                        chooseLabel="انتخاب فایل"
                        changeLabel="تغییر فایل"
                        removeLabel="حذف فایل"
                        disabled={isSubmitting}
                      />
                      {errors.file && (
                        <div className="tcm-error">{errors.file}</div>
                      )}
                    </div>
                  </div>
                </fieldset>
              </section>
            </div>
          )}

          {/* Footer actions */}
          <footer className="tcm-footer">
            {step === 1 ? (
              <Button
                type="button"
                primaryColor={secondaryColor}
                icon={ArrowBigLeft}
                onClick={handleNext}
                disabled={isSubmitting}
              >
                ادامه بده
              </Button>
            ) : (
              <div className="tcm-actions">
                <Button
                  type="button"
                  primaryColor={secondaryColor}
                  icon={ArrowBigRight}
                  onClick={goBack}
                  disabled={isSubmitting}
                >
                  برگشت
                </Button>
                <Button
                  type="submit"
                  primaryColor={primaryColor}
                  icon={UserCog}
                  disabled={isSubmitting}
                >
                  ثبت قرارداد
                </Button>
              </div>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
}
