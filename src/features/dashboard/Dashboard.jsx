import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  RefreshCw,
  DollarSign,
  BarChart3,
  Layers,
  Users,
  Crown,
  Wallet,
  PiggyBank,
  CheckCircle2,
  FileText,
  RefreshCcw,
} from "lucide-react";

import Button from "../../shared/components/Button";
import CustomTableV2 from "../../shared/components/CustomTableV2/CustomTableV2";
import CustomDatePicker from "../../shared/date/CustomDatePicker";
import { convertAfDate } from "../../shared/date/convertAfDate";
import { useGlobalLoading } from "../../shared/loading/GlobalLoadingContext";
import {
  fetchPdfBlob,
  openBlobForPrint,
} from "../../shared/reporting/serverPdfClient";

import UpdateDollarRateModal from "./components/UpdateDollarRateModal";
import EntriesModal from "./components/EntriesModal";
import { dashboardService } from "./services/dashboardService";
import "./Dashboard.css";

import { fetchMarkets } from "../market/slices/marketSlice";
import { fetchFloors } from "../floor/slices/floorSlice";

// ---------------- Helpers ----------------
const fmt0 = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    Number(n ?? 0),
  );
const fmt2 = (n) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(n ?? 0));
const fmt4 = (n) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(
    Number(n ?? 0),
  );

const toStr = (v, fb = "") => (v === null || v === undefined ? fb : String(v));
const tidy = (s) => toStr(s).replace(/\s+/g, " ").trim();

const YES_NO_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "true", label: "بلی" },
  { value: "false", label: "خیر" },
];

const APPROVAL_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "true", label: "تایید شده" },
  { value: "false", label: "تایید نشده" },
];

const DIRECTION_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "In", label: "ورود" },
  { value: "Out", label: "خروج" },
];

const PAYMENT_METHOD_FILTER_OPTIONS = [
  { value: "", label: "همه" },
  { value: "Unknown", label: "نامعلوم" },
  { value: "Cash", label: "نقد" },
  { value: "BankTransfer", label: "حواله/بانک" },
  { value: "Pos", label: "POS" },
  { value: "Cheque", label: "چک" },
  { value: "Other", label: "دیگر" },
];

function isoToYmd(iso) {
  if (!iso) return "";
  const s = String(iso);
  return s.length >= 10 ? s.slice(0, 10) : "";
}

function isoToHm(iso) {
  if (!iso) return "";
  const s = String(iso);
  return s.length >= 16 ? s.slice(11, 16) : "";
}

function fmtAfDateTime(iso) {
  const ymd = isoToYmd(iso);
  if (!ymd) return "—";
  const hm = isoToHm(iso);
  const d = convertAfDate(ymd, { monthStyle: "name" });
  return hm ? `${d}  ${hm}` : d;
}

