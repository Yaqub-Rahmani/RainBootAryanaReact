import React, { useEffect, useMemo, useState } from "react";
import { X, Download, Printer } from "lucide-react";

import Button from "../components/Button";
import CustomDatePicker from "../date/CustomDatePicker";

import "./ServerReportModal.css";

import {
  generateContractDebtA6,
  generateContractDebtA6Batch,
  generateContractPeriodA6,
  generateContractPeriodA6Batch,
  generatePaymentReceiptA6,
  generatePaymentReceiptsA6,
} from "./serverReportEndpoints";

import { downloadBlob, openBlobForPrint } from "./serverPdfClient";

function isGuid(s) {
  if (typeof s !== "string") return false;
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(s);
}

function pickGuid(row, keys) {
  if (!row) return null;
  for (const k of keys) {
    const v =
      row[k] ??
      row[k?.charAt(0)?.toLowerCase?.() + k?.slice(1)] ??
      row[k?.toUpperCase?.()];

    if (typeof v === "string" && isGuid(v)) return v;

    if (v && typeof v === "object") {
      const vv = v.id ?? v.Id;
      if (typeof vv === "string" && isGuid(vv)) return vv;
    }
  }
  return null;
}

function extractGuids(rows, keys) {
  const set = new Set();
  (rows || []).forEach((r) => {
    const id = pickGuid(r, keys);
    if (id) set.add(id);
  });
  return Array.from(set);
}

