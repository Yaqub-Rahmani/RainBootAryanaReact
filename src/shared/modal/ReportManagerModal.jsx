import React, { useEffect, useMemo, useRef, useState } from "react";
import "./ReportManagerModal.css";

import { X, FileDown } from "lucide-react";

import Button from "../components/Button";
import SmartSelect from "../components/SmartSelect";
import CustomDatePicker from "../date/CustomDatePicker";

/**
 * ReportManagerModal
 * - Opens from CustomTableV2 "selected" button
 * - Lets user choose: scope (selected | list) + report action + optional date range
 */
export default function ReportManagerModal({
  open,
  dir = "rtl",
  title = "گزارش",
  hint,

  // { key, label, needsDateRange?:boolean, scopes?: ['selected','list'] }
  actions = [],
  defaultActionKey,

  // counts / context
  selectedCount = 0,

  // scopes control
  defaultScope = "selected", // 'selected' | 'list'

  onClose,
  onRun, // async ({ actionKey, scope, dateRange })
}) {
  const closeBtnRef = useRef(null);

  const actionOptions = useMemo(
    () => (actions || []).map((a) => ({ value: a.key, label: a.label })),
    [actions]
  );

  const resolveFirstAction = () => defaultActionKey || actions?.[0]?.key || "";

  const [actionKey, setActionKey] = useState(resolveFirstAction);
  const [scope, setScope] = useState(defaultScope);
  const [dateRange, setDateRange] = useState([]); // [start,end] DateObject
  const [submitting, setSubmitting] = useState(false);

  const actionDef = useMemo(
    () => (actions || []).find((a) => a.key === actionKey) || null,
    [actions, actionKey]
  );

  const allowedScopes = useMemo(() => {
    const s = actionDef?.scopes;
    if (!Array.isArray(s) || s.length === 0) return ["selected", "list"];
    return s;
  }, [actionDef]);

  useEffect(() => {
    if (!open) return;

    // reset state when opening
    const first = resolveFirstAction();
    setActionKey(first);
    setScope(defaultScope);
    setDateRange([]);
    setSubmitting(false);

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // keep scope valid when action changes
  useEffect(() => {
    if (!allowedScopes.includes(scope)) {
      setScope(allowedScopes[0] || "list");
    }
  }, [allowedScopes, scope]);

  const needsDateRange = !!actionDef?.needsDateRange;
  const dateOk =
    !needsDateRange ||
    (Array.isArray(dateRange) && dateRange[0] && dateRange[1]);

  const canRun =
    !!actionKey &&
    !!scope &&
    allowedScopes.includes(scope) &&
    (scope !== "selected" || selectedCount > 0) &&
    dateOk &&
    !submitting;

  const handleRun = async () => {
    if (!canRun) return;
    setSubmitting(true);
    try {
      await onRun?.({ actionKey, scope, dateRange });
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="rmm__overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="rmm__modal" dir={dir} onMouseDown={(e) => e.stopPropagation()}>
        <div className="rmm__header">
          <div className="rmm__titleWrap">
            <div className="rmm__title">{title}</div>
            {hint ? <div className="rmm__hint">{hint}</div> : null}
          </div>

          <Button
            ref={closeBtnRef}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={onClose}
            title="بستن"
            primaryColor="var(--role-danger-bg)"
          />
        </div>

        <div className="rmm__body">
          {/* Scope */}
          <div className="rmm__row">
            <div className="rmm__label">نوع انتخاب</div>
            <div className="rmm__seg">
              {allowedScopes.includes("selected") && (
                <button
                  type="button"
                  className={`rmm__segBtn ${scope === "selected" ? "is-active" : ""}`}
                  onClick={() => setScope("selected")}
                  disabled={selectedCount <= 0}
                >
                  انتخاب شده ({selectedCount})
                </button>
              )}

              {allowedScopes.includes("list") && (
                <button
                  type="button"
                  className={`rmm__segBtn ${scope === "list" ? "is-active" : ""}`}
                  onClick={() => setScope("list")}
                >
                  لیست فعلی
                </button>
              )}
            </div>
          </div>

          {/* Action */}
          <div className="rmm__row">
            <div className="rmm__label">نوع گزارش</div>
            <div className="rmm__control">
              <SmartSelect
                options={actionOptions}
                value={actionKey}
                onChange={(v) => setActionKey(v?.value ?? v)}
                placeholder="انتخاب کنید..."
                clearable={false}
                searchable={false}
                disabled={submitting}
              />
            </div>
          </div>

          {/* Date range */}
          {needsDateRange && (
            <div className="rmm__row">
              <div className="rmm__label">بازهٔ تاریخ</div>
              <div className="rmm__control">
                <CustomDatePicker
                  mode="range"
                  defaultCalendar="persian"
                  value={dateRange}
                  onChange={setDateRange}
                  placeholder="تاریخ شروع و پایان"
                  className="rmm__date"
                />
                {!dateOk ? (
                  <div className="rmm__error">تاریخ شروع و پایان را انتخاب کنید.</div>
                ) : null}
              </div>
            </div>
          )}
        </div>

        <div className="rmm__footer">
          <Button
            size="md"
            variant="soft"
            onClick={onClose}
            primaryColor="var(--role-secondary-bg)"
            disabled={submitting}
          >
            بستن
          </Button>

          <Button
            size="md"
            variant="soft"
            icon={FileDown}
            onClick={handleRun}
            primaryColor="var(--role-primary-bg)"
            disabled={!canRun}
          >
            دانلود PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
