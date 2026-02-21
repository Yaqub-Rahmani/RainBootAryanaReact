import React, { useState, useEffect, useMemo } from "react";
import "../styles/ShopFilterModal.css";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect";
import { X } from "lucide-react";

function triStateValue(yes, no) {
  if (yes && !no) return true;
  if (!yes && no) return false;
  return null;
}

// Tri-state grupların key haritası
const triGroups = {
  hasFranchiseOwner: {
    yesKey: "hasFranchiseOwnerYes",
    noKey: "hasFranchiseOwnerNo",
  },
  hasTenant: {
    yesKey: "hasTenantYes",
    noKey: "hasTenantNo",
  },
  isActive: {
    yesKey: "isActiveYes",
    noKey: "isActiveNo",
  },
};

// Bu modalın yönettiği alanlar
const MODAL_DEFAULTS = {
  marketIds: [], // tek seçim ama backend için array
  floorId: null,

  hasFranchiseOwnerYes: false,
  hasFranchiseOwnerNo: false,
  hasTenantYes: false,
  hasTenantNo: false,
  isActiveYes: false,
  isActiveNo: false,
};

// SmartSelect value normalizasyonu
const normalizeOption = (opt) => {
  if (!opt) return "";
  if (typeof opt === "string" || typeof opt === "number") return String(opt);
  if (typeof opt === "object" && "value" in opt) return String(opt.value);
  return "";
};