// Convert whatever CustomDatePicker returns into "YYYY-MM-DD" (Gregorian)
function toGregorianYmd(val) {
  if (!val) return "";
  try {
    // Lazy require to avoid build issues across setups
    // eslint-disable-next-line no-undef
    const DateObject = require("react-date-object").default;
    // eslint-disable-next-line no-undef
    const gregorian = require("react-date-object/calendars/gregorian").default;
    // eslint-disable-next-line no-undef
    const gregorian_en = require("react-date-object/locales/gregorian_en").default;

    return new DateObject(val).set({ calendar: gregorian, locale: gregorian_en }).format("YYYY-MM-DD");
  } catch {
    try {
      const d = new Date(val);
      if (Number.isNaN(d.getTime())) return "";
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yy}-${mm}-${dd}`;
    } catch {
      return "";
    }
  }
}

export default function ServerReportModal({ open, onClose, variant, rows = [] }) {
  const ids = useMemo(() => {
    if (variant === "franchiseOwnerBalance") {
      return extractGuids(rows, [
        "collectionId",
        "CollectionId",
        "paymentCollectionId",
        "PaymentCollectionId",
        "id",
        "Id",
      ]);
    }
    return extractGuids(rows, ["id", "Id", "contractId", "ContractId"]);
  }, [rows, variant]);

  const isBatch = ids.length > 1;

  const [reportType, setReportType] = useState(
    variant === "franchiseOwnerBalance" ? "paymentReceipt" : "contractDebt"
  );

  // ✅ Two pickers
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setError("");
    setReportType(variant === "franchiseOwnerBalance" ? "paymentReceipt" : "contractDebt");
    setFromDate(null);
    setToDate(null);
  }, [open, variant]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const startDate = useMemo(() => toGregorianYmd(fromDate), [fromDate]);
  const endDate = useMemo(() => toGregorianYmd(toDate), [toDate]);

  const needDates = reportType === "contractPeriod";
  const canRun = ids.length > 0 && (!needDates || (startDate && endDate));

  const title = variant === "franchiseOwnerBalance" ? "گزارش رسید پرداخت" : "گزارش قرارداد";
  const subtitle = ids.length ? `${ids.length} مورد انتخاب شده` : "هیچ موردی انتخاب نشده است";

  const run = async (mode) => {
    try {
      setBusy(true);
      setError("");

      if (!ids.length) throw new Error("هیچ موردی انتخاب نشده است.");

      let blob, filename;

      // Franchise Owner receipts
      if (variant === "franchiseOwnerBalance") {
        if (ids.length === 1) ({ blob, filename } = await generatePaymentReceiptA6(ids[0]));
        else ({ blob, filename } = await generatePaymentReceiptsA6(ids));

        mode === "print" ? openBlobForPrint(blob) : downloadBlob(blob, filename);
        setBusy(false);
        onClose?.();
        return;
      }

      // Contracts
      if (reportType === "contractDebt") {
        if (ids.length === 1) ({ blob, filename } = await generateContractDebtA6(ids[0]));
        else ({ blob, filename } = await generateContractDebtA6Batch(ids));
      }

      if (reportType === "contractPeriod") {
        if (!startDate || !endDate) throw new Error("از تاریخ و تا تاریخ را انتخاب کنید.");

        const req = { startDate, endDate };

        if (ids.length === 1) ({ blob, filename } = await generateContractPeriodA6(ids[0], req));
        else ({ blob, filename } = await generateContractPeriodA6Batch(ids, req));
      }

      mode === "print" ? openBlobForPrint(blob) : downloadBlob(blob, filename);

      setBusy(false);
      onClose?.();
    } catch (e) {
      setBusy(false);
      setError(e?.message || "خطا");
    }
  };

  if (!open) return null;

  return (
    <div className="srm__overlay" onMouseDown={onClose}>
      <div className="srm__modal" onMouseDown={(e) => e.stopPropagation()} dir="rtl">
        <div className="srm__header">
          <div className="srm__headText">
            <div className="text-2xl font-bold">{title}</div>
            <div className="text-md font-bold mt-2">{subtitle}</div>
          </div>

          <Button
            iconOnly
            ariaLabel="بستن"
            icon={X}
            onClick={onClose}
            primaryColor="var(--role-danger-bg)"
          />
        </div>

        <div className="srm__body">
          {!ids.length && (
            <div className="srm__alert srm__alert--warn">
              از ردیف‌های انتخاب‌شده ID معتبر پیدا نشد.
            </div>
          )}

          {variant !== "franchiseOwnerBalance" && (
            <div className="srm__section">
              <div className="var(--label-md) mb-3">نوع گزارش</div>

              <div className="srm__choiceGrid">
                <button
                  type="button"
                  className={`srm__choice ${reportType === "contractDebt" ? "is-active" : ""}`}
                  onClick={() => setReportType("contractDebt")}
                >
                  <div className="text-xl font-bold mb-1">گزارش بدهی قرارداد</div>
                  <div className="srm__choiceDesc">{isBatch ? "(چندتایی)" : "(تکی)"}</div>
                </button>

                <button
                  type="button"
                  className={`srm__choice ${reportType === "contractPeriod" ? "is-active" : ""}`}
                  onClick={() => setReportType("contractPeriod")}
                >
                  <div className="text-xl font-bold mb-1">صورت‌حساب دوره</div>
                  <div className="srm__choiceDesc">از/تا تاریخ</div>
                </button>
              </div>
            </div>
          )}

          {needDates && variant !== "franchiseOwnerBalance" && (
            <div className="srm__section">
              <div className="srm__grid2">
                <div>
                  <div className="var(--label-md) mb-3">از تاریخ</div>
                  <CustomDatePicker value={fromDate} mode="single" onChange={setFromDate} placeholder="از تاریخ..." />
                </div>
                <div>
                  <div className="var(--label-md) mb-3">تا تاریخ</div>
                  <CustomDatePicker value={toDate} mode="single" onChange={setToDate} placeholder="تا تاریخ..." />
                </div>
              </div>

            </div>
          )}

          {error && <div className="srm__alert srm__alert--err">{error}</div>}
        </div>

        <div className="srm__footer">
          <Button
            icon={Printer}
            onClick={() => run("print")}
            disabled={!canRun || busy}
            loading={busy}
            primaryColor="var(--role-secondary-bg)"
          >
            چاپ
          </Button>

          <Button
            icon={Download}
            onClick={() => run("download")}
            disabled={!canRun || busy}
            loading={busy}
            primaryColor="var(--role-primary-bg)"
            activeColor="var(--role-primary-active)"
          >
            PDF دانلود
          </Button>
        </div>
      </div>
    </div>
  );
}
