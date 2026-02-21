import React, { useEffect, useMemo, useRef } from "react";
import "./FilterModal.css";

import Button from "../Button";
import Input from "../Input";
import SmartSelect from "../SmartSelect";
import CustomDatePicker from "../../date/CustomDatePicker";
import { X, Trash, Check } from "lucide-react";

import { getInputValue } from "../CustomTableV2/CustomTableV2";

const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

const toEpoch = (d) => {
  if (!d) return null;
  try {
    return d.valueOf();
  } catch {
    const dt = new Date(d);
    return Number.isFinite(dt.valueOf()) ? dt.valueOf() : null;
  }
};

function getFilterableColumns(columns, filterableCols) {
  if (Array.isArray(filterableCols) && filterableCols.length) return filterableCols;
  return (columns || []).filter(
    (c) => c?.visible !== false && (c.filterable || c.filter || c.filterType || c.dateFilter)
  );
}

const TYPE_PRIORITY = {
  dateRange: 10,
  select: 20,
  multiSelect: 25,
  numberRange: 30,
  text: 40,
  checkboxGroup: 50,
  checkbox: 60,
};

function normalizeType(col) {
  return col.filterType || (col.dateFilter ? "dateRange" : "text");
}

function defaultSection(type) {
  if (type === "dateRange") return "date";
  if (type === "select" || type === "multiSelect") return "select";
  if (type === "checkbox" || type === "checkboxGroup") return "check";
  return "input";
}

function computeSpan(col, type) {
  if (typeof col.filterSpan === "number") return col.filterSpan;
  if (type === "dateRange") return 2;
  if (type === "checkboxGroup") return 2;
  // numberRange kendi içinde 2 input barındırdığı için 1 kolon yeterli
  return 1;
}

function stableLabel(col) {
  return (col.filterLabel || col.header || col.key || "").toString();
}

