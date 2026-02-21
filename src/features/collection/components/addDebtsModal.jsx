import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";

import SmartSelect from "../../../shared/components/SmartSelect";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";

import {
  X,
  ArrowBigLeft,
  ArrowBigRight,
  UserCog,
  BriefcaseBusiness,
  ContactRound,
  HandCoins,
  NotebookPen,
  Trash2,
  ListCheck,
} from "lucide-react";

import { fetchOpenDebtsByContract } from "../../accrual/slices/accrualSlice";

import "../styles/AddDebtsModal.css";

/* ---------------------- Helper functions ---------------------- */

function periodKeyOf(d) {
  const y = d.year;
  const m = String(d.month).padStart(2, "0");
  return `${y}-${m}`;
}

function periodLabelOf(d) {
  if (d.periodLabel) return d.periodLabel;
  const y = d.year;
  const m = String(d.month).padStart(2, "0");
  return `${y}/${m} دوره`;
}

/* --------------------------- Component ------------------------- */

export default function AddDebtsModal({
  open,
  contractId,
  onClose,
  onSubmit,
  dir = "rtl",
  currencySymbol = "؋",
}) {
  const { show, hide } = useGlobalLoading();
  const dispatch = useDispatch();

  const openDebts = useSelector((s) => s.accrual.openDebts || []);
  const openDebtsStatus = useSelector((s) => s.accrual.openDebtsStatus);
  const openDebtsError = useSelector((s) => s.accrual.openDebtsError || null);

  
  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  const loadingDebts = openDebtsStatus === "loading";

  // Modal açıldığında ve contractId varken borçları getir
  useEffect(() => {
    if (open && contractId) {
      dispatch(fetchOpenDebtsByContract(contractId));
    }
  }, [open, contractId, dispatch]);

  /* ---------------------------- Step control ---------------------------- */

  const [step, setStep] = useState(1);
  const goNext = () => setStep(2);
  const goBack = () => setStep(1);

  const [isSubmitting, setIsSubmitting] = useState(false);

  /* -------------------------- Step 1 state ------------------------------ */

  // SmartSelect single-select: value primitive (örn. "cash", "bank", "transfer")
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState(""); // string
  const [description, setDescription] = useState("");

  const numericPaymentAmount = useMemo(
    () => (Number(amount) > 0 ? Number(amount) : 0),
    [amount]
  );

  /* -------------------------- Step 2 state ------------------------------ */

  const periodsMap = useMemo(() => {
    const map = new Map();
    (openDebts || []).forEach((d) => {
      const key = periodKeyOf(d);
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: periodLabelOf(d),
          debts: [],
        });
      }
      map.get(key).debts.push(d);
    });
    return map;
  }, [openDebts]);

  const periodList = useMemo(() => {
    const arr = Array.from(periodsMap.values());
    arr.sort((a, b) => (a.key > b.key ? 1 : a.key < b.key ? -1 : 0));
    return arr;
  }, [periodsMap]);

  const [selectedPeriodKey, setSelectedPeriodKey] = useState(null);

  // Borçlar geldiğinde varsayılan dönem (en eski) seç
  useEffect(() => {
    if (!selectedPeriodKey && periodList.length > 0) {
      setSelectedPeriodKey(periodList[0].key);
    }
  }, [selectedPeriodKey, periodList]);

  const debtsForSelectedPeriod = useMemo(() => {
    if (!selectedPeriodKey) return [];
    const entry = periodsMap.get(selectedPeriodKey);
    return entry ? entry.debts : [];
  }, [periodsMap, selectedPeriodKey]);

  // debtId -> allocationAmount
  const [allocations, setAllocations] = useState({});

  const debtById = useMemo(() => {
    const map = {};
    (openDebts || []).forEach((d) => {
      const id = d.debtId || d.accrualId;
      if (!id) return;
      map[id] = d;
    });
    return map;
  }, [openDebts]);

  const totalAllocated = useMemo(() => {
    return Object.values(allocations).reduce(
      (sum, v) => sum + (Number(v) || 0),
      0
    );
  }, [allocations]);

  const remainingAmount = useMemo(
    () => numericPaymentAmount - totalAllocated,
    [numericPaymentAmount, totalAllocated]
  );

  const KIND = {
  Electricity: 1,
  Market: 2,
  Owner: 3,
  Franchise: 4,
};

