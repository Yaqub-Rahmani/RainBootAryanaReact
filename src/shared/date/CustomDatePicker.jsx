import React, { useMemo, useState } from "react";
import DatePicker from "react-multi-date-picker";
import DateObject from "react-date-object";

// calendars & locales
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import persian_en from "react-date-object/locales/persian_en";

import "../styles/date/custom-date-picker.css";

/**
 * CustomDatePicker (no year lock)
 *
 * - Varsayılan olarak **yıl kilidi yok**. İstediğin yıla gidebilirsin.
 * - Eğer sınır istersen `minDate` / `maxDate` prop'larıyla dışarıdan ver.
 */
export default function CustomDatePicker({
  mode = "range", // "single" | "range"
  defaultCalendar = "persian", // "persian" | "gregorian"
  /** Eğer verilirse takvim modu sabitlenir ve toggle gizlenir */
  calendarMode: lockedCalendarMode,
  showToggle = true,
  placeholder = "تاریخ را انتخاب کنید…",
  value: controlledValue,
  onChange,
  /** İsteğe bağlı dış sınırlar (VERİLİRSE uygulanır, verilmezse SINIR YOK) */
  minDate: externalMinDate,
  maxDate: externalMaxDate,
  /** Zorunlu yön */
  dir: forcedDir,
  className = "",
  ...rest
}) {
  // calendar mode state
  const [calendarMode, setCalendarMode] = useState(
    lockedCalendarMode ?? (defaultCalendar === "gregorian" ? "gregorian" : "persian")
  );

  React.useEffect(() => {
    if (lockedCalendarMode) setCalendarMode(lockedCalendarMode);
  }, [lockedCalendarMode]);

  const isRange = mode === "range";

  // Afgan (Dari/Pashto) ay adlarıyla persian_fa türevi
  const persian_fa_af = {
    ...persian_fa,
    name: "persian_fa_af",
    digits: persian_en.digits, // 🔹 rakamlar İngilizce
    months: [
      ["حمل", "حم"],
      ["ثور", "ثور"],
      ["جوزا", "جوزا"],
      ["سرطان", "سر"],
      ["اسد", "اسد"],
      ["سنبله", "سن"],
      ["میزان", "می"],
      ["عقرب", "عق"],
      ["قوس", "قوس"],
      ["جدی", "جد"],
      ["دلو", "دل"],
      ["حوت", "حوت"],
    ],
  };

  // Yalnızca calendar/locale seçimi (SABİT min/max YOK)
  const { calendar, locale } = useMemo(() => {
    if (calendarMode === "gregorian") {
      return { calendar: gregorian, locale: gregorian_en };
    }
    return { calendar: persian, locale: persian_fa_af };
  }, [calendarMode]);

  // Etkili sınırlar: sadece dışarıdan verilirse uygula
  const effectiveMin = externalMinDate ?? undefined;
  const effectiveMax = externalMaxDate ?? undefined;

  const dir = forcedDir ?? (calendarMode === "persian" ? "rtl" : "ltr");

  // Local (uncontrolled) value fallback
  const [uncontrolledValue, setUncontrolledValue] = useState(isRange ? [] : null);
  const value = controlledValue !== undefined ? controlledValue : uncontrolledValue;

  const handleChange = (val) => {
    if (onChange) onChange(val);
    else setUncontrolledValue(val);
  };

  // Pretty printers: always render BOTH calendar representations
  const toPrettyString = (val, targetCalendar, targetLocale) => {
    if (!val) return "—";
    const toStr = (d) =>
      new DateObject(d)
        .set({ calendar: targetCalendar, locale: targetLocale })
        .format("YYYY-MM-DD");
    if (Array.isArray(val)) {
      const [start, end] = val;
      return `${start ? toStr(start) : "—"} → ${end ? toStr(end) : "—"}`;
    }
    return toStr(val);
  };

  const selectedInGregorian = toPrettyString(value, gregorian, gregorian_en);
  const selectedInPersian = toPrettyString(value, persian, persian_fa);

  return (
    <div className={`cdp ${className}`} data-dir={dir}>

      <DatePicker
        value={value}
        onChange={handleChange}
        calendar={calendar}
        locale={locale}
        // ❌ currentDate={minDate} kaldırıldı → istediğin yıla/aya gidebilirsin
        // min/max sadece dışarıdan verilmişse uygula
        {...(effectiveMin ? { minDate: effectiveMin } : {})}
        {...(effectiveMax ? { maxDate: effectiveMax } : {})}
        range={isRange}
        numberOfMonths={isRange ? 2 : 1}
        inputClass="cdp-input"
        containerClassName="cdp-container"
        placeholder={placeholder}
        // Günleri yalnızca min/max varsa sınırlayalım
        mapDays={({ date }) => {
          if (!effectiveMin && !effectiveMax) return;
          const d = date instanceof DateObject ? date : new DateObject(date);
          const minD = effectiveMin
            ? new DateObject(effectiveMin).set({ calendar, locale })
            : null;
          const maxD = effectiveMax
            ? new DateObject(effectiveMax).set({ calendar, locale })
            : null;

          let beforeMin = false;
          let afterMax = false;

          try {
            if (minD) beforeMin = d.isBefore(minD, "day");
            if (maxD) afterMax = d.isAfter(maxD, "day");
          } catch (_e) {
            if (minD) beforeMin = d.valueOf() < minD.valueOf();
            if (maxD) afterMax = d.valueOf() > maxD.valueOf();
          }

          if (beforeMin || afterMax) {
            return { disabled: true, className: "cdp-day--out" };
          }
        }}
        closeOnScroll
        hideOnScroll
        calendarPosition="bottom-center"
        fixMainPosition
        {...rest}
      />
    </div>
  );
}
