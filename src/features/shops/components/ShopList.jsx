import React, { useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import ShopCard from "./ShopCard";
import "../styles/ShopList.css";

import { fetchShops } from "../slices/shopSlice";
import {
  selectShops,
  selectShopStatus,
  selectShopError,
} from "../selectors/shopSelectors";

export default function ShopList({
  q = "",          // tek arama metni
  filters = null,  // gelişmiş filtreler
  onDetail,
}) {
  const dispatch = useDispatch();

  const shops = useSelector(selectShops);
  const status = useSelector(selectShopStatus);
  const error = useSelector(selectShopError);
  const sortedShops = [...shops].sort(
  (a, b) => (b.hasActiveContract ? 1 : 0) - (a.hasActiveContract ? 1 : 0)
);

  useEffect(() => {
    if (status === "idle") {
      dispatch(fetchShops());
    }
  }, [status, dispatch]);

  const normalizedQ = q.trim().toLowerCase();

  const filteredShops = useMemo(() => {
    if (!sortedShops) return [];

    return sortedShops.filter((shop) => {
      // --- Global hızlı arama ---
      if (normalizedQ) {
        const haystack = [
          shop.name,
          shop.marketName,
          shop.floorName,
          shop.tenantName,
          shop.businessActivity,
          shop.franchiseOwnerSummary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedQ)) {
          return false;
        }
      }

      // --- Gelişmiş filtre objesi ---
      const f = filters || {};

      // Market (multi-select)
      if (f.marketIds && Array.isArray(f.marketIds) && f.marketIds.length > 0) {
        if (!f.marketIds.includes(String(shop.marketId))) {
          return false;
        }
      }

      // Floor
      if (f.floorId) {
        if (String(shop.floorId) !== String(f.floorId)) {
          return false;
        }
      }

      // Name (contains)
      if (f.name) {
        const name = (shop.name || "").toLowerCase();
        if (!name.includes(f.name.toLowerCase())) {
          return false;
        }
      }

      // ShopCode
      if (f.shopCode) {
        const code = (shop.shopCode || "").toLowerCase();
        if (!code.includes(f.shopCode.toLowerCase())) {
          return false;
        }
      }

      // HasActiveContract – tri-state
      if (typeof f.hasActiveContract === "boolean") {
        if (shop.hasActiveContract !== f.hasActiveContract) {
          return false;
        }
      }

      // HasTenant – tri-state (yalnızca gelişmiş filtreye bak)
      if (typeof f.hasTenant === "boolean") {
        if (shop.hasTenant !== f.hasTenant) {
          return false;
        }
      }

      // TenantName
      if (f.tenantName) {
        const tenantName = (shop.tenantName || "").toLowerCase();
        if (!tenantName.includes(f.tenantName.toLowerCase())) {
          return false;
        }
      }

      // BusinessActivity
      if (f.businessActivity) {
        const activity = (shop.businessActivity || "").toLowerCase();
        if (!activity.includes(f.businessActivity.toLowerCase())) {
          return false;
        }
      }

      // HasFranchiseOwner – tri-state
      if (typeof f.hasFranchiseOwner === "boolean") {
        if (shop.hasFranchiseOwner !== f.hasFranchiseOwner) {
          return false;
        }
      }

      // FranchiseOwnerSummary
      if (f.franchiseOwnerSummary) {
        const fo = (shop.franchiseOwnerSummary || "").toLowerCase();
        if (!fo.includes(f.franchiseOwnerSummary.toLowerCase())) {
          return false;
        }
      }

      // Area range
      if (f.areaFrom != null) {
        if (shop.areaM2 == null || Number(shop.areaM2) < Number(f.areaFrom)) {
          return false;
        }
      }
      if (f.areaTo != null) {
        if (shop.areaM2 == null || Number(shop.areaM2) > Number(f.areaTo)) {
          return false;
        }
      }

      // ContractEndDate range
      if (f.contractEndFrom) {
        if (!shop.contractEndDate || shop.contractEndDate < f.contractEndFrom) {
          return false;
        }
      }
      if (f.contractEndTo) {
        if (!shop.contractEndDate || shop.contractEndDate > f.contractEndTo) {
          return false;
        }
      }

      // RemainingDays range
      if (f.remainingDaysFrom != null) {
        if (
          shop.contractRemainingDays == null ||
          Number(shop.contractRemainingDays) < Number(f.remainingDaysFrom)
        ) {
          return false;
        }
      }
      if (f.remainingDaysTo != null) {
        if (
          shop.contractRemainingDays == null ||
          Number(shop.contractRemainingDays) > Number(f.remainingDaysTo)
        ) {
          return false;
        }
      }

      // IsActive – tri-state
      if (typeof f.isActive === "boolean") {
        if (shop.isActive !== f.isActive) {
          return false;
        }
      }

      return true;
    });

  }, [sortedShops, normalizedQ, filters]);

  const handleDetail = useCallback(
    (shop) => {
      if (typeof onDetail === "function") {
        onDetail(shop);
      }
    },
    [onDetail]
  );

  if (status === "loading") {
    return (
      <div className="shop-list shop-list--loading">
        <div className="shop-list__state">
          <p>دکان‌ها در حال بارگذاری است…</p>
        </div>
      </div>
    );
  }

  if (status === "failed") {
    return (
      <div className="shop-list shop-list--error">
        <div className="shop-list__state">
          <p>خطا رخ داد.</p>
          {error && (
            <pre className="shop-list__error-message">
              {String(error)}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (!filteredShops.length) {
    return (
      <div className="shop-list shop-list--empty">
        <div className="shop-list__state">
          <p>هیچ دکانی مطابق فیلترها پیدا نشد.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="shop-list">
      {filteredShops.map((shop) => (
        <ShopCard
          key={shop.id}
          shop={shop}
          onDetail={handleDetail}
        />
      ))}
    </div>
  );
}
