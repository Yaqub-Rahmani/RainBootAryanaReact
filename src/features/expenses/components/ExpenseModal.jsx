import React, { useEffect, useMemo, useRef, useState } from "react";
import "../styles/ExpenseModal.css";

import {
  X,
  Check,
  Wallet,
  Calendar,
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  Layers,
  FolderTree,
  User,
  FileText,
} from "lucide-react";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import SmartSelect from "../../../shared/components/SmartSelect";
import CustomDatePicker from "../../../shared/date/CustomDatePicker";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { expenseService } from "../services/expenseService";

/* ----------------------------- Helpers ----------------------------- */
const normalize = (opt) => (opt?.value ?? opt ?? null);

const toISODate = (d) => {
  if (!d) return null;
  if (typeof d === "string") return String(d).slice(0, 10);
  if (d?.toDate) return d.toDate().toISOString().slice(0, 10);
  if (d instanceof Date) return d.toISOString().slice(0, 10);
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

// Robust mapper (supports camelCase + PascalCase)
const getId = (x) => String(x?.id ?? x?.Id ?? "");
const getName = (x) => x?.name ?? x?.Name ?? "";
const getCurrency = (x) => Number(x?.currency ?? x?.Currency ?? 1); // 1=AFN,2=USD

/* ----------------------------- Enums (Backend) ----------------------------- */
const DIRECTION = { IN: 1, OUT: 2 };

const PAYMENT_METHOD = {
  CASH: 1,
  BANK_TRANSFER: 2,
  POS: 3,
  CHEQUE: 4,
  OTHER: 9,
};

const EXPENSE_CATEGORY = {
  SALARY: 1,
  STAFF_FOOD: 2,

  DAILY_MARKET_EXPENSE: 10,
  GOODS_AND_SUPPLIES: 11,
  OFFICE: 12,
  UTILITIES: 13,

  MAINTENANCE: 20,
  CONSUMABLES: 30,
  TRANSPORT_RENT: 40,
  PENALTIES_AND_FEES: 50,

  OTHER: 99,
};

const EXPENSE_SOURCE = {
  MARKET_SHARE: 1,
  MARKET_RESERVE: 2,
  OWNER_RESERVE: 3,
  ELECTRICITY_RESERVE: 4,
};

const emptyForm = {
  id: "",
  displayName: "",
  amount: "",

  direction: String(DIRECTION.OUT),
  category: null,
  source: null,
  paymentMethod: null,

  employeeId: null,
  notes: "",
  moneyAccountId: null,
  occurredAt: new Date(),
};

export default function ExpenseModal({
  open,
  dir = "rtl",

  onClose,
  onSaved,
  initial,

  employees = [],
  moneyAccounts = [],

  disabled = false,

  submitLabel = "ذخیره",
  closeLabel = "بستن",
  hint,
}) {
  const isEdit = Boolean(initial?.id);
  const closeBtnRef = useRef(null);
  const { show, hide } = useGlobalLoading();

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(null);

  const [localMoneyAccounts, setLocalMoneyAccounts] = useState([]);
  const [form, setForm] = useState({ ...emptyForm });

  /* ----------------------------- Init / Reset ----------------------------- */
  useEffect(() => {
    if (!open) return;

    setSubmitted(false);
    setError("");
    setBalance(null);

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    if (!isEdit) {
      setForm({ ...emptyForm });
      return () => document.removeEventListener("keydown", onKey);
    }

    setForm({
      ...emptyForm,
      id: String(initial.id ?? ""),
      displayName: initial.displayName ?? "",
      amount: initial.amount != null ? String(initial.amount) : "",

      direction:
        initial.direction != null ? String(initial.direction) : String(DIRECTION.OUT),
      category: initial.category != null ? String(initial.category) : null,
      source: initial.source != null ? String(initial.source) : null,
      paymentMethod: initial.paymentMethod != null ? String(initial.paymentMethod) : null,

      employeeId: initial.employeeId ? String(initial.employeeId) : null,
      notes: initial.notes ?? "",
      moneyAccountId: initial.moneyAccountId ? String(initial.moneyAccountId) : null,
      occurredAt: initial.occurredAtUtc ? new Date(initial.occurredAtUtc) : new Date(),
    });

    return () => document.removeEventListener("keydown", onKey);
  }, [open, isEdit, initial, onClose]);

  /* ----------------------------- MoneyAccounts sync + fallback load ----------------------------- */
  useEffect(() => {
    setLocalMoneyAccounts(Array.isArray(moneyAccounts) ? moneyAccounts : []);
  }, [moneyAccounts]);

  useEffect(() => {
    if (!open) return;
    if ((localMoneyAccounts?.length ?? 0) > 0) return;

    let alive = true;

    (async () => {
      try {
        const acc = await expenseService.getMoneyAccounts(true);
        if (!alive) return;

        const list = Array.isArray(acc) ? acc : acc?.items ?? acc?.data ?? [];
        setLocalMoneyAccounts(Array.isArray(list) ? list : []);
      } catch {
        if (!alive) return;
        setLocalMoneyAccounts([]);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ----------------------------- Derived: selected account / currency ----------------------------- */
  const selectedAccount = useMemo(() => {
    if (!form.moneyAccountId) return null;
    const id = String(form.moneyAccountId);
    return (localMoneyAccounts || []).find((x) => getId(x) === id) || null;
  }, [form.moneyAccountId, localMoneyAccounts]);

  const currencyLabel = useMemo(() => {
    if (!selectedAccount) return "";
    return getCurrency(selectedAccount) === 2 ? "USD" : "؋";
  }, [selectedAccount]);

  /* ----------------------------- Options ----------------------------- */
  const moneyAccountOptions = useMemo(
    () =>
      (localMoneyAccounts || [])
        .map((x) => ({
          value: getId(x),
          label: `${getName(x)} (${getCurrency(x) === 2 ? "USD" : "؋"})`,
        }))
        .filter((x) => x.value),
    [localMoneyAccounts]
  );

  const employeeOptions = useMemo(
    () =>
      (employees || []).map((x) => ({
        value: String(x.id ?? x.Id ?? ""),
        label:
          x.displayName ??
          x.DisplayName ??
          x.name ??
          x.Name ??
          String(x.id ?? x.Id ?? ""),
      })),
    [employees]
  );

  const directionOptions = useMemo(
    () => [
      { value: String(DIRECTION.OUT), label: "خروج (مصرف)" },
      { value: String(DIRECTION.IN), label: "ورود (برگشت/ریـفاند)" },
    ],
    []
  );

  const paymentMethodOptions = useMemo(
    () => [
      { value: String(PAYMENT_METHOD.CASH), label: "نقده حضوری" },
      { value: String(PAYMENT_METHOD.BANK_TRANSFER), label: "ازطریق بانک" },
      { value: String(PAYMENT_METHOD.POS), label: "از طریق حواله" },
      { value: String(PAYMENT_METHOD.OTHER), label: "نا مشخص" },
    ],
    []
  );

  const categoryOptions = useMemo(
    () => [
      { value: String(EXPENSE_CATEGORY.SALARY), label: "معاش کارمند" },
      { value: String(EXPENSE_CATEGORY.STAFF_FOOD), label: "نان و چای کارمندان" },
      { value: String(EXPENSE_CATEGORY.DAILY_MARKET_EXPENSE), label: "مصارف روزانه مارکیت" },
      { value: String(EXPENSE_CATEGORY.GOODS_AND_SUPPLIES), label: "خریداری جنس و لوازم" },
      { value: String(EXPENSE_CATEGORY.OFFICE), label: "مصارف دفتر و اداری" },
      { value: String(EXPENSE_CATEGORY.UTILITIES), label: "بل‌ها: برق، آب، تلفن و انترنت" },
      { value: String(EXPENSE_CATEGORY.MAINTENANCE), label: "ترمیم، تعمیرات" },
      { value: String(EXPENSE_CATEGORY.CONSUMABLES), label: "مواد مصرفی و سوختنی" },
      { value: String(EXPENSE_CATEGORY.TRANSPORT_RENT), label: "کرایه ترانسپورت" },
      { value: String(EXPENSE_CATEGORY.PENALTIES_AND_FEES), label: "جریمه و فیس‌ها" },
      { value: String(EXPENSE_CATEGORY.OTHER), label: "دیگر مصارف" },
    ],
    []
  );

  const sourceOptions = useMemo(
    () => [
      { value: String(EXPENSE_SOURCE.MARKET_SHARE), label: "سهم مارکیت" },
      { value: String(EXPENSE_SOURCE.MARKET_RESERVE), label: "ریزرف مارکیت" },
      { value: String(EXPENSE_SOURCE.OWNER_RESERVE), label: "ریزرف مالک" },
      { value: String(EXPENSE_SOURCE.ELECTRICITY_RESERVE), label: "ریزرف برق" },
    ],
    []
  );

  /* ----------------------------- Balance fetch ----------------------------- */
  useEffect(() => {
    if (!open) return;

    if (!form.moneyAccountId) {
      setBalance(null);
      return;
    }

    let alive = true;

    (async () => {
      try {
        const b = await expenseService.getMoneyAccountBalance(String(form.moneyAccountId));
        if (!alive) return;

        const n = typeof b === "number" ? b : Number(b);
        setBalance(Number.isFinite(n) ? n : null);
      } catch {
        if (!alive) return;
        setBalance(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [open, form.moneyAccountId]);

  /* ----------------------------- Validation ----------------------------- */
  const amountNum = parseAmount(form.amount);
  const isOut = String(form.direction) === String(DIRECTION.OUT);

  const maxPayable =
    !isEdit && isOut && balance != null && Number.isFinite(Number(balance))
      ? Number(balance)
      : null;

  const titleMissing = !form.displayName?.trim();
  const amountMissing = form.amount == null || String(form.amount).trim() === "";
  const amountNonPositive = amountNum == null || amountNum <= 0;

  const accountMissing = !form.moneyAccountId;
  const directionMissing = !form.direction;
  const categoryMissing = !form.category;
  const sourceMissing = !form.source;
  const paymentMissing = !form.paymentMethod;

  const dateMissing = !toISODate(form.occurredAt);
  const employeeMissing =
    String(form.category) === String(EXPENSE_CATEGORY.SALARY) && !form.employeeId;

  const exceedsMax =
    maxPayable != null &&
    amountNum != null &&
    Number.isFinite(maxPayable) &&
    Number.isFinite(amountNum) &&
    amountNum > maxPayable;

  const isValid =
    !titleMissing &&
    !amountMissing &&
    !amountNonPositive &&
    !accountMissing &&
    !directionMissing &&
    !categoryMissing &&
    !sourceMissing &&
    !paymentMissing &&
    !employeeMissing &&
    !exceedsMax &&
    !dateMissing;

  const showErrors = submitted;

  /* ----------------------------- Payload ----------------------------- */
  const buildPayload = () => {
    const iso = toISODate(form.occurredAt);
    const occurredAtUtc = iso ? `${iso}T00:00:00Z` : null;

    return {
      id: isEdit ? String(form.id) : undefined,
      displayName: form.displayName.trim(),
      amount: amountNum,

      direction: Number(form.direction),
      category: Number(form.category),
      source: Number(form.source),
      paymentMethod: Number(form.paymentMethod),

      employeeId: form.employeeId ? String(form.employeeId) : null,
      notes: form.notes?.trim() ? form.notes.trim() : null,
      moneyAccountId: String(form.moneyAccountId),

      occurredAtUtc,
    };
  };

  /* ----------------------------- Submit ----------------------------- */
  const handleSubmit = async () => {
    setSubmitted(true);
    if (!isValid || submitting || disabled) return;

    setSubmitting(true);
    setError("");
    show();

    try {
      const payload = buildPayload();

      if (isEdit) {
        await expenseService.update(String(form.id), payload);
      } else {
        await expenseService.create(payload);
      }

      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data ??
        err?.message ??
        "خطا در ذخیره.";
      setError(String(msg));
    } finally {
      setSubmitting(false);
      hide();
    }
  };

  if (!open) return null;

  const modalTitle = isEdit ? "ویرایش مصرف" : "ثبت مصرف";

  return (
    <div className="exm__overlay" role="dialog" aria-modal="true" aria-label={modalTitle}>
      <div className="exm__modal" dir={dir} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="exm__header">
          <div className="exm__titleWrap">
            <div className="exm__titleRow">
              <div className="exm__title">{modalTitle}</div>

              {maxPayable != null ? (
                <div className={"exm__capBadge" + (showErrors && exceedsMax ? " is-danger" : "")}>
                  حداکثر قابل برداشت: {Number(maxPayable).toLocaleString("en-US")}{" "}
                  {currencyLabel || "—"}
                </div>
              ) : null}
            </div>

            {hint ? <div className="exm__hint">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={onClose}
            title={closeLabel}
            disabled={disabled || submitting}
            primaryColor={"var(--role-danger-bg)"}
          />
        </div>

        {/* Body */}
        <div className="exm__body">
          <div className="exm__grid">
            {/* Money Account */}
            <div className={"exm__field" + (showErrors && accountMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <Wallet size={16} />
                  </span>
                  حساب پولی <span className="exm__req">*</span>
                </label>

                {balance != null ? (
                  <span className="exm__meta">
                    موجودی: {Number(balance).toLocaleString("en-US")} {currencyLabel || "—"}
                  </span>
                ) : null}
              </div>

              <div className="exm__control">
                <SmartSelect
                  options={moneyAccountOptions}
                  value={form.moneyAccountId}
                  onChange={(opt) => {
                    const v = normalize(opt);
                    setForm((f) => ({ ...f, moneyAccountId: v != null ? String(v) : null }));
                  }}
                  placeholder="انتخاب حساب..."
                  clearable
                  searchable
                  disabled={disabled || submitting}
                />
              </div>

              {moneyAccountOptions.length === 0 ? (
                <div className="exm__warn">
                  هیچ حسابی موجود نیست یا اطلاعات حساب‌ها بارگذاری نشده است.
                </div>
              ) : null}

              {showErrors && accountMissing ? (
                <div className="exm__error" role="alert">
                  حساب پولی را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Title */}
            <div className={"exm__field" + (showErrors && titleMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <FileText size={16} />
                  </span>
                  عنوان <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control">
                <Input
                  value={form.displayName ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, displayName: v }))}
                  placeholder="مثال: کرایه ترانسپورت"
                  label={null}
                  autoComplete="off"
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && titleMissing ? (
                <div className="exm__error" role="alert">
                  عنوان را وارد کنید.
                </div>
              ) : null}
            </div>

            {/* Amount */}
            <div
              className={
                "exm__field" +
                (showErrors && (amountMissing || amountNonPositive || exceedsMax) ? " is-invalid" : "")
              }
            >
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <CreditCard size={16} />
                  </span>
                  مبلغ <span className="exm__req">*</span>
                </label>
                {currencyLabel ? <span className="exm__meta">{currencyLabel}</span> : null}
              </div>

              <div className="exm__control">
                <Input
                  type="number"
                  value={form.amount ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
                  placeholder={currencyLabel ? `مبلغ (${currencyLabel})` : "مبلغ"}
                  label={null}
                  autoComplete="off"
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && amountMissing ? (
                <div className="exm__error" role="alert">
                  مبلغ را وارد کنید.
                </div>
              ) : null}

              {showErrors && !amountMissing && amountNonPositive ? (
                <div className="exm__error" role="alert">
                  مبلغ باید بزرگ‌تر از 0 باشد.
                </div>
              ) : null}

              {showErrors && exceedsMax ? (
                <div className="exm__error" role="alert">
                  مبلغ نباید بیشتر از {Number(maxPayable).toLocaleString("en-US")}{" "}
                  {currencyLabel || ""} باشد.
                </div>
              ) : null}
            </div>

            {/* Date */}
            <div className={"exm__field" + (showErrors && dateMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <Calendar size={16} />
                  </span>
                  تاریخ <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control exm__date">
                <CustomDatePicker
                  mode="single"
                  value={form.occurredAt}
                  onChange={(v) => setForm((f) => ({ ...f, occurredAt: v }))}
                  placeholder="انتخاب تاریخ..."
                  showToggle={false}
                />
              </div>

              {showErrors && dateMissing ? (
                <div className="exm__error" role="alert">
                  تاریخ را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Direction */}
            <div className={"exm__field" + (showErrors && directionMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    {isOut ? <ArrowDownCircle size={16} /> : <ArrowUpCircle size={16} />}
                  </span>
                  نوع <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control">
                <SmartSelect
                  options={directionOptions}
                  value={form.direction}
                  onChange={(opt) => {
                    const v = normalize(opt);
                    setForm((f) => ({ ...f, direction: v != null ? String(v) : null }));
                  }}
                  placeholder="انتخاب..."
                  clearable={false}
                  searchable={false}
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && directionMissing ? (
                <div className="exm__error" role="alert">
                  نوع را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Payment method */}
            <div className={"exm__field" + (showErrors && paymentMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <CreditCard size={16} />
                  </span>
                  روش پرداخت <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control">
                <SmartSelect
                  options={paymentMethodOptions}
                  value={form.paymentMethod}
                  onChange={(opt) => {
                    const v = normalize(opt);
                    setForm((f) => ({ ...f, paymentMethod: v != null ? String(v) : null }));
                  }}
                  placeholder="انتخاب روش..."
                  clearable={false}
                  searchable={false}
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && paymentMissing ? (
                <div className="exm__error" role="alert">
                  روش پرداخت را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Category */}
            <div className={"exm__field" + (showErrors && categoryMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <Layers size={16} />
                  </span>
                  کتگوری <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control">
                <SmartSelect
                  options={categoryOptions}
                  value={form.category}
                  onChange={(opt) => {
                    const v = normalize(opt);
                    setForm((f) => ({
                      ...f,
                      category: v != null ? String(v) : null,
                      employeeId:
                        String(v) === String(EXPENSE_CATEGORY.SALARY) ? f.employeeId : null,
                    }));
                  }}
                  placeholder="انتخاب کتگوری..."
                  clearable={false}
                  searchable
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && categoryMissing ? (
                <div className="exm__error" role="alert">
                  کتگوری را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Source */}
            <div className={"exm__field" + (showErrors && sourceMissing ? " is-invalid" : "")}>
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <FolderTree size={16} />
                  </span>
                  منبع <span className="exm__req">*</span>
                </label>
              </div>

              <div className="exm__control">
                <SmartSelect
                  options={sourceOptions}
                  value={form.source}
                  onChange={(opt) => {
                    const v = normalize(opt);
                    setForm((f) => ({ ...f, source: v != null ? String(v) : null }));
                  }}
                  placeholder="انتخاب منبع..."
                  clearable={false}
                  searchable={false}
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && sourceMissing ? (
                <div className="exm__error" role="alert">
                  منبع را انتخاب کنید.
                </div>
              ) : null}
            </div>

            {/* Employee (only for salary) */}
            {String(form.category) === String(EXPENSE_CATEGORY.SALARY) ? (
              <div className={"exm__field exm__span2" + (showErrors && employeeMissing ? " is-invalid" : "")}>
                <div className="exm__labelRow">
                  <label className="exm__label">
                    <span className="exm__labelIcon" aria-hidden="true">
                      <User size={16} />
                    </span>
                    کارمند <span className="exm__req">*</span>
                  </label>
                </div>

                <div className="exm__control">
                  <SmartSelect
                    options={employeeOptions}
                    value={form.employeeId}
                    onChange={(opt) => {
                      const v = normalize(opt);
                      setForm((f) => ({ ...f, employeeId: v != null ? String(v) : null }));
                    }}
                    placeholder="انتخاب کارمند..."
                    clearable={false}
                    searchable
                    disabled={disabled || submitting}
                  />
                </div>

                {showErrors && employeeMissing ? (
                  <div className="exm__error" role="alert">
                    کارمند را انتخاب کنید.
                  </div>
                ) : null}
              </div>
            ) : null}

            {/* Notes */}
            <div className="exm__field exm__span2">
              <div className="exm__labelRow">
                <label className="exm__label">
                  <span className="exm__labelIcon" aria-hidden="true">
                    <FileText size={16} />
                  </span>
                  یادداشت
                </label>
                <span className="exm__meta">اختیاری</span>
              </div>

              <div className="exm__control">
                <Input
                  multiline
                  rows={3}
                  type="text"
                  placeholder="توضیحات بیشتر..."
                  value={form.notes ?? ""}
                  onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                  disabled={disabled || submitting}
                />
              </div>

              {showErrors && !isValid ? (
                <div className="exm__errorSummary" role="alert">
                  لطفاً فیلدهای ضروری را تکمیل کنید.
                </div>
              ) : null}
            </div>
          </div>

          {error ? <div className="exm__apiError">{error}</div> : null}
        </div>

        {/* Footer */}
        <div className="exm__footer">
          <small className="exm__footerNote">
            قبل از ذخیره، لطفاً مبلغ و حساب پولی را بررسی کنید.
          </small>

          <div className="exm__footerActions">
            <Button
              size="md"
              variant="soft"
              icon={X}
              onClick={onClose}
              disabled={disabled || submitting}
              primaryColor={secondaryColor}
            >
              {closeLabel}
            </Button>

            <Button
              size="md"
              variant="soft"
              icon={Check}
              onClick={handleSubmit}
              disabled={disabled || submitting}
              loading={submitting}
              primaryColor={primaryColor}
              title={
                exceedsMax
                  ? "مبلغ از موجودی بیشتر است"
                  : !isValid
                  ? "ابتدا اطلاعات ضروری را تکمیل کنید"
                  : undefined
              }
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
