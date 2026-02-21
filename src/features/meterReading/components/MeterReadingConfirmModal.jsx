import React, { useMemo, useState } from "react";
import ReactDOM from "react-dom";

import "../styles/MeterReadingConfirmModal.css";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { HandCoins, NotebookPen, Plug2, X } from "lucide-react";

const safeGetValue = (input) => {
  if (input && typeof input === "object" && "target" in input) {
    return input.target?.value ?? "";
  }
  if (typeof input === "string" || typeof input === "number") {
    return String(input);
  }
  return "";
};

const MeterReadingConfirmModalContent = ({
  isOpen,
  onClose,
  onConfirm,
  lastReading,
  currencySymbol = "؋", // AFN
}) => {
  if (!isOpen) return null;

  const previousIndex = lastReading?.index ?? lastReading?.consumption ?? 0;
  const initialUnitPrice = lastReading?.unitPrice ?? 0;
  const lastNetAmount = lastReading?.amount ?? null;
  
  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";

  const [todayIndex, setTodayIndex] = useState("");
  const [unitPrice, setUnitPrice] = useState(
    initialUnitPrice ? String(initialUnitPrice) : ""
  );
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [description, setDescription] = useState("");

  const todayConsumption = useMemo(() => {
    const prev = Number(previousIndex) || 0;
    const today = Number(todayIndex) || 0;
    const diff = today - prev;
    return diff > 0 ? diff : 0;
  }, [previousIndex, todayIndex]);

  const todaysTotalAmount = useMemo(() => {
    const price = Number(unitPrice) || 0;
    return todayConsumption * price;
  }, [todayConsumption, unitPrice]);

  const handleTodayIndexChange = (val) => {
    setTodayIndex(safeGetValue(val));
  };

  const handleUnitPriceChange = (val) => {
    setUnitPrice(safeGetValue(val));
  };

  const handleDescriptionChange = (val) => {
    setDescription(safeGetValue(val));
  };

  const handleConfirmClick = () => {
    if (!isConfirmed) return;

    const payload = {
      todayIndex: Number(todayIndex) || 0,
      unitPrice: Number(unitPrice) || 0,
      todayConsumption,
      description: description?.trim() || null,
      isConfirmed,
    };

    onConfirm?.(payload);
  };


  return (
    <div
      className="mr-backdrop"
      role="presentation"
    >
      <div
        className="mr-modal mr-modal-rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mr-title"
        dir="rtl"
        lang="fa"
      >
        {/* Üst ince accent bar */}
        <div className="mr-accent-bar" />

        {/* HEADER */}
        <header className="mr-header">
          <div className="mr-header-left">
            <h2 id="mr-title" className="mr-title">
              ثبت صرفیه برق
            </h2>
            <p className="mr-subtitle">
              قرائت امروز را ثبت کنید تا مبلغ امروز و مجموع ماه به‌روز شود.
            </p>
          </div>

          <div className="mr-header-right">
            <Button
              type="button"
              primaryColor={dangerColor}
              iconOnly
              icon={X}
              aria-label="بستن"
              onClick={onClose}
            />
          </div>
        </header>

        {/* BODY */}
        <div className="mr-body">
          <div className="mr-layout">
            {/* SOL: FORM BLOĞU */}
            <section className="mr-column mr-column-left">
              <div className="mr-card mr-card-form">
                <div className="mr-card-header">
                  <h3 className="mr-card-title">اطلاعات قرائت امروز</h3>
                  <p className="mr-card-subtitle">
                    شاخص امروز، فی‌کیلووات و نوضیحات را وارد کنید.
                  </p>
                </div>

                <div className="mr-form-grid">
                  <Input
                    icon={Plug2}
                    label="صرفیه گذشته"
                    value={previousIndex ?? ""}
                    disabled
                    type="number"
                    name="previousIndex"
                    placeholder="شاخص قبلی"
                  />

                  <Input
                    icon={Plug2}
                    label="صرفیه حالیه"
                    type="number"
                    name="todayIndex"
                    value={todayIndex}
                    onChange={handleTodayIndexChange}
                    placeholder="قرائت امروز"
                    maxLength={6}
                  />

                  <Input
                    icon={HandCoins}
                    label="قیمت فی‌کیلووات"
                    type="number"
                    name="unitPrice"
                    value={unitPrice}
                    onChange={handleUnitPriceChange}
                    placeholder="قیمت هر kWh"
                  />
                </div>

                <div className="mr-form-footer">
                  <Input
                    multiline
                    rows={3}
                    type="text"
                    icon={NotebookPen}
                    label="نوضیحات (اختیاری)"
                    name="description"
                    value={description}
                    onChange={handleDescriptionChange}
                    placeholder="در صورت نیاز توضیح بنویسید..."
                  />
                </div>
              </div>
            </section>

            {/* SAĞ: ÖZET BLOĞU */}
            <section className="mr-column mr-column-right">
              {/* Bu okuma özeti */}
              <div className="mr-card mr-summary-main">
                <div className="mr-summary-main-body">
                  <div className="mr-summary-row mr-summary-row-total">
                    <div className="mr-summary-label-block">
                      <span className="mr-summary-label">مبلغ قابل پرداخت</span>
                      <span className="mr-summary-label-help">
                        براساس صرفیه و فی‌کیلووات امروز
                      </span>
                    </div>
                    <div className="mr-summary-amount mr-ltr">
                      {currencySymbol}{" "}
                      {todaysTotalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="mr-summary-list">
                    <div className="mr-summary-row">
                      <span className="mr-summary-item-label">
                        مصرف این دوره
                      </span>
                      <strong className="mr-summary-item-value mr-ltr">
                        {todayConsumption} kWh
                      </strong>
                    </div>

                    <div className="mr-summary-row">
                      <span className="mr-summary-item-label">
                        فی‌کیلووات فعلی
                      </span>
                      <strong className="mr-summary-item-value mr-ltr">
                        {unitPrice
                          ? `${currencySymbol} ${Number(unitPrice).toFixed(2)}`
                          : "-"}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Son okuma kartı */}
              <div className="mr-card mr-summary-secondary">
                <div className="mr-card-header">
                  <h3 className="mr-card-title">آخرین قرائت ثبت‌شده</h3>
                </div>

                <div className="mr-summary-list">
                  <div className="mr-summary-row">
                    <span className="mr-summary-item-label">دوره</span>
                    <strong className="mr-summary-item-value">
                      {lastReading?.date ?? "-"}
                    </strong>
                  </div>

                  <div className="mr-summary-row">
                    <span className="mr-summary-item-label">
                      صرفیه گذشته
                    </span>
                    <strong className="mr-summary-item-value">
                      {previousIndex ?? "-"}
                    </strong>
                  </div>

                  <div className="mr-summary-row">
                    <span className="mr-summary-item-label">
                      فی‌کیلووات گذشته
                    </span>
                    <strong className="mr-summary-item-value mr-ltr">
                      {initialUnitPrice
                        ? `${currencySymbol} ${initialUnitPrice.toFixed(2)}`
                        : "-"}
                    </strong>
                  </div>

                  <div className="mr-summary-row">
                    <span className="mr-summary-item-label">
                      مبلغ خالص آخرین دوره
                    </span>
                    <strong className="mr-summary-item-value mr-ltr">
                      {lastNetAmount != null
                        ? `${currencySymbol} ${lastNetAmount.toFixed(2)}`
                        : "-"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Onay alanı */}
              <div className="mr-card mr-consent-card">
                <label className="mr-checkbox-row">
                  <input
                    type="checkbox"
                    checked={isConfirmed}
                    onChange={(e) => setIsConfirmed(e.target.checked)}
                  />
                  <div className="mr-checkbox-text">
                    <span className="mr-checkbox-title">
                      مبلغ ماهانهٔ قرارداد به بدهی اضافه شود؟
                    </span>
                    <span className="mr-checkbox-help">
                      این گزینه فعال باشد، مبلغ ثابت ماهانه نیز به بدهی
                      اضافه می‌گردد.
                    </span>
                  </div>
                </label>
              </div>
            </section>
          </div>
        </div>

        {/* FOOTER */}
        <footer className="mr-footer">
          <div className="mr-footer-left">
            <span className="mr-footer-hint">
              قبل از تأیید، صرفیه این دوره و فی‌کیلووات وارد شده را یک بار دیگر
              بررسی کنید.
            </span>
          </div>
          <div className="mr-footer-actions">
            <Button type="button" onClick={onClose} primaryColor={dangerColor}>
              لغو
            </Button>

            <Button
              type="button"
              onClick={handleConfirmClick}
              disabled={!isConfirmed || !todayIndex || !unitPrice}
              primaryColor={primaryColor}
            >
              ثبت و تأیید قرائت
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
};

const MeterReadingConfirmModal = (props) => {
  if (!props.isOpen) return null;

  return ReactDOM.createPortal(
    <MeterReadingConfirmModalContent {...props} />,
    document.body
  );
};

export default MeterReadingConfirmModal;
