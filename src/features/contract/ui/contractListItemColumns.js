import React from "react";
import SmartSelect from "../../../shared/components/SmartSelect";
import { Ellipsis } from "lucide-react";
import { convertAfDate } from "../../../shared/date/convertAfDate";

// fmtMoney, convertAfDate dışarıdan import et
// import { fmtMoney, convertAfDate } from "...";
const fmtMoney = (n) => {
  if (n === null || n === undefined) return "-";
  const v = Number(n);
  if (Number.isNaN(v)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};


import { useMemo } from "react";
// SmartSelect, convertAfDate, fmtMoney, actionOptions, handleRowAction importlarını senin projene göre koru

export const useContractListItemColumns = ({
  actionOptions,
  handleRowAction,
}) => {
  const columns = useMemo(
    () => [
      // ====== Hidden / Grouping ======
      {
        key: "marketName",
        header: "مارکیت",
        visible: false,
        serverField: "MarketName",
        sortable: true,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
      },
      {
        key: "floorName",
        header: "طبقه",
        visible: false,
        type: "text",
        serverField: "FloorName",
        sortable: true,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
      },

      // ====== Main columns ======
      {
        key: "shopName",
        header: "نام دکان",
        serverField: "ShopName",
        sortable: true,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
      },
      {
        key: "tenantName",
        header: "کرایه‌دار",
        serverField: "TenantName",
        sortable: true,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
      },
      {
        key: "businessActivity",
        header: "فعالیت دکان",
        serverField: "BusinessActivity",
        sortable: true,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
      },

      // Franchise
      {
        key: "franchiseSummary",
        header: "امتیازدار",
        serverField: "FranchiseSummary",
        sortable: false,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
        render: (v, row) =>
          !v
            ? row.franchiseOwnersCount > 0
              ? `امتیازدار: ${row.franchiseOwnersCount}`
              : "—"
            : v,
      },

      // Dates
      {
        key: "contractStartDate",
        header: "شروع تاریخ",
        visible: false,
        serverField: "ContractStartDate",
        sortable: true,
        filterType: "dateRange",
        render: (_v, r) =>
          r.contractStartDate
            ? convertAfDate(r.contractStartDate, { monthStyle: "name" })
            : "—",
      },
      {
        key: "contractEndDate",
        header: "پایان تاریخ",
        visible: false,
        serverField: "ContractEndDate",
        sortable: true,
        filterType: "dateRange",
        render: (_v, r) =>
          r.contractEndDate
            ? convertAfDate(r.contractEndDate, { monthStyle: "name" })
            : "—",
      },

      // Amounts (fixed rent breakdown)
      {
        key: "ownerPortionAmount",
        header: "سهم مالک",
        visible: false,
        serverField: "OwnerPortionAmount",
        sortable: true,
        render: (v) => fmtMoney(v),
      },
      {
        key: "marketPortionAmount",
        header: "سهم مارکیت",
        visible: false,
        serverField: "MarketPortionAmount",
        sortable: true,
        render: (v) => fmtMoney(v),
      },
      {
        key: "franchisePortionAmount",
        header: "سهم امتیاز",
        visible: false,
        serverField: "FranchisePortionAmount",
        sortable: true,
        render: (v) => fmtMoney(v),
      },
      {
        key: "totalFixedRent",
        header: "جمع ثابت",
        visible: false,
        serverField: "TotalFixedRent",
        sortable: true,
        render: (v) => fmtMoney(v),
      },

      // Electricity
      {
        key: "electricityThisPeriodTotal",
        header: "برق (ماه جاری)",
        visible: false,
        serverField: "ElectricityThisPeriodTotal",
        sortable: true,
        render: (v) => (v == null ? "-" : fmtMoney(v)),
      },

      // Debt
      {
        key: "oldDebtTotal",
        header: "باقی‌داری گذشته",
        serverField: "OldDebtTotal",
        sortable: true,
        render: (v) => fmtMoney(v),
      },

      // Due day
      {
        key: "dueDayOfMonth",
        header: "روز رسید",
        serverField: "DueDayOfMonth",
        sortable: true,
        filterType: "number",
        render: (v) => (v == null ? "—" : String(v)),
      },

      // Actions (client-only)
      {
        key: "actions",
        header: "عملیات",
        align: "center",
        sortable: false,
        render: (_v, row) => (
          <SmartSelect
            options={actionOptions}
            value={null}
            onChange={(opt) => handleRowAction(opt, row)}
            placeholder="بیشتر..."
            searchable={false}
            clearable={false}
            size="sm"
            dir="rtl"
            iconOnly
            icon={Ellipsis}
          />
        ),
      },
    ],
    [actionOptions, handleRowAction]
  );

  return columns;
};
