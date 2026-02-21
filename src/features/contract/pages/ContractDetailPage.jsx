import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";

import {
  AlertTriangle,
  Loader2,
  FileText,
  Download,
  Zap,
  HandCoins,
  Store,
  User2,
  CalendarRange,
  PieChart,
  BarChart3,
  Filter as FilterIcon,
  Trash2,
} from "lucide-react";

import Button from "../../../shared/components/Button";
import CustomTable from "../../../shared/components/CustomTable";
import CustomDatePicker from "../../../shared/date/CustomDatePicker";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { convertAfDate } from "../../../shared/date/convertAfDate";

import { fetchContractDetail, clearDetail } from "../slices/contractSlice";

import MeterReadingConfirmModal from "../../meterReading/components/MeterReadingConfirmModal";
import AddDebtsModal from "../../collection/components/addDebtsModal";

import "../styles/ContractDetailPage.css";

import { addContractDebtPayment } from "../../collection/slices/collectionSlice";
import {
  addMeterReading,
  fetchMeterReadingNewContext,
} from "../../meterReading/slices/meterReadingSlice";
import { mapNewContextToLastReading } from "../services/mapLastReading";

/* ---------- Helpers ---------- */

const fmtMoney = (n) => {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

const getStatusInfo = (status) => {
  switch (status) {
    case 1:
      return { text: "فعال", mod: "active" };
    case 2:
      return { text: "آرشیف شده", mod: "archived" };
    default:
      return { text: "نامعلوم", mod: "unknown" };
  }
};

const parseDateSafe = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const guid = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

const safePart = (v) =>
  String(v ?? "")
    .trim()
    .replace(/[^\w-]+/g, "_")
    .slice(0, 60) || "all";

/* ---------- Component ---------- */

export default function ContractDetailPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { show, hide } = useGlobalLoading();

  const detail = useSelector((s) => s.contract.detail);
  const status = useSelector((s) => s.contract.detailStatus);
  const error = useSelector((s) => s.contract.detailError);

  const [activeTab, setActiveTab] = useState("summary");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [meterModalOpen, setMeterModalOpen] = useState(false);
  const [debtsModalOpen, setDebtsModalOpen] = useState(false);

  const newContext = useSelector((s) => s.meterReading.newContext);

  const contractId = detail?.contractId;
  const shopId = detail?.shopId;

  useEffect(() => {
    if (contractId) dispatch(fetchMeterReadingNewContext(contractId));
  }, [contractId, dispatch]);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchContractDetail(id));
    return () => {
      dispatch(clearDetail());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (status === "loading") show();
    else hide();
    return () => hide();
  }, [status, show, hide]);

  const lastReading = useMemo(
    () => mapNewContextToLastReading(newContext?.data),
    [newContext?.data]
  );

  const statusInfo = useMemo(
    () => getStatusInfo(detail?.status),
    [detail?.status]
  );

  const hasOldDebt = (detail?.oldOutstanding ?? 0) > 0;

  const isNearEnd = useMemo(() => {
    if (!detail?.endDate) return false;
    const end = parseDateSafe(detail.endDate);
    if (!end) return false;
    const today = new Date();
    const diffDays = (end - today) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 60;
  }, [detail?.endDate]);

  const isWithinFilter = useCallback(
    (dateValue) => {
      if (!dateValue) return true;
      const base = parseDateSafe(dateValue);
      if (!base) return true;

      if (fromDate) {
        const f = new Date(fromDate);
        if (base < f) return false;
      }
      if (toDate) {
        const t = new Date(toDate);
        t.setHours(23, 59, 59, 999);
        if (base > t) return false;
      }
      return true;
    },
    [fromDate, toDate]
  );

  const hasDateFilter = Boolean(fromDate || toDate);

  const overview = useMemo(
    () => ({
      fixedRentTotal: detail?.totalFixedRent ?? 0,
      fixedRentOwner: detail?.ownerPortionAmount ?? 0,
      fixedRentMarket: detail?.marketPortionAmount ?? 0,
      fixedRentFranchise: detail?.franchisePortionAmount ?? 0,
      currentAccrualTotal: detail?.currentPeriodAccrualTotal ?? 0,
      debtTotal: detail?.totalOutstanding ?? 0,
      debtCurrent: detail?.currentPeriodOutstanding ?? 0,
      debtOld: detail?.oldOutstanding ?? 0,
    }),
    [
      detail?.totalFixedRent,
      detail?.ownerPortionAmount,
      detail?.marketPortionAmount,
      detail?.franchisePortionAmount,
      detail?.currentPeriodAccrualTotal,
      detail?.totalOutstanding,
      detail?.currentPeriodOutstanding,
      detail?.oldOutstanding,
    ]
  );

  const accrualColumns = useMemo(
    () => [
      { key: "period", header: "سال / ماه", minWidth: 120, type: "text" },
      {
        key: "ownerAmount",
        header: "مالک",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "marketAmount",
        header: "مارکیت",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "franchiseAmount",
        header: "امتیاز",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "electricityAmount",
        header: "برق",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "totalAmount",
        header: "جمع",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "outstandingAmount",
        header: "باقی‌داری",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
    ],
    []
  );

  const accrualRows = useMemo(
    () =>
      (detail?.accrualHistory || []).map((a, i) => ({
        id: `${a.year}-${a.month}-${i}`,
        period: `${a.year}/${String(a.month).padStart(2, "0")}`,
        ownerAmount: a.ownerAmount,
        marketAmount: a.marketAmount,
        franchiseAmount: a.franchiseAmount,
        electricityAmount: a.electricityAmount,
        totalAmount: a.totalAmount,
        outstandingAmount: a.outstandingAmount,
      })),
    [detail?.accrualHistory]
  );

  const collectionColumns = useMemo(
    () => [
      {
        key: "paidAtUtc",
        header: "تاریخ",
        minWidth: 140,
        type: "date",
        render: (v) => (v ? convertAfDate(v, { monthStyle: "name" }) : "—"),
      },
      {
        key: "amountReceived",
        header: "مبلغ رسید",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "ownerAllocated",
        header: "سهم مالک",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "marketAllocated",
        header: "سهم مارکیت",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "franchiseAllocated",
        header: "سهم امتیاز",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "electricityAllocated",
        header: "پرداخت برق",
        minWidth: 130,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      { key: "notes", header: "شرح", minWidth: 220, type: "text" },
    ],
    []
  );

  const collectionRows = useMemo(
    () =>
      (detail?.collectionHistory || [])
        .filter((c) => isWithinFilter(c.paidAtUtc))
        .map((c, i) => ({
          id: c.collectionId || i,
          paidAtUtc: c.paidAtUtc,
          amountReceived: c.amountReceived,
          ownerAllocated: c.ownerAllocated,
          marketAllocated: c.marketAllocated,
          franchiseAllocated: c.franchiseAllocated,
          electricityAllocated: c.electricityAllocated,
          notes: c.notes || "—",
        })),
    [detail?.collectionHistory, isWithinFilter]
  );

  const paymentSummary = useMemo(() => {
    const base = {
      total: 0,
      owner: 0,
      market: 0,
      franchise: 0,
      electricity: 0,
    };
    for (const c of collectionRows) {
      base.total += Number(c.amountReceived || 0);
      base.owner += Number(c.ownerAllocated || 0);
      base.market += Number(c.marketAllocated || 0);
      base.franchise += Number(c.franchiseAllocated || 0);
      base.electricity += Number(c.electricityAllocated || 0);
    }
    return base;
  }, [collectionRows]);

  const reportDebtColumns = useMemo(
    () => [
      { key: "period", header: "دوره", minWidth: 120, type: "text" },
      {
        key: "totalAmount",
        header: "جمع کرایه",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
      {
        key: "outstandingAmount",
        header: "باقی‌داری",
        minWidth: 120,
        type: "number",
        align: "right",
        render: fmtMoney,
      },
    ],
    []
  );

  const reportDebtRows = useMemo(
    () =>
      (detail?.accrualHistory || []).map((a, i) => ({
        id: `${a.year}-${a.month}-${i}`,
        period: `${a.year}/${String(a.month).padStart(2, "0")}`,
        totalAmount: a.totalAmount,
        outstandingAmount: a.outstandingAmount,
      })),
    [detail?.accrualHistory]
  );



  const handleConfirm = useCallback(
    async (payload) => {
      if (!shopId || !contractId) return;

      const previousIndex = Number(lastReading?.index ?? 0);
      const currentIndex = Number(payload.todayIndex || 0);
      const unitPrice =
        Number(payload.unitPrice || 0) ||
        Number(lastReading?.unitPrice || 0) ||
        0;

      const readingDto = {
        meterReadingId: guid(),
        shopId,
        contractId,
        previousIndex,
        currentIndex,
        unitPrice,
        reserveRate: 0.2,
        notes: payload.description?.trim() || null,
        isConfirmed: Boolean(payload.isConfirmed),
      };

      try {
        await dispatch(addMeterReading(readingDto)).unwrap();
        await dispatch(fetchMeterReadingNewContext(contractId));
        setMeterModalOpen(false);
      } catch (err) {
        console.error("Sayaç eklenirken hata:", err);
      }
    },
    [shopId, contractId, lastReading, dispatch]
  );

  const handleDebtsSubmit = useCallback(
    (payload) => {
      dispatch(addContractDebtPayment(payload));
      setDebtsModalOpen(false);
    },
    [dispatch]
  );

  /* ---------- Loading / Error ---------- */

  // if (status === "loading" && !detail) {
  //   return (
  //     <div className="cd-root" dir="rtl">
  //       <div className="cd-state">
  //         <Loader2 className="cd-ico cd-spin" />
  //         <span>در حال بارگیری معلومات قرارداد...</span>
  //       </div>
  //     </div>
  //   );
  // }

  if (status === "failed") {
    return (
      <div className="cd-root" dir="rtl">
        <div className="cd-alert cd-alert-danger">
          <AlertTriangle className="cd-ico" />
          <span>{error || "خطا در گرفتن معلومات قرارداد."}</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="cd-root" dir="rtl">
        <div className="cd-muted">قرارداد یافت نشد.</div>
      </div>
    );
  }

  const tabs = [
    { id: "summary", label: "خلاصه" },
    { id: "accruals", label: "کرایه / بدهی" },
    { id: "collections", label: "رسیدها" },
    { id: "reports", label: "گزارش‌ها" },
  ];

  return (
    <div className="cd-root" dir="rtl">
      {/* Header */}
      <header className="cd-header">
        <div className="cd-title">
          <span className="cd-titleIcon">
            <Store className="cd-ico" />
          </span>
          <div className="cd-titleTextWrap">
            <div className="cd-titleText">مدیریت قرارداد دکان</div>
            <div className="cd-subText">
              {detail.marketName} • {detail.floorName}
            </div>
          </div>
        </div>

        <div className="cd-headerRight">
          {isNearEnd && (
            <span className="cd-chip cd-chip-warning">
              <AlertTriangle className="cd-ico" />
              ختم قرارداد نزدیک است
            </span>
          )}
          {hasOldDebt && (
            <span className="cd-chip cd-chip-danger">
              <AlertTriangle className="cd-ico" />
              باقی‌داری گذشته موجود است
            </span>
          )}

          <span className={`cd-badge cd-badge-${statusInfo.mod}`}>
            {statusInfo.text}
          </span>
        </div>
      </header>

      {/* Main */}
      <div className="cd-main">
        {/* Hero */}
        <section className="cd-card cd-hero">
          <div className="cd-heroTop">
            <div className="cd-pill">
              <User2 className="cd-ico" />
              <span>{detail.tenantName}</span>
            </div>

            <div className="cd-pill cd-pill-soft">
              <span className="cd-pillKey">نسخه</span>
              <strong className="cd-pillVal">
                {detail.contractVersion || "V1"}
              </strong>
            </div>
          </div>

          <h1 className="cd-heroTitle">{detail.shopName || "دکان نامعلوم"}</h1>

          {detail.businessActivity && (
            <div className="cd-kvLine">
              <span className="cd-kvKey">فعالیت</span>
              <span className="cd-kvVal">{detail.businessActivity}</span>
            </div>
          )}

          <div className="cd-meta">
            <div className="cd-metaItem">
              <CalendarRange className="cd-ico" />
              <span className="cd-kvKey">امضا</span>
              <span className="cd-kvVal">
                {detail.signedOn
                  ? convertAfDate(detail.signedOn, { monthStyle: "name" })
                  : "—"}
              </span>
            </div>

            <div className="cd-metaItem">
              <span className="cd-kvKey">شروع</span>
              <span className="cd-kvVal">
                {detail.startDate
                  ? convertAfDate(detail.startDate, { monthStyle: "name" })
                  : "—"}
              </span>
            </div>

            <div className="cd-metaItem">
              <span className="cd-kvKey">ختم</span>
              <span className="cd-kvVal">
                {detail.endDate
                  ? convertAfDate(detail.endDate, { monthStyle: "name" })
                  : "—"}
              </span>
            </div>

            <div className="cd-metaItem">
              <span className="cd-kvKey">روز رسید</span>
              <span className="cd-kvVal">{detail.dueDayOfMonth ?? "—"}</span>
            </div>
          </div>

          <div className="cd-actions">
            <Button
              size="md"
              variant="primary"
              icon={Zap}
              onClick={() => setMeterModalOpen(true)}
            >
              ثبت بل برق
            </Button>

            <Button
              size="md"
              variant="outline"
              icon={HandCoins}
              onClick={() => setDebtsModalOpen(true)}
            >
              رسید / تصفیه باقی‌داری
            </Button>
          </div>
          <div className="cd-exportRow">
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              // onClick={downloadHtmlReport}
              primaryColor={"var(--role-secondary-bg)"}
              className="cd-downloadBtn"
            >
              گزارش‌ قرارداد
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              // onClick={downloadHtmlReport}
              primaryColor={"var(--role-secondary-bg)"}
              className="cd-downloadBtn"
            >
              گزارش‌ باقی داری
            </Button>
            <Button
              size="sm"
              variant="outline"
              icon={Download}
              // onClick={downloadHtmlReport}
              primaryColor={"var(--role-secondary-bg)"}
              className="cd-downloadBtn"
            >
              گزارش‌ رسید
            </Button>

          </div>
        </section>

        {/* Right stack */}
        <section className="cd-stack">
          <div className="cd-kpiGrid">
            <div className="cd-card cd-kpi cd-kpi-primary">
              <div className="cd-kpiLabel">مجموع کرایه ثابت</div>
              <div className="cd-kpiValue">
                {fmtMoney(overview.fixedRentTotal)}{" "}
                <span className="cd-cur">؋</span>
              </div>
              <div className="cd-kpiSub">
                مالک: {fmtMoney(overview.fixedRentOwner)} – مارکیت:{" "}
                {fmtMoney(overview.fixedRentMarket)} – امتیاز:{" "}
                {fmtMoney(overview.fixedRentFranchise)}
              </div>
            </div>

            <div className="cd-card cd-kpi cd-kpi-danger">
              <div className="cd-kpiLabel">باقی‌داری مجموعی</div>
              <div className="cd-kpiValue">
                {fmtMoney(overview.debtTotal)} <span className="cd-cur">؋</span>
              </div>
              <div className="cd-kpiSub">
                ماه جاری: {fmtMoney(overview.debtCurrent)} – گذشته:{" "}
                {fmtMoney(overview.debtOld)}
              </div>
            </div>

            <div className="cd-card cd-dateCard">
              <div className="cd-dateCardHead">
                <span className="cd-dateTitle">فیلتر تاریخ</span>
                {(fromDate || toDate) && (
                  <Button
                    size="xs"
                    variant="ghost"
                    iconOnly
                    icon={Trash2}
                    primaryColor={"var(--role-danger-bg)"}
                    aria-label="پاک کردن فیلتر تاریخ"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                    }}
                  />
                )}
              </div>

              <div className="cd-dateRow">
                <div className="cd-dateField">
                  <CustomDatePicker
                    mode="single"
                    value={fromDate}
                    onChange={setFromDate}
                    calendarMode="persian"
                    placeholder="از تاریخ"
                    showToggle={false}
                  />
                </div>

                <div className="cd-dateField">
                  <CustomDatePicker
                    mode="single"
                    value={toDate}
                    onChange={setToDate}
                    calendarMode="persian"
                    placeholder="تا تاریخ"
                    showToggle={false}
                    minDate={fromDate || undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Tabs */}
      <nav className="cd-tabs" role="tablist" aria-label="Contract sections">
        {tabs.map((t) => {
          const selected = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`cd-panel-${t.id}`}
              id={`cd-tab-${t.id}`}
              className={`cd-tab${selected ? " is-active" : ""}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon ? (
                <t.icon className="cd-tabIcon" aria-hidden="true" />
              ) : null}
              <span className="cd-tabLabel">{t.label}</span>
              <span className="cd-tabIndicator" aria-hidden="true" />
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="cd-content">
        {/* SUMMARY */}
        {activeTab === "summary" && (
          <section className="cd-section">
            <div className="cd-sectionHead">
              <h2>خلاصه مالی قرارداد</h2>
            </div>

            <div className="cd-grid">
              <div className="cd-card cd-box cd-box-primary">
                <div className="cd-boxLabel">کرایه ثبت شده ماه جاری</div>
                <div className="cd-boxValue">
                  {fmtMoney(overview.currentAccrualTotal)}{" "}
                  <span className="cd-cur">؋</span>
                </div>
                <div className="cd-boxSub">
                  باقی‌داری ماه جاری:{" "}
                  <strong>{fmtMoney(overview.debtCurrent)} ؋</strong>
                </div>
              </div>

              <div className="cd-card cd-box">
                <div className="cd-boxLabel">باقی‌داری گذشته</div>
                <div className="cd-boxValue cd-dangerText">
                  {fmtMoney(overview.debtOld)} <span className="cd-cur">؋</span>
                </div>
                <div className="cd-boxSub">بدهی‌های مانده از دوره‌های قبلی</div>
              </div>

              <div className="cd-card cd-box">
                <div className="cd-boxLabel">صرفیه برق اولیه</div>
                <div className="cd-boxValue">
                  {detail.initialElectricityIndex ?? "—"}
                </div>
                <div className="cd-boxSub">
                  {detail.electricityNote ? detail.electricityNote : "—"}
                </div>
              </div>

              <div className="cd-card cd-box cd-full">
                {detail.franchiseOwnersCount ? (
                  <>
                    <div className="cd-boxSub">
                      {detail.franchiseSummary || "تقسیم سهم امتیازداران"}
                    </div>
                    <CustomTable
                      columns={[
                        {
                          key: "franchiseOwnerName",
                          header: "نام",
                          minWidth: 180,
                          type: "text",
                        },
                        {
                          key: "sharePercent",
                          header: "سهم (%)",
                          minWidth: 80,
                          type: "number",
                        },
                        {
                          key: "effectiveFrom",
                          header: "از تاریخ",
                          minWidth: 130,
                          type: "date",
                          render: (v) =>
                            v ? convertAfDate(v, { monthStyle: "name" }) : "—",
                        },
                        {
                          key: "effectiveTo",
                          header: "تا تاریخ",
                          minWidth: 130,
                          type: "date",
                          render: (v) =>
                            v
                              ? convertAfDate(v, { monthStyle: "name" })
                              : "جاری",
                        },
                      ]}
                      data={(detail.franchiseOwners || []).map((fo, i) => ({
                        id: fo.franchiseOwnerId || i,
                        ...fo,
                      }))}
                      loading={false}
                      initialDensity="compact"
                      initialPageSize={5}
                      searchable={false}
                      toolbarTitle="امتیازداران"
                      emptyMessage="هیچ امتیازدار ثبت نشده است."
                      rowKey={(r) => r.id}
                      showAddButton={false}
                      hideToolbarIfEmpty
                    />
                  </>
                ) : (
                  <div className="cd-muted">
                    هیچ امتیازدار فعال ثبت نشده است.
                  </div>
                )}
              </div>

              {(detail.contractNote || detail.electricityNote) && (
                <div className="cd-card cd-box cd-full">
                  <div className="cd-boxLabel">یادداشت‌ها</div>

                  {detail.contractNote && (
                    <div className="cd-kvLine">
                      <span className="cd-kvKey">قرارداد</span>
                      <span className="cd-kvVal">{detail.contractNote}</span>
                    </div>
                  )}

                  {detail.electricityNote && (
                    <div className="cd-kvLine">
                      <span className="cd-kvKey">برق</span>
                      <span className="cd-kvVal">{detail.electricityNote}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {/* ACCRUALS */}
        {activeTab === "accruals" && (
          <section className="cd-section">
            <div className="cd-card cd-panel">
              <CustomTable
                columns={accrualColumns}
                data={accrualRows}
                loading={status === "loading"}
                initialDensity="compact"
                initialPageSize={12}
                searchable={false}
                toolbarTitle="تاریخچه کرایه / بدهی"
                emptyMessage="هیچ ثبت کرایه/بدهی یافت نشد."
                rowKey={(r) => r.id}
                showAddButton={false}
                hideToolbarIfEmpty
              />
            </div>
          </section>
        )}

        {/* COLLECTIONS */}
        {activeTab === "collections" && (
          <section className="cd-section">
            <div className="cd-card cd-panel">
              <CustomTable
                columns={collectionColumns}
                data={collectionRows}
                loading={status === "loading"}
                initialDensity="compact"
                initialPageSize={12}
                searchable={false}
                toolbarTitle="رسیدها"
                emptyMessage="هیچ رسیدی ثبت نشده است."
                rowKey={(r) => r.id}
                showAddButton={false}
                hideToolbarIfEmpty
              />
            </div>
          </section>
        )}

        {/* REPORTS */}
        {activeTab === "reports" && (
          <section className="cd-section">
            <div className="cd-kpiRow3">
              <div className="cd-card cd-miniKpi cd-kpi-primary">
                <div className="cd-miniIcon">
                  <PieChart className="cd-ico" />
                </div>
                <div>
                  <div className="cd-kpiLabel">مجموع دریافت</div>
                  <div className="cd-kpiValue">
                    {fmtMoney(paymentSummary.total)}{" "}
                    <span className="cd-cur">؋</span>
                  </div>
                  <div className="cd-kpiSub">
                    مالک: {fmtMoney(paymentSummary.owner)} – مارکیت:{" "}
                    {fmtMoney(paymentSummary.market)}
                  </div>
                </div>
              </div>

              <div className="cd-card cd-miniKpi cd-kpi-danger">
                <div className="cd-miniIcon">
                  <BarChart3 className="cd-ico" />
                </div>
                <div>
                  <div className="cd-kpiLabel">باقی‌داری مجموعی</div>
                  <div className="cd-kpiValue">
                    {fmtMoney(overview.debtTotal)}{" "}
                    <span className="cd-cur">؋</span>
                  </div>
                  <div className="cd-kpiSub">
                    ماه جاری: {fmtMoney(overview.debtCurrent)} – گذشته:{" "}
                    {fmtMoney(overview.debtOld)}
                  </div>
                </div>
              </div>

              <div className="cd-card cd-miniKpi">
                <div className="cd-miniIcon">
                  <Zap className="cd-ico" />
                </div>
                <div>
                  <div className="cd-kpiLabel">پرداخت‌های برق</div>
                  <div className="cd-kpiValue">
                    {fmtMoney(paymentSummary.electricity)}{" "}
                    <span className="cd-cur">؋</span>
                  </div>
                  <div className="cd-kpiSub">سهم برق از مجموع دریافت</div>
                </div>
              </div>
            </div>

            <div className="cd-twoCols">
              <div className="cd-card cd-panel">
                <CustomTable
                  columns={collectionColumns}
                  data={collectionRows}
                  loading={status === "loading"}
                  initialDensity="compact"
                  initialPageSize={10}
                  searchable={false}
                  toolbarTitle="جزئیات رسیدها"
                  emptyMessage="هیچ رسیدی با این فیلتر یافت نشد."
                  rowKey={(r) => r.id}
                  showAddButton={false}
                />
              </div>

              <div className="cd-card cd-panel">
                <CustomTable
                  columns={reportDebtColumns}
                  data={reportDebtRows}
                  loading={status === "loading"}
                  initialDensity="compact"
                  initialPageSize={10}
                  searchable={false}
                  toolbarTitle="باقی‌داری بر اساس دوره"
                  emptyMessage="هیچ داده‌ای برای بدهی یافت نشد."
                  rowKey={(r) => r.id}
                  showAddButton={false}
                />
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Modals */}
      <MeterReadingConfirmModal
        isOpen={meterModalOpen}
        onClose={() => setMeterModalOpen(false)}
        onConfirm={handleConfirm}
        lastReading={lastReading}
        currencySymbol="؋"
      />

      <AddDebtsModal
        open={debtsModalOpen}
        contractId={detail.contractId}
        onClose={() => setDebtsModalOpen(false)}
        onSubmit={handleDebtsSubmit}
      />
    </div>
  );
}
