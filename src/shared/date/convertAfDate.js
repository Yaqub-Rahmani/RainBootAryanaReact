import DateObject from "react-date-object";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import persian_en from "react-date-object/locales/persian_en";

// 🔹 Afgan (Dari) ay adları + Latin rakamlar
// convertAfDate("2025-07-06"); 
// convertAfDate("2025-07-06", { monthStyle: "name" });
// "1404-ثور-14"  (varsayılan: ay adı)

// convertAfDate("2025-07-06", { monthStyle: "numeric" });
// "1404-04-14"

// convertAfDate("--");
// "—"

const persian_fa_af = {
  ...persian_fa,
  name: "persian_fa_af",
  // rakamları İngilizce yap
  digits: persian_en.digits,
  // ay adları Dari
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

const pad2 = (n) => String(n).padStart(2, "0");

/**
 * Gregorian ISO "YYYY-MM-DD" -> Jalali
 * @param {string} iso - örn. "2025-07-06"
 * @param {{ monthStyle?: 'name' | 'numeric' }} [opts]
 *  - monthStyle: 'name'  => "1404-ثور-14"   (varsayılan)
 *                'numeric' => "1404-04-14"
 * @returns {string} Jalali tarih ya da "—"
 */
export function convertAfDate(iso, opts = {}) {
  const { monthStyle = "name" } = opts;

  // "--" veya boş/invalid ise
  if (!iso || iso === "--") return "—";

  // ISO formatını hızlı doğrula (YYYY-MM-DD)
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "—";

  try {
    // 1) ISO'yu Gregorian olarak oku (saat dilimi sürprizlerini engellemek için)
    const g = new DateObject({
      date: iso,            // "YYYY-MM-DD"
      calendar: gregorian,
      locale: gregorian_en,
    });

    // 2) Jalali + Dari ay adları + Latin rakamlar
    const j = g.convert(persian, persian_fa_af);

    const year = j.year;                 // 1404
    const monthNum = j.month.number;     // 1..12
    const monthName = j.month.name;      // "ثور"
    const day = j.day;                   // 1..31

    if (monthStyle === "numeric") {
      return `${year}-${pad2(monthNum)}-${pad2(day)}`;
    }
    // monthStyle === "name"
    return `${year}-${monthName}-${pad2(day)}`;
  } catch (e) {
    console.error("convertAfDate error:", e);
    return "—";
  }
}