export default function FilterModal({
  open,
  onClose,
  title = "فیلترها",

  columns = [],
  filterableCols,

  draft,
  setDraft,

  onApply,
  onReset,
}) {
  const closeBtnRef = useRef(null);

  const cols = useMemo(() => getFilterableColumns(columns, filterableCols), [columns, filterableCols]);

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";
  const orderedCols = useMemo(() => {
    const arr = [...cols];
    arr.sort((a, b) => {
      const ta = normalizeType(a);
      const tb = normalizeType(b);

      const oa = a.filterOrder ?? TYPE_PRIORITY[ta] ?? 999;
      const ob = b.filterOrder ?? TYPE_PRIORITY[tb] ?? 999;

      if (oa !== ob) return oa - ob;

      // aynı öncelikte stabil bir sıralama
      return stableLabel(a).localeCompare(stableLabel(b));
    });
    return arr;
  }, [cols]);

  const sections = useMemo(() => {
    const map = { date: [], select: [], input: [], check: [] };
    for (const c of orderedCols) {
      const type = normalizeType(c);
      const sec = c.filterSection || defaultSection(type);
      (map[sec] || map.input).push(c);
    }
    return map;
  }, [orderedCols]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);

    // küçük bir UX: açılınca kapat butonuna focus
    setTimeout(() => closeBtnRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const setField = (key, value, col) => {
    setDraft?.((prev) => {
      const next = { ...(prev || {}) };

      // parent değişince child temizleme (kademeli select)
      if (col?.clearsOnChange && Array.isArray(col.clearsOnChange)) {
        col.clearsOnChange.forEach((k) => {
          const old = next[k];

          if (Array.isArray(old)) next[k] = [];
          else if (old && typeof old === "object" && "from" in old) next[k] = { from: null, to: null };
          else next[k] = "";
        });
      }

      next[key] = value;
      return next;
    });
  };

  const shouldHide = (col, type) => {
    const dependsOn = col.dependsOnKey;
    if (!dependsOn) return false;

    const parentVal = draft?.[dependsOn];
    const parentEmpty = isEmpty(parentVal);

    // default: hideUntilParent true => parent yoksa gizle
    if (col.hideUntilParent !== false && parentEmpty) return true;

    // dateRange için genelde gizlemek istemeyiz; ama override mümkündür
    if (type === "dateRange" && col.hideUntilParent === false) return false;

    return false;
  };

  const renderControl = (col) => {
    const key = col.key;
    if (!key) return null;

    const type = normalizeType(col);
    const label = col.filterLabel || col.header || col.key;
    const placeholder = col.filterPlaceholder;

    if (shouldHide(col, type)) return null;

    const span = computeSpan(col, type);

    // custom renderFilter varsa
    if (typeof col.renderFilter === "function") {
      return (
        <div className="fm2__field" data-span={span} key={key}>
          <div className="fm2__labelRow">
            <label className="fm2__label">{label}</label>
            {col.filterHint ? <div className="fm2__meta">{col.filterHint}</div> : null}
          </div>
          <div className="fm2__control">
            {col.renderFilter(draft?.[key], draft, (v) => setField(key, v, col))}
          </div>
        </div>
      );
    }

    // select / multiSelect
    if (type === "select" || type === "multiSelect") {
      const multiple = type === "multiSelect";

      const dependsOn = col.dependsOnKey;
      const parentVal = dependsOn ? draft?.[dependsOn] : null;
      const parentEmpty = dependsOn ? isEmpty(parentVal) : false;

      const disabled = !!col.disabled || (dependsOn && parentEmpty);

      const computedPlaceholder =
        placeholder ||
        (dependsOn && parentEmpty ? col.parentRequiredText || "ابتدا گزینه اصلی را انتخاب کنید" : "انتخاب کنید...");

      const asyncLoadOptions = col.asyncLoadOptions
        ? (q, page) => col.asyncLoadOptions(q, page, { draft, parentValue: parentVal })
        : undefined;

      return (
        <div className="fm2__field" data-span={span} key={key}>
          <div className="fm2__labelRow">
            <label className="fm2__label">{label}</label>
            {disabled && dependsOn ? <div className="fm2__meta">وابسته به انتخاب قبلی</div> : null}
          </div>
          <div className="fm2__control">
            <SmartSelect
              options={col.filterOptions || []}
              asyncLoadOptions={asyncLoadOptions}
              value={draft?.[key] ?? (multiple ? [] : null)}
              onChange={(v) => setField(key, v, col)}
              placeholder={computedPlaceholder}
              multiple={multiple}
              searchable={col.searchableSelect !== false}
              clearable={col.clearableSelect !== false}
              disabled={disabled}
            />
          </div>
        </div>
      );
    }

    // checkbox
    if (type === "checkbox") {
      return (
        <div className="fm2__field fm2__field--row" data-span={span} key={key}>
          <label className="fm2__label">{label}</label>
          <div className="fm2__control">
            <label className="fm2__switch">
              <input
                type="checkbox"
                checked={!!draft?.[key]}
                onChange={(e) => setField(key, !!e.target.checked, col)}
              />
              <span className="fm2__switchTrack" />
            </label>
          </div>
        </div>
      );
    }

    // checkboxGroup
    if (type === "checkboxGroup") {
      const items = Array.isArray(col.filterOptions) ? col.filterOptions : [];
      const selected = new Set(Array.isArray(draft?.[key]) ? draft[key] : []);

      return (
        <div className="fm2__field" data-span={span} key={key}>
          <div className="fm2__labelRow">
            <label className="fm2__label">{label}</label>
            <div className="fm2__meta">{selected.size ? `${selected.size} انتخاب شد` : "هیچ"}</div>
          </div>

          <div className="fm2__control fm2__checkgrid">
            {items.map((opt) => {
              const v = opt.value ?? opt.id ?? opt.key;
              const text = opt.label ?? opt.text ?? opt.name ?? String(v);
              const checked = selected.has(v);

              return (
                <label key={String(v)} className={"fm2__checkitem" + (checked ? " is-checked" : "")}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const next = new Set(selected);
                      if (e.target.checked) next.add(v);
                      else next.delete(v);
                      setField(key, [...next], col);
                    }}
                  />
                  <span>{text}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    // numberRange
    if (type === "numberRange") {
      const val = draft?.[key] || { min: "", max: "" };
      return (
        <div className="fm2__field" data-span={span} key={key}>
          <div className="fm2__labelRow">
            <label className="fm2__label">{label}</label>
            {col.filterHint ? <div className="fm2__meta">{col.filterHint}</div> : null}
          </div>

          <div className="fm2__control fm2__row2">
            <Input
              value={val.min ?? ""}
              onChange={(v) => setField(key, { ...val, min: getInputValue(v) }, col)}
              placeholder={col.minPlaceholder || "حداقل"}
              label={null}
              autoComplete="off"
            />
            <Input
              value={val.max ?? ""}
              onChange={(v) => setField(key, { ...val, max: getInputValue(v) }, col)}
              placeholder={col.maxPlaceholder || "حداکثر"}
              label={null}
              autoComplete="off"
            />
          </div>
        </div>
      );
    }

    // dateRange (start always active, end always visible but disabled until start chosen)
    if (type === "dateRange") {
      const val = draft?.[key] || { from: null, to: null };
      const from = val?.from || null;
      const to = val?.to || null;

      const fromEpoch = toEpoch(from);
      const toEpochVal = toEpoch(to);

      const onChangeFrom = (v) => {
        const nextFrom = v || null;
        const nextFromEpoch = toEpoch(nextFrom);

        let nextTo = to;
        const nextToEpoch = toEpoch(nextTo);

        // start değişince end < start ise end temizle
        if (nextFromEpoch && nextToEpoch && nextToEpoch < nextFromEpoch) nextTo = null;

        setField(key, { from: nextFrom, to: nextTo }, col);
      };

      const onChangeTo = (v) => {
        const startEpoch = toEpoch(from);
        if (!startEpoch) return; // start yoksa end set etme

        const nextTo = v || null;
        const nextToEpoch2 = toEpoch(nextTo);

        // end < start => ignore
        if (nextToEpoch2 && nextToEpoch2 < startEpoch) return;

        setField(key, { from, to: nextTo }, col);
      };

      return (
        <div className="fm2__field" data-span={2} key={key}>
          <div className="fm2__labelRow">
            <label className="fm2__label">{label}</label>
            {col.filterHint ? <div className="fm2__meta">{col.filterHint}</div> : null}
          </div>

          <div className="fm2__control fm2__daterow">
            <div className="fm2__dateBox">
              <span className="fm2__hint">از تاریخ</span>
              <CustomDatePicker
                mode="single"
                value={from}
                onChange={onChangeFrom}
                placeholder={col.fromPlaceholder || "انتخاب تاریخ"}
                showToggle={false}
              />
            </div>

            <div className={"fm2__dateBox" + (!from ? " is-disabled" : "")}>
              <span className="fm2__hint">تا تاریخ</span>
              <CustomDatePicker
                mode="single"
                value={to}
                onChange={onChangeTo}
                minDate={from || undefined}
                disabled={!from}
                placeholder={
                  col.toPlaceholder || (from ? "تاریخ پایان را انتخاب کنید" : "ابتدا تاریخ شروع را انتخاب کنید")
                }
                showToggle={false}
              />
            </div>
          </div>

          {!!fromEpoch && !!toEpochVal && toEpochVal < fromEpoch && (
            <div className="fm2__error">تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.</div>
          )}
        </div>
      );
    }

    // default text
    return (
      <div className="fm2__field" data-span={span} key={key}>
        <div className="fm2__labelRow">
          <label className="fm2__label">{label}</label>
          {col.filterHint ? <div className="fm2__meta">{col.filterHint}</div> : null}
        </div>

        <div className="fm2__control">
          <Input
            value={draft?.[key] ?? ""}
            onChange={(v) => setField(key, getInputValue(v), col)}
            placeholder={placeholder || "بنویسید..."}
            label={null}
            autoComplete="off"
          />
        </div>
      </div>
    );
  };

  if (!open) return null;

  const renderSection = (titleText, list, extraClass = "") => {
    const items = list.map((c) => renderControl(c)).filter(Boolean);
    if (!items.length) return null;

    return (
      <div className={"fm2__section " + extraClass}>
        <div className="fm2__sectionHeader">
          <div className="fm2__sectionTitle">{titleText}</div>
          <div className="fm2__sectionLine" />
        </div>
        <div className="fm2__grid">{items}</div>
      </div>
    );
  };

  return (
    <div
      className="fm2__overlay"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // overlay click close
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="fm2__modal" dir="rtl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="fm2__header">
          <div className="fm2__title">{title}</div>
          <Button
            ref={closeBtnRef}
            primaryColor={dangerColor}
            size="md"
            variant="soft"
            icon={X}
            iconOnly
            onClick={onClose}
            title="بستن"
          />
        </div>

        <div className="fm2__body">
          {renderSection("تاریخ", sections.date, "is-date")}
          {renderSection("انتخاب‌ها", sections.select, "is-select")}
          {renderSection("ورودی‌ها", sections.input, "is-input")}
          {renderSection("گزینه‌ها", sections.check, "is-check")}
        </div>

        <div className="fm2__footer">
          <Button primaryColor={secondaryColor} size="md" variant="soft" icon={Trash} onClick={onReset}>
            پاک کردن
          </Button>

          <div className="fm2__spacer" />

          <Button primaryColor={dangerColor} size="md" variant="soft" onClick={onClose}>
            لغو
          </Button>

          <Button primaryColor={primaryColor} size="md" variant="soft" icon={Check} onClick={onApply}>
            اعمال
          </Button>
        </div>
      </div>
    </div>
  );
}