function getKindLabel(kind) {
  switch (kind) {
    case KIND.Electricity:
      return "مصرف برق";
    case KIND.Market:
      return "سهم مارکیت";
    case KIND.Owner:
      return "سهم مالک";
    case KIND.Franchise:
      return "سهم امتیاز";
    default:
      return "سایر";
  }
}

  // 2. adım için: "to-do list" – dönem + tür kırılımında satırlar
  const allocationItemsByPeriod = useMemo(() => {
    const groups = new Map();

    Object.entries(allocations).forEach(([debtId, rawAmount]) => {
      const amount = Number(rawAmount) || 0;
      if (!amount) return;

      const debt = debtById[debtId];
      if (!debt) return;

      const periodKey = periodKeyOf(debt);
      const periodEntry = periodsMap.get(periodKey);
      const periodLabel = periodEntry ? periodEntry.label : periodKey;

      if (!groups.has(periodKey)) {
        groups.set(periodKey, {
          periodKey,
          periodLabel,
          items: [],
        });
      }

      groups.get(periodKey).items.push({
        debtId,
        kind: debt.kind,
        kindLabel: getKindLabel(debt.kind),
        amount,
      });
    });

    const result = Array.from(groups.values());
    // dönemleri sırala (eski → yeni)
    result.sort((a, b) =>
      a.periodKey > b.periodKey ? 1 : a.periodKey < b.periodKey ? -1 : 0
    );
    return result;
  }, [allocations, debtById, periodsMap]);

  /* ----------------------- Derived totals for Step 1 -------------------- */

  const currentPeriodEntry = useMemo(() => {
    if (periodList.length === 0) return null;
    // en yeni dönem
    return periodList[periodList.length - 1];
  }, [periodList]);

  const totalOldDebt = useMemo(() => {
    if (!currentPeriodEntry) return 0;
    const currentKey = currentPeriodEntry.key;
    return (openDebts || [])
      .filter((d) => periodKeyOf(d) !== currentKey)
      .reduce((sum, d) => sum + (d.outstandingAmount || 0), 0);
  }, [openDebts, currentPeriodEntry]);

  const totalCurrentDebt = useMemo(() => {
    if (!currentPeriodEntry) return 0;
    const currentKey = currentPeriodEntry.key;
    return (openDebts || [])
      .filter((d) => periodKeyOf(d) === currentKey)
      .reduce((sum, d) => sum + (d.outstandingAmount || 0), 0);
  }, [openDebts, currentPeriodEntry]);


  const totalDebt = totalOldDebt + totalCurrentDebt;

  const currentPeriodDebts = useMemo(() => {
    if (!currentPeriodEntry) return [];
    return currentPeriodEntry.debts || [];
  }, [currentPeriodEntry]);

  const sumByKind = useCallback(
    (kind) =>
      currentPeriodDebts
        .filter((d) => d.kind === kind)
        .reduce((sum, d) => sum + (d.outstandingAmount || 0), 0),
    [currentPeriodDebts]
  );

  /* ----------------------------- Payment methods ------------------------ */

  const paymentMethodsOptions = useMemo(
    () => [
      { value: "cash", label: "نقده حضوری" },
      { value: "bank", label: "ازطریق بانک" },
      { value: "transfer", label: "از طریق حواله" },
    ],
    []
  );

  const paymentMethodLabel = useMemo(() => {
    if (!paymentMethod) return null;
    const found = paymentMethodsOptions.find(
      (m) => m.value === paymentMethod
    );
    return found ? found.label : null;
  }, [paymentMethod, paymentMethodsOptions]);

  /* ---------------------------- Currency formatter ---------------------- */

  const fmt = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 0,
      }),
    []
  );

  /* ------------------------------- Reset / Validation ------------------- */

  const [step1Errors, setStep1Errors] = useState({});
  const [step2Error, setStep2Error] = useState(null);

  const resetAll = useCallback(() => {
    setStep(1);
    setPaymentMethod(null);
    setReference("");
    setAmount("");
    setDescription("");
    setSelectedPeriodKey(null);
    setAllocations({});
    setStep1Errors({});
    setStep2Error(null);
  }, []);

  /* ------------------------------ Subtitle ------------------------------ */

  const subtitle =
    step === 1
      ? "مبلغ پرداخت و معلومات ابتدائی"
      : "تقسیمات مبلغ پرداخته شده بر دوره‌ها و انواع باقی‌داری";

  /* ----------------------------- Close handling ------------------------- */

  const handleClose = useCallback(() => {
    resetAll();
    if (onClose) onClose();
  }, [onClose, resetAll]);

  useEffect(() => {
    if (!open) {
      resetAll();
      hide();
    }
  }, [open, resetAll, hide]);

  /* ----------------------------- Validation ----------------------------- */

  const validateStep1 = useCallback(() => {
    const errors = {};

    if (!numericPaymentAmount || numericPaymentAmount <= 0) {
      errors.amount = "مبلغ پرداخت باید بزرگ‌تر از صفر باشد.";
    }

    if (!paymentMethod) {
      errors.paymentMethod = "نوع پرداخت را انتخاب کنید.";
    }

    if (!reference.trim()) {
      errors.reference = "رپرانس نمی‌تواند خالی باشد.";
    }

    setStep1Errors(errors);
    return Object.keys(errors).length === 0;
  }, [numericPaymentAmount, paymentMethod, reference]);

  const validateStep2 = useCallback(() => {
    if (numericPaymentAmount <= 0) {
      setStep2Error("مبلغ پرداخت معتبر نیست.");
      return false;
    }
    if (totalAllocated <= 0) {
      setStep2Error("هیچ مبلغی به هیچ باقی‌داری تخصیص داده نشده است.");
      return false;
    }
    // Borca tamamen kapatma zorunlu değil (ön ödeme olabilir)
    setStep2Error(null);
    return true;
  }, [numericPaymentAmount, totalAllocated]);

  /* ----------------------------- Handlers ------------------------------- */

  const handleNext = useCallback(() => {
    if (validateStep1()) {
      goNext();
    }
  }, [validateStep1]);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateStep2()) return;

      try {
        setIsSubmitting(true);
        show();

        const allocationsArray = Object.entries(allocations)
          .filter(([_, v]) => Number(v) > 0)
          .map(([debtId, v]) => ({
            debtId,
            amount: Number(v),
          }));

        const dto = {
          contractId,
          payment: {
            method: paymentMethod || null,
            methodLabel: paymentMethodLabel,
            reference: reference.trim(),
            amount: numericPaymentAmount,
            description: description.trim(),
          },
          allocations: allocationsArray,
        };

        if (onSubmit) {
          await onSubmit(dto);
        }

        resetAll();
        if (onClose) onClose();
      } catch (err) {
        console.error(err);
      } finally {
        hide();
        setIsSubmitting(false);
      }
    },
    [
      allocations,
      paymentMethod,
      paymentMethodLabel,
      reference,
      numericPaymentAmount,
      description,
      contractId,
      onSubmit,
      onClose,
      validateStep2,
      show,
      hide,
      resetAll,
    ]
  );

  // Input componentine value geliyor
  const handleAmountChange = (val) => {
    if (val === "") {
      setAmount("");
      return;
    }
    const num = Number(val);
    if (Number.isNaN(num) || num < 0) return;
    setAmount(val);
  };

  const handleAllocationChange = (debtId, rawValue) => {
    const str = rawValue;
    if (str === "") {
      setAllocations((prev) => ({
        ...prev,
        [debtId]: 0,
      }));
      return;
    }

    let requested = Number(str);
    if (Number.isNaN(requested)) return;
    if (requested < 0) requested = 0;

    const debt = debtById[debtId];
    const outstanding =
      debt && debt.outstandingAmount ? debt.outstandingAmount : 0;

    const currentTotal = totalAllocated;
    const oldValue = allocations[debtId] || 0;
    const otherAllocated = currentTotal - oldValue;

    const maxGlobal = Math.max(
      0,
      numericPaymentAmount - otherAllocated
    );
    const maxLocal = outstanding;

    const maxAllowed = Math.max(0, Math.min(maxGlobal, maxLocal));

    const nextValue = Math.min(
      Math.max(0, requested),
      maxAllowed
    );

    setAllocations((prev) => ({
      ...prev,
      [debtId]: nextValue,
    }));
  };

  if (!open) return null;

  /* ------------------------------- Render ---------------------------- */

  return (
    <div dir={dir} className="adddebts-overlay">
      <div
        className="adddebts-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adddebts-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="adddebts-header">
          <div className="adddebts-header-main">
            <h2 id="adddebts-title" className="adddebts-title">
              ثبت باقی‌داری{" "}
              <span className="adddebts-title-highlight">
                {fmt.format(totalDebt)} {currencySymbol}
              </span>
            </h2>
            <p className="adddebts-subtitle">{subtitle}</p>
          </div>

          <div className="adddebts-header-right">
            <div className="adddebts-stepper" aria-hidden>
              <span className={step === 1 ? "is-active" : ""}>1</span>
              <span className="adddebts-stepper-separator">—</span>
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
          className="adddebts-body"
          onSubmit={handleSubmit}
          aria-busy={isSubmitting}
        >
          {/* STEP 1 */}
          {step === 1 && (
            <div className="adddebts-content adddebts-content--two-cols">
              {/* Sol sütun: Form */}
              <section className="adddebts-card adddebts-card--form">
                <div className="adddebts-form-grid">
                  <div className="adddebts-field adddebts-field--full">
                    <SmartSelect
                      options={paymentMethodsOptions}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      placeholder="نوع پرداخت را انتخاب کنید"
                      clearable
                      searchable
                      size="md"
                      icon={BriefcaseBusiness}
                      error={step1Errors.paymentMethod}
                      helperText={step1Errors.paymentMethod}
                    />
                  </div>

                  <div className="adddebts-field adddebts-field--full">
                    <Input
                      icon={HandCoins}
                      label="مبلغ پرداخت:"
                      type="number"
                      name="amount"
                      value={amount}
                      onChange={handleAmountChange}
                      placeholder="مبلغ"
                      error={step1Errors.amount}
                    />
                  </div>

                  <div className="adddebts-field adddebts-field--full">
                    <Input
                      icon={ContactRound}
                      label="رپرانس:"
                      type="text"
                      name="reference"
                      value={reference}
                      onChange={setReference}
                      placeholder="رپرانس"
                      maxLength={100}
                      error={step1Errors.reference}
                    />
                  </div>

                  <div className="adddebts-field adddebts-field--full">
                    <Input
                      multiline
                      rows={3}
                      type="text"
                      icon={NotebookPen}
                      label="نوضیحات:"
                      name="description"
                      value={description}
                      onChange={setDescription}
                      placeholder="..."
                    />
                  </div>
                </div>
              </section>

              {/* Sağ sütun: Özet kartları */}
              <section className="adddebts-card adddebts-card--summary">
                <div className="adddebts-summary-main">
                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      مجموع باقی‌داری
                    </span>
                    <span className="adddebts-summary-value adddebts-summary-value--em">
                      {fmt.format(totalDebt)} {currencySymbol}
                    </span>
                  </div>

                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      جمله باقی‌داری دوره‌های گذشته
                    </span>
                    <span className="adddebts-summary-value">
                      {fmt.format(totalOldDebt)} {currencySymbol}
                    </span>
                  </div>

                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      جمله باقی‌داری این دوره
                    </span>
                    <span className="adddebts-summary-value">
                      {fmt.format(totalCurrentDebt)} {currencySymbol}
                    </span>
                  </div>
                </div>

                <div className="adddebts-divider" />

                <div className="adddebts-summary-section">
                  <h3 className="adddebts-summary-title">تفصیل دوره فعلی</h3>

                  {currentPeriodEntry ? (
                    <div className="adddebts-summary-list">
                      <div className="adddebts-summary-row">
                        <span className="adddebts-summary-label">دوره</span>
                        <span className="adddebts-summary-value">
                          {currentPeriodEntry.label}
                        </span>
                      </div>
                        <div className="adddebts-summary-row">
                          <span className="adddebts-summary-label">مصرف برق</span>
                          <span className="adddebts-summary-value">
                            {fmt.format(sumByKind(KIND.Electricity))} {currencySymbol}
                          </span>
                        </div>

                        <div className="adddebts-summary-row">
                          <span className="adddebts-summary-label">سهم مالک</span>
                          <span className="adddebts-summary-value">
                            {fmt.format(sumByKind(KIND.Owner))} {currencySymbol}
                          </span>
                        </div>

                        <div className="adddebts-summary-row">
                          <span className="adddebts-summary-label">سهم مارکیت</span>
                          <span className="adddebts-summary-value">
                            {fmt.format(sumByKind(KIND.Market))} {currencySymbol}
                          </span>
                        </div>

                        <div className="adddebts-summary-row">
                          <span className="adddebts-summary-label">سهم امتیاز</span>
                          <span className="adddebts-summary-value">
                            {fmt.format(sumByKind(KIND.Franchise))} {currencySymbol}
                          </span>
                        </div>


                    </div>
                  ) : (
                    <p className="adddebts-summary-empty">
                      هیچ دوره‌ای موجود نیست
                    </p>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="adddebts-content adddebts-content--two-cols">
              {/* Sol: dönem seçimi + satırlar */}
              <section className="adddebts-card adddebts-card--form">
                <div className="adddebts-field">
                  <SmartSelect
                    options={periodList.map((p) => ({
                      value: p.key,
                      label: p.label,
                    }))}
                    // value: sadece key (string)
                    value={selectedPeriodKey}
                    onChange={(val) =>
                      setSelectedPeriodKey(val || null)
                    }
                    placeholder="دوره باقی‌داری را انتخاب کنید"
                    clearable={false}
                    searchable
                    size="md"
                  />
                </div>

                <div className="adddebts-debts-list">
                  {loadingDebts ? (
                    <p className="adddebts-text-muted">
                      در حال دریافت معلومات باقی‌داری...
                    </p>
                  ) : openDebtsError ? (
                    <p className="adddebts-text-error">
                      خطا در دریافت معلومات باقی‌داری
                    </p>
                  ) : debtsForSelectedPeriod.length === 0 ? (
                    <p className="adddebts-text-muted">
                      برای این دوره باقی‌داری ثبت نشده است.
                    </p>
                  ) : (
                    debtsForSelectedPeriod.map((d) => {
                      const id = d.debtId || d.accrualId;
                      const value = allocations[id] ?? 0;

                      return (
                        <div key={id} className="adddebts-debt-row">
                          <div className="adddebts-debt-input">
                            <Input
                              type="number"
                              label={`${getKindLabel(d.kind)} (${fmt.format(
                                d.outstandingAmount
                              )} ${currencySymbol} باقی)`}
                              value={value === 0 ? "" : String(value)}
                              onChange={(val) =>
                                handleAllocationChange(id, val)
                              }
                              placeholder={`${fmt.format(d.outstandingAmount || 0)} ${currencySymbol}`}

                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Sağ: Ödeme özeti + hangi borca ne kadar ayrıldı */}
              <section className="adddebts-card adddebts-card--summary">
                <div className="adddebts-summary-main">
                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      مبلغ پرداخت شده
                    </span>
                    <span className="adddebts-summary-value adddebts-summary-value--em">
                      {fmt.format(numericPaymentAmount)}{" "}
                      {currencySymbol}
                    </span>
                  </div>

                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      مجموع تخصیص یافته
                    </span>
                    <span className="adddebts-summary-value">
                      {fmt.format(totalAllocated)} {currencySymbol}
                    </span>
                  </div>

                  <div className="adddebts-summary-row">
                    <span className="adddebts-summary-label">
                      مبلغ باقی مانده برای تخصیص
                    </span>
                    <span className="adddebts-summary-value">
                      {fmt.format(
                        remainingAmount > 0 ? remainingAmount : 0
                      )}{" "}
                      {currencySymbol}
                    </span>
                  </div>
                </div>

                {step2Error && (
                  <p className="adddebts-text-error adddebts-step2-error">
                    {step2Error}
                  </p>
                )}

                <div className="adddebts-divider" />

                <div className="adddebts-summary-section adddebts-summary-section--allocations">
                  <h3 className="adddebts-summary-title">
                    تفصیل تخصیص‌ها
                  </h3>

                  {allocationItemsByPeriod.length === 0 ? (
                    <p className="adddebts-summary-empty">
                      تا حالا هیچ تخصیصی ثبت نشده است.
                    </p>
                  ) : (
                    <div className="adddebts-summary-list adddebts-summary-list--todo">
                      {allocationItemsByPeriod.map((group) => (
                        <div
                          key={group.periodKey}
                          className="adddebts-summary-group"
                        >
                          {/* Dönem başlığı */}
                          <div className="adddebts-summary-row adddebts-summary-row--group">
                            <span className="adddebts-summary-label">
                              دوره
                            </span>
                            <span className="adddebts-summary-value">
                              {group.periodLabel}
                            </span>
                          </div>

                          {/* To-do satırları */}
                          <ul className="adddebts-todo">
                            {group.items.map((item) => (
                              <li
                                key={item.debtId}
                                className="adddebts-todo-item"
                              >
                                <span className="adddebts-todo-line">
                                  {item.kindLabel}{" "}
                                  {fmt.format(item.amount)} {currencySymbol} پرداخت شد
                                </span>

                                <Button
                                  type="button"
                                  primaryColor={dangerColor}
                                  iconOnly
                                  icon={Trash2}
                                  aria-label="حذف تخصیص"
                                  onClick={() =>
                                    handleAllocationChange(item.debtId, 0)
                                  }
                                  disabled={isSubmitting}
                                  size="sm"
                                />
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* Footer actions */}
          <footer className="adddebts-footer">
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
              <div className="adddebts-footer-actions">
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
                  icon={ListCheck}
                  disabled={isSubmitting}
                >
                  ثبت پرداخت
                </Button>
              </div>
            )}
          </footer>
        </form>
      </div>
    </div>
  );
}