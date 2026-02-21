import React, { useState } from "react";
import "../styles/ShopCard.css";
import { convertAfDate } from "../../../shared/date/convertAfDate";
// Button import yolunu projendeki gerçek konuma göre güncelle
import Button from "../../../shared/components/Button";

function getActivityText(shop) {
  if (!shop.hasTenant) return "بدون مستأجر";
  if (shop.businessActivity && shop.businessActivity.trim().length > 0) {
    return shop.businessActivity;
  }
  return "فعالیت ثبت نشده";
}

function getFranchiseText(shop) {
  if (!shop.hasFranchiseOwner) return "صاحب امتیاز ثبت نشده";
  if (
    shop.franchiseOwnerSummary &&
    shop.franchiseOwnerSummary.trim().length > 0
  ) {
    return shop.franchiseOwnerSummary;
  }
  return "صاحب امتیاز موجود";
}

function getContractStatusText(shop) {
  if (!shop.hasActiveContract) return "قرارداد فعال ندارد";

  if (shop.contractRemainingDays != null) {
    const days = shop.contractRemainingDays;
    if (days <= 0) return "نیاز به بررسی قرارداد";
    return `باقی‌مانده: ${days} روز`;
  }

  return "قرارداد فعال";
}

function getContractEndText(shop) {
  if (!shop.contractEndDate) return null;
  return convertAfDate(shop.contractEndDate, { monthStyle: "name" });
}

function getOccupancyBadge(shop) {
  // Sadece mesaj – renkleri neutral soft üzerinden çözüyoruz
  if (!shop.isActive) return { label: "غیرفعال", tone: "muted" };
  if (!shop.hasTenant) return { label: "خالی", tone: "warning" };
  return { label: "فعال", tone: "success" };
}

export default function ShopCard({ shop, onDetail }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!shop) return null;

  const title =
    shop.name && shop.name.trim().length > 0
      ? shop.name
      : "بدون نام";

  const activityText = getActivityText(shop);
  const franchiseText = getFranchiseText(shop);
  const contractStatusText = getContractStatusText(shop);
  const contractEndText = getContractEndText(shop);
  const occupancy = getOccupancyBadge(shop);

  const handleOpen = () => {
    setIsOpen(true);
  };

  const handleClose = (event) => {
    event.stopPropagation();
    setIsOpen(false);
  };

  const handleDetails = () => {
    if (typeof onDetail === "function") {
      onDetail(shop);
    }
  };

  return (
    <>
      {/* KÜÇÜK KART – liste görünümü */}
      <article
        className="shop-card"
        dir="rtl"
        aria-label={title}
        onClick={handleOpen}
      >
        <div className="shop-card__header">
          <div className="shop-card__titles">
            <div className="shop-card__name-badge" title={title}>
              <span className="shop-card__name-text">{title}</span>
            </div>

            <div className="shop-card__meta">
              <span className="shop-card__meta-item">
                مارکیت: {shop.marketName}
              </span>
              <span className="shop-card__meta-sep">•</span>
              <span className="shop-card__meta-item">
                طبقه: {shop.floorName}
              </span>
            </div>
          </div>

          <div
            className={`shop-card__badge shop-card__badge--${occupancy.tone}`}
          >
            <span className="shop-card__badge-dot" />
            <span>{occupancy.label}</span>
          </div>
        </div>

        <p className="shop-card__activity">
          {activityText}
        </p>

        <div className="shop-card__info-row">
          {shop.areaM2 != null && (
            <span className="shop-card__pill">
              <span className="shop-card__pill-label">مساحت</span>
              <span className="shop-card__pill-value">
                {shop.areaM2} متر مربع
              </span>
            </span>
          )}

          {shop.hasTenant && shop.tenantName && (
            <span className="shop-card__pill shop-card__pill--soft">
              <span className="shop-card__pill-label">مستأجر</span>
              <span className="shop-card__pill-value">
                {shop.tenantName}
              </span>
            </span>
          )}
        </div>
      </article>

      {/* MODAL – detay görünümü */}
      {isOpen && (
        <div
          className="shop-card-modal-overlay"
          onClick={handleClose}
        >
          <div
            className="shop-card-modal"
            dir="rtl"
            role="dialog"
            aria-modal="true"
            aria-label={`جزئیات دکان ${title}`}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shop-card-modal__header">
              <div className="shop-card-modal__titles">
                <div className="shop-card-modal__eyebrow">
                  اطلاعات دکان
                </div>
                <h2 className="shop-card-modal__name">
                  {title}
                </h2>
                <div className="shop-card-modal__meta">
                  <span>مارکیت: {shop.marketName}</span>
                  <span className="shop-card-modal__separator">•</span>
                  <span>طبقه: {shop.floorName}</span>
                  {shop.areaM2 != null && (
                    <>
                      <span className="shop-card-modal__separator">•</span>
                      <span>مساحت: {shop.areaM2} متر مربع</span>
                    </>
                  )}
                </div>
              </div>

              <div
                className={`shop-card__badge shop-card__badge--${occupancy.tone} shop-card-modal__badge`}
              >
                <span className="shop-card__badge-dot" />
                <span>{occupancy.label}</span>
              </div>
            </header>

            <section className="shop-card-modal__body">
              <div className="shop-card-modal__grid">
                <div className="shop-card-modal__group">
                  <h3 className="shop-card-modal__group-title">
                    وضعیت قرارداد
                  </h3>
                  <dl className="shop-card-modal__dl">
                    <div className="shop-card-modal__row">
                      <dt>وضعیت:</dt>
                      <dd>{contractStatusText}</dd>
                    </div>
                    {contractEndText && (
                      <div className="shop-card-modal__row">
                        <dt>پایان قرارداد:</dt>
                        <dd>{contractEndText}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="shop-card-modal__group">
                  <h3 className="shop-card-modal__group-title">
                    مستأجر و امتیاز
                  </h3>
                  <dl className="shop-card-modal__dl">
                    <div className="shop-card-modal__row">
                      <dt>مستأجر:</dt>
                      <dd>
                        {shop.hasTenant && shop.tenantName
                          ? shop.tenantName
                          : "بدون مستأجر"}
                      </dd>
                    </div>
                    <div className="shop-card-modal__row">
                      <dt>صاحب امتیاز:</dt>
                      <dd>{franchiseText}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="shop-card-modal__group shop-card-modal__group--full">
                <h3 className="shop-card-modal__group-title">
                  فعالیت تجاری
                </h3>
                <p className="shop-card-modal__text">
                  {activityText}
                </p>
              </div>
            </section>

            <footer className="shop-card-modal__footer">
              <div className="shop-card-modal__actions">
                <Button
                  size="md"
                  onClick={handleDetails}
                  className="shop-card-modal__primary"
                >
                  مشاهده جزئیات
                </Button>
                <Button
                  size="md"
                  variant="soft"
                  onClick={handleClose}
                >
                  بستن
                </Button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
