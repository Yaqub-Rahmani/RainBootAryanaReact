import React, { useEffect, useRef, useState } from "react";
import "../../../shared/components/Payment/PaymentModal.css";

import { X, User, Mail, Shield, KeyRound } from "lucide-react";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import SmartSelect from "../../../shared/components/SmartSelect";

const isEmail = (v) =>
  /^(?=[^@]{1,64}@)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || "").trim());

const ROLE_OPTIONS = [
  { value: "superadmin", label: "مدیر کل" },
  { value: "admin", label: "ادمین" },
  { value: "accountant", label: "حسابدار" },
  { value: "viewer", label: "ناظر" },
];

const EMPTY = {
  fullName: "",
  email: "",
  role: "admin",
  password: "",
};

function splitName(fullName) {
  const parts = String(fullName || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const firstName = parts[0] || "";
  const lastName = parts.length >= 2 ? parts.slice(1).join(" ") : "-";
  return { firstName, lastName };
}

function normalizeIncoming(value) {
  if (!value) return { ...EMPTY };

  // edit için bazen firstName/lastName geliyor olabilir
  const fn = value.firstName ?? value.FirstName ?? "";
  const ln = value.lastName ?? value.LastName ?? "";
  const full =
    (value.fullName ?? value.FullName ?? "").trim() ||
    (value.name ?? value.Name ?? "").trim() ||
    `${fn} ${ln}`.trim();

  return {
    fullName: full || "",
    email: value.email ?? value.Email ?? "",
    role: value.role ?? value.Role ?? "admin",
    password: "", // edit'te boş başlar
  };
}

export default function AdminUserModal({
  open,
  dir = "rtl",
  title = "ثبت ادمین",
  hint,

  mode = "create", // create | edit
  value,           // initial value (edit)
  onClose,
  onSubmit,

  submitLabel = "ثبت",
  closeLabel = "بستن",

  disabled = false,
  busy = false,
}) {
  const closeBtnRef = useRef(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });

  // sadece modal açılırken veya edit edilen kayıt değişince formu kur
  const editKey = value?.id ?? value?.Id ?? "";

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setForm(normalizeIncoming(value));

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, editKey, onClose]); // editKey değişince (farklı user edit) resetler

  const setField = (key, v) => {
    setForm((prev) => ({ ...prev, [key]: v }));
  };

  const nameMissing = !String(form.fullName || "").trim();
  const emailMissing = !String(form.email || "").trim();
  const emailInvalid = !emailMissing && !isEmail(form.email);
  const roleMissing = !String(form.role || "").trim();

  const pwMissing = mode === "create" && !String(form.password || "").trim();
  const pwTooShort =
    String(form.password || "").trim() &&
    String(form.password || "").trim().length < 6;

  const showErrors = submitted;

  const hasError =
    nameMissing || emailMissing || emailInvalid || roleMissing || pwMissing || pwTooShort;

  const handleSubmit = () => {
    setSubmitted(true);
    if (hasError) return;

    const { firstName, lastName } = splitName(form.fullName);

    const payload = {
      firstName,
      lastName,
      email: String(form.email || "").trim(),
      role: String(form.role || "admin").trim(),
      phoneNumber: null,
      status: true,
      ...(mode === "create"
        ? { password: String(form.password || "").trim() }
        : String(form.password || "").trim()
          ? { password: String(form.password || "").trim() }
          : {}),
    };

    onSubmit?.(payload);
  };

  if (!open) return null;

  return (
    <div className="pmd__overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="pmd__modal" dir={dir} onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pmd__header">
          <div className="pmd__titleWrap">
            <div className="pmd__titleRow">
              <div className="pmd__title">{title}</div>
            </div>
            {hint ? <div className="pmd__hint">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            icon={X}
            iconOnly
            onClick={onClose}
            title={closeLabel}
            disabled={disabled || busy}
            primaryColor={"var(--role-danger-bg)"}
          />
        </div>

        {/* Body */}
        <div className="pmd__body">
          <div className="pmd__grid">
            {/* Name */}
            <div className={"pmd__field" + (showErrors && nameMissing ? " is-invalid" : "")}>
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <User size={16} />
                  </span>
                  نام <span className="pmd__req">*</span>
                </label>
              </div>
              <div className="pmd__control">
                <Input
                  icon="User"
                  value={form.fullName}
                  onChange={(v) => setField("fullName", v)}
                  placeholder="نام"
                  label={null}
                  autoComplete="off"
                  disabled={disabled || busy}
                />
              </div>
              {showErrors && nameMissing ? (
                <div className="pmd__error" role="alert">نام را وارد کنید.</div>
              ) : null}
            </div>

            {/* Role */}
            <div className={"pmd__field" + (showErrors && roleMissing ? " is-invalid" : "")}>
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <Shield size={16} />
                  </span>
                  نقش <span className="pmd__req">*</span>
                </label>
              </div>
              <div className="pmd__control">
                <SmartSelect
                  options={ROLE_OPTIONS}
                  value={form.role}
                  onChange={(v) => setField("role", v)}
                  placeholder="انتخاب نقش"
                  disabled={disabled || busy}
                  searchable={false}
                  clearable={false}
                  dir={dir}
                  icon={Shield}
                />
              </div>
              {showErrors && roleMissing ? (
                <div className="pmd__error" role="alert">نقش را انتخاب کنید.</div>
              ) : null}
            </div>

            {/* Email (span2) */}
            <div
              className={
                "pmd__field pmd__span2" +
                (showErrors && (emailMissing || emailInvalid) ? " is-invalid" : "")
              }
            >
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <Mail size={16} />
                  </span>
                  ایمیل <span className="pmd__req">*</span>
                </label>
              </div>
              <div className="pmd__control">
                <Input
                  icon="Mail"
                  type="email"
                  value={form.email}
                  onChange={(v) => setField("email", v)}
                  placeholder="example@mail.com"
                  label={null}
                  autoComplete="off"
                  disabled={disabled || busy}
                />
              </div>
              {showErrors && emailMissing ? (
                <div className="pmd__error" role="alert">ایمیل را وارد کنید.</div>
              ) : null}
              {showErrors && !emailMissing && emailInvalid ? (
                <div className="pmd__error" role="alert">ایمیل معتبر نیست.</div>
              ) : null}
            </div>

            {/* Password (span2) */}
            <div
              className={
                "pmd__field pmd__span2" +
                (showErrors && (pwMissing || pwTooShort) ? " is-invalid" : "")
              }
            >
              <div className="pmd__labelRow">
                <label className="pmd__label">
                  <span className="pmd__labelIcon" aria-hidden="true">
                    <KeyRound size={16} />
                  </span>
                  پسورد {mode === "create" ? <span className="pmd__req">*</span> : null}
                </label>
                <span className="pmd__meta">{mode === "create" ? "حداقل 6" : "اختیاری"}</span>
              </div>

              <div className="pmd__control">
                <Input
                  icon="KeyRound"
                  type="password"
                  value={form.password}
                  onChange={(v) => setField("password", v)}
                  placeholder={mode === "create" ? "پسورد" : "پسورد جدید (اختیاری)"}
                  label={null}
                  autoComplete="new-password"
                  disabled={disabled || busy}
                />
              </div>

              {showErrors && pwMissing ? (
                <div className="pmd__error" role="alert">پسورد را وارد کنید.</div>
              ) : null}
              {showErrors && !pwMissing && pwTooShort ? (
                <div className="pmd__error" role="alert">پسورد حداقل 6 کاراکتر باشد.</div>
              ) : null}
            </div>

            {showErrors && hasError ? (
              <div className="pmd__errorSummary pmd__span2" role="alert">
                لطفاً فیلدهای ضروری را درست تکمیل کنید.
              </div>
            ) : null}
          </div>
        </div>

        {/* Footer */}
        <div className="pmd__footer">
          <Button
            onClick={onClose}
            disabled={disabled || busy}
            primaryColor={"var(--role-neutral-soft-bg)"}
            activeColor={"var(--role-neutral-soft-bg)"}
          >
            {closeLabel}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={disabled || busy}
            loading={busy}
            primaryColor={"var(--role-primary-bg)"}
            activeColor={"var(--role-secondary-bg)"}
          >
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