// Convert CustomDatePicker -> "YYYY-MM-DD"
function toGregorianYmd(val) {
  if (!val) return "";
  try {
    // eslint-disable-next-line no-undef
    const DateObject = require("react-date-object").default;
    // eslint-disable-next-line no-undef
    const gregorian = require("react-date-object/calendars/gregorian").default;
    // eslint-disable-next-line no-undef
    const gregorian_en =
      require("react-date-object/locales/gregorian_en").default;

    return new DateObject(val)
      .set({ calendar: gregorian, locale: gregorian_en })
      .format("YYYY-MM-DD");
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

function ymdToUtcStart(ymd) {
  if (!ymd) return "";
  return `${ymd}T00:00:00Z`;
}
function ymdToUtcEnd(ymd) {
  if (!ymd) return "";
  return `${ymd}T23:59:59Z`;
}

function MiniBars({ items = [], valueKey = "value", labelKey = "label" }) {
  const max = Math.max(
    0,
    ...(items || []).map((x) => Number(x?.[valueKey] ?? 0)),
  );
  if (!items?.length || max <= 0) return <div className="fd-chartEmpty">—</div>;

  return (
    <div className="fd-chart">
      {items.map((it) => {
        const v = Number(it?.[valueKey] ?? 0);
        const h = Math.round((v / max) * 100);
        return (
          <div key={it.key || it[labelKey]} className="fd-bar">
            <div className="fd-barTop" title={fmt0(v)}>
              {fmt0(v)}
            </div>
            <div className="fd-barRail">
              <div className="fd-barFill" style={{ height: `${h}%` }} />
            </div>
            <div className="fd-barLbl">{it?.[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

function BucketCard({ icon: Icon, title, value, onClick }) {
  return (
    <div
      className="fd-bucket"
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick?.()}
    >
      <div className="fd-bucketIcon">
        <Icon size={18} />
      </div>
      <div className="fd-bucketBody">
        <div className="fd-bucketTitle">{title}</div>
        <div className="fd-bucketValue">{fmt0(value)} ؋</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { show, hide } = useGlobalLoading();

  // Lookups for option-heavy filters (same pattern as ContractPage)
  const dispatch = useDispatch();
  const marketList = useSelector((s) => s.market?.list);
  const floorList = useSelector((s) => s.floor?.list);

  const didInitLookups = useRef(false);
  useEffect(() => {
    if (didInitLookups.current) return;
    didInitLookups.current = true;
    dispatch(fetchMarkets());
    dispatch(fetchFloors());
  }, [dispatch]);

  const marketFilterOptions = useMemo(
    () =>
      (marketList ?? [])
        .map((m) => ({
          value: tidy(m?.marketName),
          label: tidy(m?.marketName),
        }))
        .filter((x) => x.value),
    [marketList],
  );

  const marketNameToId = useMemo(() => {
    const map = new Map();
    for (const m of marketList ?? []) {
      const name = tidy(m?.marketName);
      if (name) map.set(name, m?.id);
    }
    return map;
  }, [marketList]);

  const floorAsyncOptions = useCallback(
    async (_q, _page, ctx) => {
      const parentMarketName = String(ctx?.parentValue ?? "");
      const parentMarketId = marketNameToId.get(parentMarketName);
      if (!parentMarketId) return { options: [], hasMore: false };

      const opts = (floorList ?? [])
        .filter((f) => String(f?.marketId) === String(parentMarketId))
        .map((f) => ({ value: tidy(f?.floorName), label: tidy(f?.floorName) }))
        .filter((x) => x.value);

      return { options: opts, hasMore: false };
    },
    [floorList, marketNameToId],
  );

  // Date filter
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d;
  });
  const [toDate, setToDate] = useState(() => new Date());

  const filterParams = useMemo(() => {
    const fromYmd = toGregorianYmd(fromDate);
    const toYmd = toGregorianYmd(toDate);
    return {
      fromUtc: fromYmd ? ymdToUtcStart(fromYmd) : undefined,
      toUtc: toYmd ? ymdToUtcEnd(toYmd) : undefined,
    };
  }, [fromDate, toDate]);

  // Data
  const [finance, setFinance] = useState(null);
  const [charts, setCharts] = useState(null);
  const [error, setError] = useState("");

  const secondaryColor = "var(--role-secondary-bg)";

  // Dollar
  const [dollarModalOpen, setDollarModalOpen] = useState(false);

  // Tables refresh keys (force remount after approve/save)
  const [paymentsKey, setPaymentsKey] = useState(1);

  // Active tab
  const [activeTab, setActiveTab] = useState("family"); // family | franchise | money | reserve | payments | debts

  // Reserve details popup ("devamını gör")
const [entriesOpen, setEntriesOpen] = useState(false);
const [entriesCfg, setEntriesCfg] = useState(null); // { title, source, sourceId }
const [entriesKey, setEntriesKey] = useState(0);

const openEntriesFor = useCallback((cfg) => {
  setEntriesCfg(cfg);
  setEntriesKey((k) => k + 1);   // <-- kritik: remount
  setEntriesOpen(true);
}, []);


  const openEntriesFromReserveRow = useCallback(
    (row) => {
      const t = String(row?.accountType ?? "");
      const isPool =
        t === "TaxPool" || t === "ZakatPool" || t === "CharityPool";
      openEntriesFor({
        title: row?.displayName || "جزئیات",
        source: isPool ? t : "ReserveAccount",
        sourceId: isPool ? null : (row?.id ?? null),
      });
    },
    [openEntriesFor],
  );

  const fetchEntries = useCallback(
    async (q) =>
      dashboardService.getEntriesDetails({
        ...q,
        ...filterParams,
        source: entriesCfg?.source,
        sourceId: entriesCfg?.sourceId,
      }),
    [entriesCfg, filterParams],
  );

  const detailsCol = useCallback(
    (getCfg) => ({
      key: "__details",
      header: "جزئیات",
      sortable: false,
      render: (_v, row) => {
        const cfg = getCfg?.(row);
        const disabled =
          !cfg?.source ||
          (!cfg?.sourceId &&
            cfg?.source !== "TaxPool" &&
            cfg?.source !== "ZakatPool" &&
            cfg?.source !== "CharityPool");
        return (
          <Button
            size="sm"
            variant="soft"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              openEntriesFor(cfg);
            }}
          >
            ادامه...
          </Button>
        );
      },
    }),
    [openEntriesFor],
  );

  // Table viewport height: fill screen without wasting space
  const [tableMaxBodyHeight, setTableMaxBodyHeight] = useState(520);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const calc = () => {
      const h = typeof window !== "undefined" ? window.innerHeight : 900;
      // Header+KPIs+tabs roughly 430px; keep within sensible bounds
      const next = Math.max(360, Math.min(760, h - 430));
      setTableMaxBodyHeight(next);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  const latestDollar = finance?.latestAfnPerUsd ?? null;

  const loadAll = async () => {
    setError("");
    try {
      show();
      const [f, c] = await Promise.all([
        dashboardService.getFinance({ ...filterParams, take: 50 }),
        dashboardService.getCharts({ ...filterParams, months: 3 }),
      ]);
      setFinance(f);
      setCharts(c);
    } catch (e) {
      setError(String(e?.message || e || "خطای غیر منتظره"));
    } finally {
      hide();
    }
  };

  useEffect(() => {
    loadAll(); /* eslint-disable-next-line */
  }, []);

  const onSaveDollar = async ({ afnPerUsd, effectiveFromUtc }) => {
    try {
      show();
      await dashboardService.addDollarRate({ afnPerUsd, effectiveFromUtc });

      // Optimistic UI: show the new rate immediately.
      setFinance((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          latestAfnPerUsd: afnPerUsd,
          latestAfnPerUsdEffectiveFromUtc: effectiveFromUtc,
        };
      });

      setDollarModalOpen(false);
      await loadAll();
    } catch (e) {
      alert(String(e?.message || e || "خطا"));
    } finally {
      hide();
    }
  };

  const totals = finance?.totals || {};
  const buckets = finance?.buckets || {};

  // ---------------- Tables: columns ----------------
  const moneyCols = useMemo(
    () => [
      {
        key: "accountName",
        header: "حساب",
        sortable: true,
        serverField: "AccountName",

        // filterType: "text",
        // filterOp: "contains",
        // filterLabel: "نام حساب",
      },

      // Option-heavy filters
      {
        key: "accountType",
        header: "نوع",
        sortable: true,
        serverField: "AccountType",
        visible: false,
        // filterType: "select",
        // filterOp: "eq",
        // filterLabel: "نوع حساب",
        // filterOrder: 1,
        // filterOptions: [
        //   { value: "", label: "همه" },
        //   { value: "CashLocal", label: "نقد AFN" },
        //   { value: "CashUsd", label: "نقد USD" },
        //   { value: "BankLocal", label: "بانک AFN" },
        //   { value: "BankUsd", label: "بانک USD" },
        // ],
      },

      {
        key: "currency",
        header: "واحد",
        sortable: true,
        serverField: "Currency",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "واحد",
        filterOrder: 2,
        filterOptions: [
          { value: "", label: "همه" },
          { value: "Afn", label: "AFN" },
          { value: "Usd", label: "USD" },
        ],
      },
      {
        key: "totalIn",
        header: "ورود",
        sortable: true,
        serverField: "TotalIn",
        filterType: "numberRange",
      },
      {
        key: "totalOut",
        header: "خروج",
        sortable: true,
        serverField: "TotalOut",
        filterType: "numberRange",
      },
      {
        key: "balance",
        header: "موجودی",
        sortable: true,
        serverField: "Balance",
        filterType: "numberRange",
      },
      {
        key: "isActive",
        header: "فعال",
        sortable: true,
        serverField: "IsActive",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "فعال؟",
        filterOrder: 3,
        visible: false,
        filterOptions: YES_NO_FILTER_OPTIONS,
        render: (v) => (v ? "بلی" : "خیر"),
      },
      detailsCol((row) => ({
        title: row?.accountName || "جزئیات",
        source: "MoneyAccount",
        sourceId: row?.id ?? null,
      })),
    ],
    [],
  );

  const reserveCols = useMemo(
    () => [
      {
        key: "accountType",
        header: "نوع حساب",
        sortable: true,
        serverField: "AccountType",
        visible: false,
        filterType: "select",
        filterOp: "eq",
        filterLabel: "نوع حساب",
        filterOrder: 1,
        filterOptions: [
          { value: "", label: "همه" },
          { value: "ElectricityReserve", label: "ذخیره برق" },
          { value: "ElectricityMain", label: "حساب اصلی برق" },
          { value: "MarketReserve", label: "ذخیره مارکیت" },
          { value: "MarketMain", label: "حساب اصلی مارکیت" },
          { value: "OwnerReserve", label: "ذخیره مالک" },
          { value: "TaxPool", label: "ذخیره مالیه" },
          { value: "ZakatPool", label: "ذخیره زکات" },
          { value: "CharityPool", label: "ذخیره صدقه" },
        ],
      },

      {
        key: "displayName",
        header: "نام",
        sortable: true,
        serverField: "DisplayName",
        filterType: "text",
        filterOp: "contains",
        filterLabel: "نام",
      },
      {
        key: "totalIn",
        header: "ورود",
        sortable: true,
        serverField: "TotalIn",
        filterType: "numberRange",
      },
      {
        key: "totalOut",
        header: "خروج",
        sortable: true,
        serverField: "TotalOut",
        filterType: "numberRange",
      },
      {
        key: "balance",
        header: "موجودی",
        sortable: true,
        serverField: "Balance",
        filterType: "numberRange",
      },
      {
        key: "isActive",
        header: "فعال",
        sortable: true,
        serverField: "IsActive",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "فعال؟",
        filterOrder: 2,
        filterOptions: YES_NO_FILTER_OPTIONS,
        render: (v) => (v ? "بلی" : "خیر"),
      },

      {
        key: "__entries",
        header: "جزئیات",
        sortable: false,
        render: (_v, row) => (
          <Button
            size="sm"
            variant="soft"
            onClick={(e) => {
              e.stopPropagation();
              openEntriesFromReserveRow(row);
            }}
          >
            ادامه...
          </Button>
        ),
      },
    ],
    [openEntriesFor],
  );

  const poolCols = useMemo(
    () => [
      {
        key: "debtFlag",
        header: "قرض",
        visible: false,
        filterType: "select",
        filterOp: "eq",
        filterLabel: "قرض دارد؟",
        filterOrder: 1,
        filterOptions: [
          { value: "", label: "همه" },
          { value: "has", label: "دارد" },
          { value: "no", label: "ندارد" },
        ],
        buildFilter: (v) => {
          if (!v) return null;
          if (v === "has") return { field: "DebtAfn", op: "gt", value: "0" };
          if (v === "no") return { field: "DebtAfn", op: "eq", value: "0" };
          return null;
        },
      },
      {
        key: "partyName",
        header: "شخص",
        sortable: true,
        serverField: "PartyName",
        filterable: true,
      },
      {
        key: "totalInAfn",
        header: "ورود",
        sortable: true,
        serverField: "TotalInAfn",
        filterType: "numberRange",
      },
      {
        key: "totalOutAfn",
        header: "خروج",
        sortable: true,
        serverField: "TotalOutAfn",
        filterType: "numberRange",
      },
      {
        key: "balanceAfn",
        header: "سهم / موجودی",
        sortable: true,
        serverField: "BalanceAfn",
        filterType: "numberRange",
      },
      {
        key: "debtAfn",
        header: "قرض (اگر بیشتر کشیده)",
        sortable: true,
        serverField: "DebtAfn",
        filterType: "numberRange",
        render: (v) => (Number(v ?? 0) > 0 ? `${fmt0(v)} ؋` : "—"),
      },
      {
        key: "debtAfn",
        header: "قرض (اگر بیشتر کشیده)",
        sortable: true,
        serverField: "DebtAfn",
        filterType: "numberRange",
        render: (v) => (Number(v ?? 0) > 0 ? `${fmt0(v)} ؋` : "—"),
      },

      // detailsCol((row) => ({
      //   title: row?.partyName || "جزئیات",
      //   source: activeTab === "family" ? "FamilyPool" : "FranchisePool",
      //   sourceId: row?.partyId ?? row?.id ?? null,
      // })),
    ],
    [detailsCol, activeTab],
  );

  const paymentsCols = useMemo(
    () => [
      {
        key: "paidAtUtc",
        header: "تاریخ پرداخت",
        sortable: true,
        serverField: "PaidAtUtc",
        filterType: "dateRange",
        render: (v) => fmtAfDateTime(v),
      },
      {
        key: "tenantName",
        header: "مستاجر",
        sortable: true,
        serverField: "TenantName",
        filterable: true,
      },
      {
        key: "marketName",
        header: "مارکیت",
        sortable: true,
        serverField: "MarketName",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "مارکیت",
        filterOrder: 1,
        filterOptions: marketFilterOptions,
        clearsOnChange: ["floorName"],
      },
      {
        key: "floorName",
        header: "طبقه",
        sortable: true,
        serverField: "FloorName",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "طبقه",
        filterOrder: 2,
        dependsOnKey: "marketName",
        asyncLoadOptions: floorAsyncOptions,
      },
      {
        key: "shopUnitNumber",
        header: "دکان",
        sortable: true,
        serverField: "ShopUnitNumber",
        filterable: true,
      },
      {
        key: "amountReceived",
        header: "مبلغ",
        sortable: true,
        serverField: "AmountReceived",
        filterType: "numberRange",
        render: (v) => `${fmt0(v)} ؋`,
      },
      {
        key: "method",
        header: "روش",
        sortable: true,
        serverField: "Method",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "روش",
        filterOrder: 3,
        filterOptions: PAYMENT_METHOD_FILTER_OPTIONS,
        render: (v) => {
          const hit = PAYMENT_METHOD_FILTER_OPTIONS.find(
            (x) => x.value === String(v ?? ""),
          );
          return hit ? hit.label : (v ?? "—");
        },
      },
      {
        key: "referenceNo",
        header: "رفرنس",
        sortable: true,
        serverField: "ReferenceNo",
        filterable: true,
      },
      {
        key: "isApproved",
        header: "وضعیت",
        sortable: true,
        serverField: "IsApproved",
        filterType: "select",
        filterOp: "eq",
        filterOptions: APPROVAL_FILTER_OPTIONS,
        render: (v) => (
          <span className={`fd-status ${v ? "is-ok" : "is-pending"}`}>
            {v ? "تایید شده" : "تایید نشده"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "عملیات",
        render: (_v, row) => {
          const stop = (e) => e.stopPropagation();

          const printOne = async (e) => {
            stop(e);
            try {
              const blob = await fetchPdfBlob(
                `/api/Reports/GeneratePaymentReceiptA6/${row.id}`,
              );
              openBlobForPrint(blob);
            } catch (err) {
              alert(String(err?.message || err));
            }
          };

          const approve = async (e) => {
            stop(e);
            if (row?.isApproved) return;
            if (!window.confirm("آیا این پرداخت تایید شود؟")) return;
            try {
              show();
              await dashboardService.approveCollection(row.id);
              setPaymentsKey((k) => k + 1);
              await loadAll();
            } catch (err) {
              alert(String(err?.message || err));
            } finally {
              hide();
            }
          };

          return (
            <div className="fd-actions" onClick={stop}>
              <Button
                size="sm"
                variant="soft"
                icon={FileText}
                onClick={printOne}
              >
                PDF
              </Button>
              {/* <Button
                size="sm"
                variant="soft"
                icon={Layers}
                onClick={(e) => {
                  e.stopPropagation();
                  openEntriesFor({
                    title: `جزئیات پرداخت - ${row?.tenantName || ""}`.trim(),
                    source: "Collection",
                    sourceId: row?.id ?? null,
                  });
                }}
              >
                ادامه...
              </Button> */}

              {!row?.isApproved ? (
                <Button size="sm" icon={CheckCircle2} onClick={approve}>
                  تایید
                </Button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [show, hide, marketFilterOptions, floorAsyncOptions],
  );

  const debtCols = useMemo(
    () => [
      {
        key: "tenantName",
        header: "مستاجر",
        sortable: true,
        serverField: "TenantName",
        filterable: true,
      },
      {
        key: "year",
        header: "سال",
        sortable: true,
        serverField: "Year",
        filterType: "numberRange",
      },
      {
        key: "month",
        header: "ماه",
        sortable: true,
        serverField: "Month",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "ماه",
        filterOrder: 1,
        filterOptions: [
          { value: "", label: "همه" },
          ...Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
            label: String(i + 1),
          })),
        ],
      },
      {
        key: "totalAccrued",
        header: "مجموع بدهی",
        sortable: true,
        serverField: "TotalAccrued",
        filterType: "numberRange",
        render: (v) => `${fmt0(v)} ؋`,
      },
      {
        key: "totalOutstanding",
        header: "باقی",
        sortable: true,
        serverField: "TotalOutstanding",
        filterType: "numberRange",
        render: (v) => `${fmt0(v)} ؋`,
      },
      // detailsCol((row) => ({
      //   title: `جزئیات بدهی - ${row?.tenantName || ""}`.trim(),
      //   source: "DebtPeriod",
      //   sourceId: row?.tenantId ?? row?.id ?? null,
      // })),
    ],
    [],
  );

  // Details table inside EntriesModal (option-heavy filters)
  const entryCols = useMemo(
    () => [
      {
        key: "occurredAtUtc",
        header: "تاریخ",
        sortable: true,
        serverField: "OccurredAtUtc",
        filterType: "dateRange",
        filterOrder: 1,
        render: (v) => fmtAfDateTime(v),
      },
      {
        key: "direction",
        header: "نوع",
        sortable: true,
        serverField: "Direction",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "ورود/خروج",
        filterOrder: 2,
        filterOptions: DIRECTION_FILTER_OPTIONS,
        render: (v) => {
          const hit = DIRECTION_FILTER_OPTIONS.find(
            (x) => x.value === String(v ?? ""),
          );
          return hit ? hit.label : (v ?? "—");
        },
      },
      {
        key: "amount",
        header: "مبلغ",
        sortable: true,
        serverField: "Amount",
        filterType: "numberRange",
        render: (v) => `${fmt0(v)} ؋`,
      },
      {
        key: "method",
        header: "روش",
        sortable: true,
        serverField: "Method",
        filterType: "select",
        filterOp: "eq",
        filterLabel: "روش",
        filterOrder: 3,
        filterOptions: PAYMENT_METHOD_FILTER_OPTIONS,
        render: (v) => {
          const hit = PAYMENT_METHOD_FILTER_OPTIONS.find(
            (x) => x.value === String(v ?? ""),
          );
          return hit ? hit.label : (v ?? "—");
        },
      },
      {
        key: "referenceNo",
        header: "رفرنس",
        sortable: true,
        serverField: "ReferenceNo",
        filterType: "text",
        filterOp: "contains",
      },
      {
        key: "notes",
        header: "توضیحات",
        sortable: false,
        serverField: "Notes",
        filterType: "text",
        filterOp: "contains",
      },
    ],
    [],
  );

  // ---------------- Tables: fetchers ----------------
  const fetchMoney = async (q) => dashboardService.getMoneyAccountsDetails(q);
  const fetchReserve = async (q) =>
    dashboardService.getReserveAccountsDetails(q);
  const fetchFamily = async (q) => dashboardService.getFamilyPoolDetails(q);
  const fetchFranchise = async (q) =>
    dashboardService.getFranchisePoolDetails(q);

  const fetchPayments = async (q) => dashboardService.getCollectionsDetails(q);

  const fetchDebts = async (q) => dashboardService.getPeriodDebtsDetails(q);

  // Multi PDF for selected rows
  const printSelected = async (rows) => {
    try {
      const ids = (rows || []).map((r) => r.id).filter(Boolean);
      if (!ids.length) return;
      const blob = await fetchPdfBlob(
        "/api/Reports/GeneratePaymentReceiptsA6",
        {
          method: "POST",
          body: { collectionIds: ids },
        },
      );
      openBlobForPrint(blob);
    } catch (err) {
      alert(String(err?.message || err));
    }
  };

  return (
    <div className="fd-root" dir="rtl">
      {/* Sticky Header */}
      <div className="fdTopbar">
        <div className="px-4 py-3 border-b bg-white/90 backdrop-blur sticky top-0 z-10">
          <div className="flex items-start">
            {/* LEFT */}
            <div className="shrink-0">
              <h1 className="text-xl font-bold whitespace-nowrap">
                آرشیف مالی
              </h1>
              <div className="fdTopbarSub text-xs text-slate-500 mt-3 whitespace-nowrap">
                آخرین بروزرسانی: {fmtAfDateTime(new Date().toISOString())}
              </div>
            </div>

            {/* RIGHT (stick to right) */}
            <div className="flex-1 flex justify-end">
              <div className="fdTopbarRightRow">
                {/* From */}
                {/* <div className="fdTopbarBox fdTopbarFilterBox">
                  <div className="fdFilterLbl">از تاریخ</div>
                  <CustomDatePicker
                    mode="single"
                    value={fromDate}
                    onChange={setFromDate}
                  />
                </div> */}

                {/* To */}
                {/* <div className="fdTopbarBox fdTopbarFilterBox">
                  <div className="fdFilterLbl">تا تاریخ</div>
                  <CustomDatePicker
                    mode="single"
                    value={toDate}
                    onChange={setToDate}
                  />
                </div> */}

                {/* Dollar Rate (prominent) */}
                <div className="fdTopbarBox fdTopbarRateBox">
                  <div className="fdRateTop">
                    <DollarSign size={16} />
                    <span>نرخ دالر</span>
                  </div>

                  <div className="fdRateVal fdRateValStrong" dir="ltr">
                    {latestDollar ? (
                      <>
                        <span className="fdRateNumber">
                          {fmt4(latestDollar)}
                        </span>
                        <span className="fdRateUnit"> ؋ / 1 $</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="fdTopbarBox fdTopbarActionsBox">
                  <Button
                    icon={DollarSign}
                    onClick={() => setDollarModalOpen(true)}
                  >
                    قیمت دالر
                  </Button>

                  <Button
                    variant="soft"
                    icon={RefreshCw}
                    onClick={loadAll}
                    iconOnly
                    primaryColor={secondaryColor}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error ? <div className="fd-error">{error}</div> : null}

      {/* KPIs */}
      <div className="fd-kpis">
        <div className="fd-kpi">
          <div className="fd-kpiLbl">مجموع USD</div>
          <div className="fd-kpiVal">{fmt2(totals.totalUsd)} $</div>
        </div>
        <div className="fd-kpi">
          <div className="fd-kpiLbl">مجموع AFN</div>
          <div className="fd-kpiVal">{fmt0(totals.totalAfn)} ؋</div>
        </div>
        <div className="fd-kpi">
          <div className="fd-kpiLbl">USD → AFN</div>
          <div className="fd-kpiVal">{fmt0(totals.totalUsdAsAfn)} ؋</div>
        </div>
        <div className="fd-kpi">
          <div className="fd-kpiLbl">مجموع نهایی</div>
          <div className="fd-kpiVal">{fmt0(totals.grandTotalAfn)} ؋</div>
        </div>
      </div>

      {/* Distribution bucket quick jump */}
      <div className="fd-section">
        <div className="fd-buckets">
          <BucketCard
            icon={Users}
            title="خانواده"
            value={buckets.familyPoolAfn}
            onClick={() => setActiveTab("family")}
          />
          <BucketCard
            icon={Crown}
            title="امتیاز داران"
            value={buckets.franchisePoolAfn}
            onClick={() => setActiveTab("franchise")}
          />
          <BucketCard
            icon={Wallet}
            title="حساب‌های پولی"
            value={buckets.cashBankTotalAfn}
            onClick={() => setActiveTab("money")}
          />
          <BucketCard
            icon={PiggyBank}
            title="حساب‌های ذخیره"
            value={buckets.reserveTotalAfn}
            onClick={() => setActiveTab("reserve")}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="fd-tabs">
        <button
          className={`fd-tab ${activeTab === "family" ? "is-active" : ""}`}
          onClick={() => setActiveTab("family")}
        >
          خانواده
        </button>
        <button
          className={`fd-tab ${activeTab === "franchise" ? "is-active" : ""}`}
          onClick={() => setActiveTab("franchise")}
        >
          امتیاز داران
        </button>
        <button
          className={`fd-tab ${activeTab === "money" ? "is-active" : ""}`}
          onClick={() => setActiveTab("money")}
        >
          حساب‌های پولی
        </button>
        <button
          className={`fd-tab ${activeTab === "reserve" ? "is-active" : ""}`}
          onClick={() => setActiveTab("reserve")}
        >
          حساب‌های ذخیره
        </button>
        <button
          className={`fd-tab ${activeTab === "payments" ? "is-active" : ""}`}
          onClick={() => setActiveTab("payments")}
        >
          پرداخت‌ها
        </button>
        <button
          className={`fd-tab ${activeTab === "debts" ? "is-active" : ""}`}
          onClick={() => setActiveTab("debts")}
        >
          بدهی‌ها
        </button>
      </div>

      <div className="fd-tabBody">
        {activeTab === "family" && (
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle="سهم خانواده"
            columns={poolCols}
            fetcher={fetchFamily}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={520}
          />
        )}

        {activeTab === "franchise" && (
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle="سهم امتیاز داران"
            columns={poolCols}
            fetcher={fetchFranchise}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={520}
          />
        )}

        {activeTab === "money" && (
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle="حساب‌های پولی"
            columns={moneyCols}
            fetcher={fetchMoney}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={520}
          />
        )}

        {activeTab === "reserve" && (
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle="حساب‌های ذخیره"
            columns={reserveCols}
            fetcher={fetchReserve}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={520}
          />
        )}

        {activeTab === "payments" && (
          <CustomTableV2
            key={paymentsKey}
            transport="legacy"
            dir="rtl"
            toolbarTitle="پرداخت‌ها"
            columns={paymentsCols}
            fetcher={fetchPayments}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={tableMaxBodyHeight}
            selectable
            onSelectedClick={printSelected}
          />
        )}

        {activeTab === "debts" && (
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle="بدهی‌ها"
            columns={debtCols}
            fetcher={fetchDebts}
            initialPageSize={25}
            showRefreshButton
            maxBodyHeight={520}
          />
        )}
      </div>

      <UpdateDollarRateModal
        open={dollarModalOpen}
        onClose={() => setDollarModalOpen(false)}
        onSubmit={onSaveDollar}
        currentRate={latestDollar ?? ""}
      />

      <EntriesModal
        key={entriesKey}               // <-- kritik
        open={entriesOpen}
        title={entriesCfg?.title}
        columns={entryCols}
        fetcher={fetchEntries}
        onClose={() => { setEntriesOpen(false); setEntriesCfg(null); }}
      />

    </div>
  );
}
