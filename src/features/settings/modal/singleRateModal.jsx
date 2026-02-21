import React, { useEffect, useState } from "react";
import "../styles/SingleRateModal.css";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { Percent, X, NotebookPen } from "lucide-react";

const SingleRateModal = ({ isOpen, onClose, onConfirm, typeId }) => {
  const [ratePercent, setRatePercent] = useState("");
  const [notes, setNotes] = useState("");

  // Modal her açıldığında alanları sıfırla
  useEffect(() => {
    if (isOpen) {
      setRatePercent("");
      setNotes("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 0–100 arası yüzde input normalizasyonu
  const normalizePercentInput = (valOrEvent) => {
    const raw =
      typeof valOrEvent === "string"
        ? valOrEvent
        : valOrEvent?.target?.value ?? "";

    // virgülü noktaya çevir, sayı ve nokta dışını temizle
    let cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");

    // tek nokta kalsın
    const firstDot = cleaned.indexOf(".");
    if (firstDot !== -1) {
      const before = cleaned.slice(0, firstDot + 1);
      const after = cleaned.slice(firstDot + 1).replace(/\./g, "");
      cleaned = before + after;
    }

    if (cleaned !== "" && cleaned !== ".") {
      const n = Number(cleaned);
      if (Number.isFinite(n)) {
        if (n > 100) cleaned = "100";
        if (n < 0) cleaned = "0";
      }
    }

    return cleaned;
  };

  const toNumber = (s) => {
    if (!s) return 0;
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const numericPercent = toNumber(ratePercent);
  const isSubmitDisabled = ratePercent.trim() === "";

  const title =
    typeId === 1
      ? "ثبت پالیسی ریزرف برق"
      : typeId === 2
      ? "ثبت پالیسی ریزرف مارکیت"
      : "ثبت پالیسی ریزرف";

  const percentLabel =
    typeId === 1
      ? "ریزرف برق (%):"
      : typeId === 2
      ? "ریزرف مارکیت (%):"
      : "ریزرف (%):";

  const subtitle =
    "فیصدی ریزرف این فیصدی در محاسبات بعدی استفاده خواهد شد.";

  const handlePercentChange = (valOrEvent) => {
    setRatePercent(normalizePercentInput(valOrEvent));
  };

  const handleNotesChange = (valOrEvent) => {
    const value =
      typeof valOrEvent === "string"
        ? valOrEvent
        : valOrEvent?.target?.value ?? "";
    setNotes(value);
  };

  const handleConfirmClick = () => {
    if (isSubmitDisabled) return;

    onConfirm &&
      onConfirm({
        ratePercent: numericPercent,
        notes: notes.trim(),
      });
  };

  return (
    <div className="meter-modal-backdrop" role="presentation">
      <div
        className="meter-modal meter-modal-rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="single-rate-title"
        dir="rtl"
        lang="fa"
      >
        <div className="meter-modal-accent-bar" />

        {/* HEADER */}
        <header className="tcm-header">
          <div className="tcm-header-left">
            <h2 id="single-rate-title" className="tcm-title">
              {title}
            </h2>
            <p className="tcm-subtitle">{subtitle}</p>
          </div>
          <div className="tcm-header-right">
            <Button
              type="button"
              className="tcm-close"
              iconOnly
              icon={X}
              aria-label="بستن"
              onClick={onClose}
            />
          </div>
        </header>

        {/* BODY */}
        <div className="meter-modal-body">
          <div className="meter-modal-layout">
                          <section className="meter-modal-section">

              <section className="meter-summary-card meter-summary-main">
                <div className="meter-summary-main-header">
                  <span className="meter-summary-main-label">
                    فیصدی ریزرف شده
                  </span>
                  <div className="meter-summary-main-amount">
                    {numericPercent.toFixed(2)}%
                  </div>
                </div>
              </section>
                <div className="meter-modal-form-column mt-3">
                  <Input
                    icon={Percent}
                    label={percentLabel}
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    name="ratePercent"
                    value={ratePercent}
                    onChange={handlePercentChange}
                    placeholder="0-100"
                  />

                  <Input
                    multiline
                    rows={3}
                    type="text"
                    icon={NotebookPen}
                    label="توضیحات:"
                    name="notes"
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="در صورت نیاز توضیح اضافه کنید..."
                  />
                </div>
              </section>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="meter-modal-footer">
          <div className="meter-modal-footer-actions">
            <Button
              type="button"
              onClick={onClose}
              className="meter-modal-btn-ghost"
            >
              لغو
            </Button>

            <Button
              type="button"
              onClick={handleConfirmClick}
              disabled={isSubmitDisabled}
              className="meter-modal-btn-primary"
            >
              ثبت و تأیید
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default SingleRateModal;
