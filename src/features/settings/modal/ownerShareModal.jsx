import React, { useEffect, useState } from "react";
import "../../meterReading/styles/MeterReadingConfirmModal.css";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { Percent, X } from "lucide-react";

const OwnerShareModal = ({ isOpen, onClose, onConfirm }) => {
  const [taxPercent, setTaxPercent] = useState("");
  const [reservePercent, setReservePercent] = useState("");
  const [zakatPercent, setZakatPercent] = useState("");
  const [charityPercent, setCharityPercent] = useState("");

  // Modal her açıldığında alanları sıfırla
  useEffect(() => {
    if (isOpen) {
      setTaxPercent("");
      setReservePercent("");
      setZakatPercent("");
      setCharityPercent("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Sadece rakam + nokta, virgülü noktaya çevir, fazla noktaları temizle ve 0–100 clamp
  const normalizeInput = (valOrEvent) => {
    const raw =
      typeof valOrEvent === "string"
        ? valOrEvent
        : valOrEvent?.target?.value ?? "";

    let cleaned = raw.replace(",", ".").replace(/[^0-9.]/g, "");

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

  const tax = toNumber(taxPercent);
  const reserve = toNumber(reservePercent);
  const zakat = toNumber(zakatPercent);
  const charity = toNumber(charityPercent);

  const totalPercent = tax + reserve + zakat + charity;
  const familyPercent = Math.max(0, 100 - totalPercent);

  const allZero = totalPercent === 0;
  const over100 = totalPercent > 100;

  const handleTaxChange = (valOrEvent) => {
    setTaxPercent(normalizeInput(valOrEvent));
  };

  const handleReserveChange = (valOrEvent) => {
    setReservePercent(normalizeInput(valOrEvent));
  };

  const handleZakatChange = (valOrEvent) => {
    setZakatPercent(normalizeInput(valOrEvent));
  };

  const handleCharityChange = (valOrEvent) => {
    setCharityPercent(normalizeInput(valOrEvent));
  };

  const handleConfirmClick = () => {
    if (allZero || over100) return;

    onConfirm &&
      onConfirm({
        taxPercent: tax,
        reservePercent: reserve,
        zakatPercent: zakat,
        charityPercent: charity,
      });
  };

  const isSubmitDisabled = allZero || over100;

  return (
    <div className="meter-modal-backdrop" role="presentation">
      <div
        className="meter-modal meter-modal-rtl"
        role="dialog"
        aria-modal="false"
        aria-labelledby="owner-share-title"
        dir="rtl"
        lang="fa"
      >
        <div className="meter-modal-accent-bar" />

        {/* HEADER */}
        <header className="tcm-header">
          <div className="tcm-header-left">
            <h2 id="owner-share-title" className="tcm-title">
              تقسیمات سهم مالک
            </h2>
            <p className="tcm-subtitle">
              فیصدی‌های مالیه، ریزرف، زکات و خیرات را مشخص کنید؛ باقی به خانواده
              می‌رسد.
            </p>
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
            {/* Sol sütun: Form */}
            <div className="meter-modal-left">
              <section className="meter-modal-section">
                <div className="meter-modal-form-column">
                  <div style={{ marginBottom: "0.75rem" }}>
                    <span className="meter-modal-footer-hint">
                      فیصدی استفاده شده: {totalPercent.toFixed(2)}٪ – فیصدی
                      باقی‌مانده برای خانواده: {familyPercent.toFixed(2)}٪
                    </span>
                  </div>

                  <Input
                    icon={Percent}
                    label="مالیه (%):"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    name="taxPercent"
                    value={taxPercent}
                    onChange={handleTaxChange}
                    placeholder="0-100"
                  />

                  <Input
                    icon={Percent}
                    label="ریزرف (%):"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    name="reservePercent"
                    value={reservePercent}
                    onChange={handleReserveChange}
                    placeholder="0-100"
                  />

                  <Input
                    icon={Percent}
                    label="زکات (%):"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    name="zakatPercent"
                    value={zakatPercent}
                    onChange={handleZakatChange}
                    placeholder="0-100"
                  />

                  <Input
                    icon={Percent}
                    label="خیرات (%):"
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*[.,]?[0-9]*"
                    name="charityPercent"
                    value={charityPercent}
                    onChange={handleCharityChange}
                    placeholder="0-100"
                  />
                </div>
              </section>
            </div>

            {/* Sağ sütun: Özet */}
            <aside className="meter-summary">
              <section className="meter-summary-card meter-summary-main">
                <div className="meter-summary-main-header">
                  <span className="meter-summary-main-label">
                    مجموع فیصدی کسرها
                  </span>
                  <div className="meter-summary-main-amount">
                    {totalPercent.toFixed(2)}%
                  </div>
                </div>
                <div className="meter-summary-row">
                  <span className="meter-summary-item-label">
                    سهم باقی‌مانده برای خانواده
                  </span>
                  <strong className="meter-summary-item-value">
                    {familyPercent.toFixed(2)}%
                  </strong>
                </div>
              </section>

              <section className="meter-summary-card">
                <h3 className="meter-summary-title mb-3">خلاصه تقسیمات</h3>

                <div className="meter-summary-list mt-1">
                  <div className="meter-summary-row">
                    <span className="meter-summary-item-label">مالیه</span>
                    <strong className="meter-summary-item-value">
                      {tax.toFixed(2)}%
                    </strong>
                  </div>

                  <div className="meter-summary-row">
                    <span className="meter-summary-item-label">ریزرف</span>
                    <strong className="meter-summary-item-value">
                      {reserve.toFixed(2)}%
                    </strong>
                  </div>

                  <div className="meter-summary-row">
                    <span className="meter-summary-item-label">زکات</span>
                    <strong className="meter-summary-item-value">
                      {zakat.toFixed(2)}%
                    </strong>
                  </div>

                  <div className="meter-summary-row">
                    <span className="meter-summary-item-label">خیرات</span>
                    <strong className="meter-summary-item-value">
                      {charity.toFixed(2)}%
                    </strong>
                  </div>

                    <div className="meter-summary-row">
                    <span className="meter-summary-item-label">اعضای خانواده</span>
                    <strong className="meter-summary-item-value">
                      {familyPercent.toFixed(2)}%
                    </strong>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="meter-modal-footer">
          <div className="meter-modal-footer-left">
            <span className="meter-modal-footer-hint">
              قبل از تأیید، فیصدی‌ها را یک‌بار دیگر چک کنید.
            </span>
          </div>
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

export default OwnerShareModal;