export default function ShopFilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters,
  markets = [], // [{ id, marketName }] veya [{ id, name }]
  floors = [], // [{ id, floorName, marketId }] veya [{ id, name, marketId }]
  marketsLoading = false,
  floorsLoading = false,
}) {
  const [filters, setFilters] = useState({
    ...(initialFilters || {}),
    ...MODAL_DEFAULTS,
  });

  // Modal açıldığında dışarıdaki filtreleri yeniden baz al
  useEffect(() => {
    if (isOpen) {
      setFilters({
        ...(initialFilters || {}),
        ...MODAL_DEFAULTS,
      });
    }
  }, [isOpen, initialFilters]);

  const hasSelectedMarket = filters.marketIds && filters.marketIds.length > 0;
  const selectedMarketId = hasSelectedMarket
    ? String(filters.marketIds[0])
    : "";

  const marketOptions = useMemo(
    () =>
      (markets || []).map((m) => ({
        value: String(m.id),
        label: m.marketName || m.name || "(بدون نام)",
      })),
    [markets]
  );

  const floorOptions = useMemo(
    () =>
      (floors || [])
        .filter((f) =>
          !selectedMarketId ? true : String(f.marketId) === selectedMarketId
        )
        .map((f) => ({
          value: String(f.id),
          label: f.floorName || f.name || "(بدون نام)",
        })),
    [floors, selectedMarketId]
  );

  const updateField = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  // Grup içinde tek seçim: YES seçilirse NO kapalı, NO seçilirse YES kapalı
  const setTri = (group, value) => {
    const config = triGroups[group];
    if (!config) return;

    const { yesKey, noKey } = config;

    setFilters((prev) => ({
      ...prev,
      [yesKey]: value === "yes",
      [noKey]: value === "no",
    }));
  };

  const handleClear = () => {
    setFilters((prev) => ({
      ...prev,
      ...MODAL_DEFAULTS,
    }));
  };

  const handleApply = () => {
    const base = initialFilters || {};

    const payload = {
      ...base,
      marketIds:
        filters.marketIds && filters.marketIds.length
          ? filters.marketIds
          : null,
      floorId: filters.floorId || null,
      hasFranchiseOwner: triStateValue(
        filters.hasFranchiseOwnerYes,
        filters.hasFranchiseOwnerNo
      ),
      hasTenant: triStateValue(filters.hasTenantYes, filters.hasTenantNo),
      isActive: triStateValue(filters.isActiveYes, filters.isActiveNo),
    };

    if (typeof onApply === "function") {
      onApply(payload);
    }
    if (typeof onClose === "function") {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="shop-filter-modal-overlay">
      <div
        className="shop-filter-modal"
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="فیلترهای دکان‌ها"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="shop-filter-modal__header">
          <div className="shop-filter-modal__title-wrap">
            <h2 className="shop-filter-modal__title">فیلترها</h2>
            <p className="shop-filter-modal__subtitle">
              دکان‌ها را بر اساس موقعیت و وضعیت نمایش دهید.
            </p>
          </div>

          <div className="shop-filter-modal__header-actions">
            <button
              type="button"
              className="shop-filter-modal__link"
              onClick={handleClear}
            >
              پاک کردن
            </button>
            <Button
              type="button"
              iconOnly
              icon={X}
              aria-label="بستن"
              onClick={onClose}
            />
          </div>
        </header>

        <section className="shop-filter-modal__body">
          {/* GENEL */}
          <div className="shop-filter-modal__section">
            <h3 className="shop-filter-modal__section-title">عمومی</h3>
            <div className="shop-filter-modal__grid">
              {/* Market (SmartSelect) */}
              <div className="shop-filter-modal__field">
                <label className="shop-filter-modal__label">مارکیت</label>

                <SmartSelect
                  options={marketOptions}
                  value={hasSelectedMarket ? selectedMarketId : null}
                  onChange={(opt) => {
                    const val = normalizeOption(opt);
                    setFilters((prev) => ({
                      ...prev,
                      marketIds: val ? [val] : [],
                      floorId: null,
                    }));
                  }}
                  placeholder={
                    marketsLoading
                      ? "در حال بارگذاری مارکیت..."
                      : marketOptions.length === 0
                      ? "هیچ مارکیتی ثبت نشده"
                      : "انتخاب مارکیت"
                  }
                  clearable
                  searchable
                  size="md"
                  disabled={marketsLoading}
                />
              </div>

              {/* Floor (SmartSelect) */}
              <div className="shop-filter-modal__field">
                <label className="shop-filter-modal__label">طبقه</label>

                <SmartSelect
                  options={floorOptions}
                  value={filters.floorId ? String(filters.floorId) : null}
                  onChange={(opt) => {
                    const val = normalizeOption(opt);
                    updateField("floorId", val || null);
                  }}
                  placeholder={
                    !hasSelectedMarket
                      ? "اول مارکیت را انتخاب کنید."
                      : floorsLoading
                      ? "در حال بارگذاری طبقه..."
                      : floorOptions.length === 0
                      ? "برای این مارکیت طبقه موجود نیست"
                      : "انتخاب طبقه"
                  }
                  clearable
                  searchable
                  size="md"
                  disabled={!hasSelectedMarket || floorsLoading}
                />
              </div>
            </div>
          </div>

          {/* KİRACI & FRANCHISE */}
          <div className="shop-filter-modal__section">
            <h3 className="shop-filter-modal__section-title">
              صاحب امتیاز و کرایه‌داری
            </h3>
            <div className="shop-filter-modal__grid">
              {/* Franchise */}
              <div className="shop-filter-modal__field">
                <div className="shop-filter-modal__label-row">
                  <span className="shop-filter-modal__label">وضعیت امتیاز</span>
                </div>
                <div className="shop-filter-modal__tri">
                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.hasFranchiseOwnerYes}
                      onChange={() => setTri("hasFranchiseOwner", "yes")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">امتیازدار</span>
                    </span>
                  </label>

                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.hasFranchiseOwnerNo}
                      onChange={() => setTri("hasFranchiseOwner", "no")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">بدون امتیاز</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Kiracı */}
              <div className="shop-filter-modal__field">
                <div className="shop-filter-modal__label-row">
                  <span className="shop-filter-modal__label">
                    وضعیت کرایه‌داری
                  </span>
                </div>
                <div className="shop-filter-modal__tri">
                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.hasTenantYes}
                      onChange={() => setTri("hasTenant", "yes")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">دارای مستأجر</span>
                    </span>
                  </label>

                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.hasTenantNo}
                      onChange={() => setTri("hasTenant", "no")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">خالی</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* DURUM */}
          <div className="shop-filter-modal__section">
            <h3 className="shop-filter-modal__section-title">وضعیت دکان</h3>
            <div className="shop-filter-modal__grid shop-filter-modal__grid--compact">
              <div className="shop-filter-modal__field">
                <div className="shop-filter-modal__tri">
                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.isActiveYes}
                      onChange={() => setTri("isActive", "yes")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">فعال</span>
                    </span>
                  </label>

                  <label className="tri-toggle">
                    <input
                      type="checkbox"
                      className="tri-toggle__input"
                      checked={!!filters.isActiveNo}
                      onChange={() => setTri("isActive", "no")}
                    />
                    <span className="tri-toggle__pill">
                      <span className="tri-toggle__dot" />
                      <span className="tri-toggle__text">غیرفعال</span>
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="shop-filter-modal__footer">
          <div className="shop-filter-modal__actions">
            <Button
              size="md"
              className="shop-filter-modal__apply"
              onClick={handleApply}
            >
              اعمال فیلترها
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
