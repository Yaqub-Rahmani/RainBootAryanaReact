import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { NotebookPen, Ellipsis } from "lucide-react";
import { useNavigate } from "react-router-dom";

import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import SmartSelect from "../../../shared/components/SmartSelect";
import TenantContractModal from "../components/TenantContractModal";
import MeterReadingConfirmModal from "../../meterReading/components/MeterReadingConfirmModal";
import AddDebtsModal from "../../collection/components/addDebtsModal";

import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import { guid } from "../../../shared/person/onboardConstants";

import { fetchMarkets } from "../../market/slices/marketSlice";
import { fetchFloors } from "../../floor/slices/floorSlice";
import { fetchTenants } from "../../tenant/slices/tenantSlice";

import {
  fetchAvailableShopsForContracts,
  clearAvailableForContracts,
} from "../../shops/slices/shopSlice";

import {
  selectAvailableShopsForContracts,
  selectAvailableShopsForContractsStatus,
  selectAvailableShopsForContractsError,
} from "../../shops/selectors/shopSelectors";

import {
  clearListItems,
  fetchContractListItems,
  addContract,
} from "../slices/contractSlice";
import { uploadContractAndSaveMedia } from "../../files/slices/filesSlice";

import {
  addMeterReading,
  fetchMeterReadingNewContext,
} from "../../meterReading/slices/meterReadingSlice";
import { addContractDebtPayment } from "../../collection/slices/collectionSlice";
import { mapNewContextToLastReading } from "../services/mapLastReading";
import ServerReportModal from "../../../shared/reporting/ServerReportModal";

/** ---------- Helpers ---------- */
const toStr = (v, fb = "") => (v === null || v === undefined ? fb : String(v));
const tidy = (s) => toStr(s).replace(/\s+/g, " ").trim();

const fmtMoney = (n) => {
  if (n === null || n === undefined) return "—";
  const v = Number(n);
  if (Number.isNaN(v)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v);
};

/** ---------- Component ---------- */
export default function ContractPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { show, hide } = useGlobalLoading();

  // ✅ avoid "selector returned different result" warning: don't create new [] inside selector
  const marketList = useSelector((s) => s.market?.list);
  const floorList = useSelector((s) => s.floor?.list);
  const tenantList = useSelector((s) => s.tenant?.list);

  const marketStatus = useSelector((s) => s.market?.status || "idle");
  const floorStatus = useSelector((s) => s.floor?.status || "idle");
  const tenantStatus = useSelector((s) => s.tenant?.status || "idle");

  const contractListItemsStatus = useSelector(
    (s) => s.contract?.listItemsStatus || "idle"
  );
  const contractListItemsError = useSelector(
    (s) => s.contract?.listItemsError || null
  );

  const availableShops = useSelector(selectAvailableShopsForContracts);
  const availableShopsStatus = useSelector(
    selectAvailableShopsForContractsStatus
  );
  const availableShopsError = useSelector(
    selectAvailableShopsForContractsError
  );

  // Modals
  const [openModal, setOpenModal] = useState(false);
  const [isMeterModalOpen, setIsMeterModalOpen] = useState(false);

  const [selectContractId, setSelectContractId] = useState(null);
  const [selectShopId, setSelectShopId] = useState(null);

  const [debtsModalOpen, setDebtsModalOpen] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [selectedShopId, setSelectedShopId] = useState(null);

  // ✅ Reports
  const [reportOpen, setReportOpen] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const handleSelectedReport = useCallback((selectedRows) => {
    setReportRows(Array.isArray(selectedRows) ? selectedRows : []);
    setReportOpen(true);
  }, []);


  // One-time bootstrap
  const didInit = useRef(false);
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;

    dispatch(fetchMarkets());
    dispatch(fetchFloors());
    dispatch(fetchTenants());
    dispatch(fetchAvailableShopsForContracts());

    // initial table load
    dispatch(
      fetchContractListItems({ queryOptions: { Page: 1, PageSize: 25 } })
    );
  }, [dispatch]);

  // Global loading
  useEffect(() => {
    const isLoading = [
      availableShopsStatus,
      marketStatus,
      floorStatus,
      tenantStatus,
      contractListItemsStatus,
    ].some((st) => st === "loading");
    if (isLoading) show();
    else hide();
    return () => hide();
  }, [
    availableShopsStatus,
    marketStatus,
    floorStatus,
    tenantStatus,
    contractListItemsStatus,
    show,
    hide,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      dispatch(clearAvailableForContracts());
      dispatch(clearListItems());
    };
  }, [dispatch]);

  /** ---------- Options ---------- */
  const markets = useMemo(() => {
    return (marketList ?? []).map((m) => ({
      value: toStr(m.id),
      label: tidy(m.marketName),
      id: m.id,
      marketName: tidy(m.marketName),
    }));
  }, [marketList]);

  const floors = useMemo(() => {
    return (floorList ?? []).map((f) => ({
      value: toStr(f.id),
      label: tidy(f.floorName),
      id: f.id,
      marketId: f.marketId,
      floorName: tidy(f.floorName),
    }));
  }, [floorList]);

  const tenants = useMemo(() => {
    const map = new Map();
    for (const raw of tenantList ?? []) {
      const id = toStr(raw?.id || raw?.tenantId || "");
      const display = tidy(raw?.displayName || raw?.name || "نامعلوم");
      if (!map.has(id))
        map.set(id, { value: id, label: display, id, fullName: display, raw });
    }
    return [...map.values()].sort((a, b) =>
      a.fullName.localeCompare(b.fullName, "fa", { sensitivity: "base" })
    );
  }, [tenantList]);

  /** ---------- Row actions ---------- */
  const actionOptions = useMemo(
    () => [
      { value: "detail", label: "بیشتر" },
      { value: "payElectricity", label: "ثبت بل برق" },
      { value: "closeDebt", label: "رسید" },
    ],
    []
  );

  const marketFilterOptions = useMemo(
    () => (marketList ?? []).map((m) => ({
      value: toStr(m.id),
      label: tidy(m.marketName),
    })),
    [marketList]
  );

  const floorAsyncOptions = useCallback(
    async (_q, _page, ctx) => {
      const parentMarketId = toStr(ctx?.parentValue);
      if (!parentMarketId) return { options: [], hasMore: false };
      

      const opts = (floorList ?? [])
        .filter((f) => String(f.marketId) === String(parentMarketId))
        .map((f) => ({
          value: toStr(f.id),
          label: tidy(f.floorName),
        }));

      return { options: opts, hasMore: false };
    },
    [floorList]
  );


  const marketFilterCol = useMemo(() => ({
      key: "marketId",
      header: "مارکیت",
      visible: false,                // tabloda göstermeyebilirsin
      serverField: "MarketId",
      sortable: true,
      menuVisible: false, 
      filterOrder:1,

      filterType: "select",
      filterLabel: "مارکیت",
      filterOp: "eq",
      filterOptions: marketFilterOptions,
      render: (_v, row) => row?.marketName ?? row?.MarketName ?? "—",
    }), [marketFilterOptions]);


  const floorFilterCol = useMemo(() => ({
      key: "floorId",
      header: "طبقه",
      visible: false,
      serverField: "FloorId",
      sortable: true,
      menuVisible: false, 

      filterType: "select",
      filterLabel: "طبقه",
      filterOp: "eq",
      filterOrder: 2,
      dependsOnKey: "marketId",
    
    asyncLoadOptions: floorAsyncOptions,
    render: (_v, row) => row?.floorName ?? row?.FloorName ?? "—",
  }), [floorAsyncOptions]);


  const handleRowAction = useCallback(
    (option, row) => {
      // SmartSelect bazen string döndürür, bazen {value,label}
      const actionValue =
        typeof option === "string"
          ? option
          : option?.value ?? option?.id ?? option?.key;

      if (!actionValue) return;

      switch (actionValue) {
        case "detail":
          navigate(`/contracts/${row.contractId}`);
          break;

        case "payElectricity":
          setSelectContractId(row.contractId);
          setSelectShopId(row.shopId);
          setIsMeterModalOpen(true);
          break;

        case "closeDebt":
          setSelectedContractId(row.contractId);
          setSelectedShopId(row.shopId);
          setDebtsModalOpen(true);
          break;

        default:
          break;
      }
    },
    [navigate]
  );


  /** ---------- Columns (NO Market/Floor filter here) ---------- */
  const columns = useMemo(
    () => [
      // Grouping hidden (still show group by Market/Floor in table if you use it)
      
      marketFilterCol,
      floorFilterCol,


      {
        key: "marketName",
        header: "مارکیت",
        visible: false,
        serverField: "MarketName",
      },
      {
        key: "floorName",
        header: "طبقه",
        visible: false,
        serverField: "FloorName",
      },

      { key: "shopName", header: "نام دکان", serverField: "ShopName" },

      {
        key: "tenantName",
        header: "کرایه‌نشین",
        serverField: "TenantName",
        sortable: true,
        searchable: true,
        filterLabel: "اسم کرایه نشین",
        filterType: "text",
        filterOp: "contains",
      },
      {
        key: "businessActivity",
        header: "فعالیت دکان",
        serverField: "BusinessActivity",
        sortable: false,
        searchable: true,
        filterType: "text",
        filterOp: "contains",
        filterLabel: "فعالیت دوکان",
      },

      {
        key: "franchiseSummary",
        header: "امتیازدار",
        serverField: "FranchiseSummary",
        sortable: false,
        filterType: "select",
        filterLabel: "امتیاز دارد؟",
        filterOptions: [
          { value: "", label: "همه" },
          { value: "has", label: "دارد" },
          { value: "no", label: "ندارد" },
        ],
        buildFilter: (v) => {
          if (!v) return null;
          if (v === "has")
            return { field: "FranchiseOwnersCount", op: "eq", value: "has" };
          if (v === "no")
            return { field: "FranchiseOwnersCount", op: "eq", value: "no" };
          return null;
        },
        render: (v, row) => {
          if (v) return v;
          const c = row?.franchiseOwnersCount ?? 0;
          return c > 0 ? `امتیازدار: ${c}` : "—";
        },
      },

      // Dates (display only)
      {
        key: "contractStartDate",
        header: "شروع تاریخ",
        visible: false,
        serverField: "ContractStartDate",
        sortable: true,
        render: (_v, r) =>
          r?.contractStartDate
            ? convertAfDate(r.contractStartDate, { monthStyle: "name" })
            : "—",
      },
      {
        key: "contractEndDate",
        header: "پایان تاریخ",
        visible: false,
        serverField: "ContractEndDate",
        sortable: true,
        render: (_v, r) =>
          r?.contractEndDate
            ? convertAfDate(r.contractEndDate, { monthStyle: "name" })
            : "—",
      },

      // Amounts
      {
        key: "ownerPortionAmount",
        header: "سهم مالک",
        visible: false,
        serverField: "OwnerPortionAmount",
        sortable: true,
        render: fmtMoney,
      },
      {
        key: "marketPortionAmount",
        header: "سهم مارکیت",
        visible: false,
        serverField: "MarketPortionAmount",
        sortable: true,
        render: fmtMoney,
      },
      {
        key: "franchisePortionAmount",
        header: "سهم امتیاز",
        visible: false,
        serverField: "FranchisePortionAmount",
        sortable: true,
        render: fmtMoney,
      },
      {
        key: "totalFixedRent",
        header: "جمع ثابت",
        visible: false,
        serverField: "TotalFixedRent",
        sortable: true,
        render: fmtMoney,
      },

      // Electricity
      {
        key: "electricityThisPeriodTotal",
        header: "برق (ماه جاری)",
        visible: false,
        serverField: "ElectricityThisPeriodTotal",
        sortable: true,
        render: (v) => (v == null ? "—" : fmtMoney(v)),
      },

      // Old debt (select UI + buildFilter => OldDebtTotal gt/eq)
      {
        key: "oldDebtTotal",
        header: "باقی‌داری گذشته",
        visible: true,
        serverField: "OldDebtTotal",
        sortable: true,
        filterType: "select",
        filterLabel: "باقی‌داری گذشته دارد؟",
        filterOptions: [
          { value: "", label: "همه" },
          { value: "has", label: "دارد" },
          { value: "no", label: "ندارد" },
        ],
        buildFilter: (v) => {
          if (!v) return null;
          if (v === "has")
            return { field: "OldDebtTotal", op: "eq", value: "has" };
          if (v === "no")
            return { field: "OldDebtTotal", op: "eq", value: "no" };
          return null;
        },
        render: fmtMoney,
      },

      // Due day
      {
        key: "dueDayOfMonth",
        header: "روز رسید",
        visible: false,
        serverField: "DueDayOfMonth",
        sortable: true,
        filterType: "select",
        filterOp: "eq",
        filterLabel: "روز رسید",
        filterOptions: Array.from({ length: 31 }, (_, i) => ({
          value: String(i + 1),
          label: String(i + 1),
        })),
        render: (v) => (v == null ? "—" : String(v)),
      },

      // Status
      {
        key: "status",
        header: "حالت",
        visible: false,
        serverField: "Status",
        sortable: true,
        filterType: "select",
        filterOp: "eq",
        filterLabel: "حالت",
        filterOptions: [
          { value: "1", label: "فعال" },
          { value: "2", label: "آرشیف" },
        ],
        render: (v) => (String(v) === "2" ? "آرشیف" : "فعال"),
      },

      // Actions
      {
        key: "__actions",
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
    // [actionOptions, handleRowAction]
    [actionOptions, handleRowAction, marketFilterCol, floorFilterCol]
  );

  /** ---------- Fetcher: inject MarketId / FloorId into q.filters ---------- */



  const fetcher = useCallback(
  async (q) => {
    const filters = Array.isArray(q?.filters) ? [...q.filters] : [];
    const cleaned = [];

    for (const token of filters) {
      const s = String(token);
      const low = s.toLowerCase();

      // Franchise normalize
      if (low.startsWith("franchiseownerscount:eq:0")) {
        cleaned.push("FranchiseOwnersCount:eq:no");
        continue;
      }
      if (low.startsWith("franchiseownerscount:gt:0")) {
        cleaned.push("FranchiseOwnersCount:eq:has");
        continue;
      }

      // OldDebt normalize
      if (low.startsWith("olddebttotal:eq:0")) {
        cleaned.push("OldDebtTotal:eq:no");
        continue;
      }
      if (low.startsWith("olddebttotal:gt:0")) {
        cleaned.push("OldDebtTotal:eq:has");
        continue;
      }

      cleaned.push(s);
    }

    const q2 = { ...q, filters: cleaned };

    const action = await dispatch(fetchContractListItems({ queryOptions: q2 }));
    if (action.error) throw new Error(action.payload || action.error.message || "Hata");

    return action.payload.data; // PagedResult
  },
  [dispatch]
);


  // const fetcher = useCallback(
  //   async (q) => {
  //     const filters = Array.isArray(q?.filters) ? [...q.filters] : [];

  //     const cleaned = [];
  //     for (const token of filters) {
  //       const s = String(token);

  //       const low = s.toLowerCase();

  //       // 1) Her zaman top-filter tarafından yönetilecek alanlar: temizle
  //       if (low.startsWith("marketid:eq:")) continue;
  //       if (low.startsWith("floorid:eq:")) continue;

  //       // 2) Franchise fallback normalize
  //       // UI yanlışlıkla "FranchiseOwnersCount:eq:0" veya "gt:0" yollarsa düzelt
  //       if (low.startsWith("franchiseownerscount:eq:0")) {
  //         cleaned.push("FranchiseOwnersCount:eq:no");
  //         continue;
  //       }
  //       if (low.startsWith("franchiseownerscount:gt:0")) {
  //         cleaned.push("FranchiseOwnersCount:eq:has");
  //         continue;
  //       }

  //       // 3) OldDebt fallback normalize
  //       if (low.startsWith("olddebttotal:eq:0")) {
  //         cleaned.push("OldDebtTotal:eq:no");
  //         continue;
  //       }
  //       if (low.startsWith("olddebttotal:gt:0")) {
  //         cleaned.push("OldDebtTotal:eq:has");
  //         continue;
  //       }

  //       cleaned.push(s);
  //     }

  //     // 4) Top filters inject (Market/Floor)
  //     if (marketFilterId) cleaned.push(`MarketId:eq:${marketFilterId}`);
  //     // market seçili değilse floor da mantıken uygulanmamalı
  //     if (marketFilterId && floorFilterId)
  //       cleaned.push(`FloorId:eq:${floorFilterId}`);

  //     const q2 = { ...q, filters: cleaned };

  //     const action = await dispatch(
  //       fetchContractListItems({ queryOptions: q2 })
  //     );
  //     if (action.error)
  //       throw new Error(action.payload || action.error.message || "Hata");

  //     return action.payload.data; // PagedResult
  //   },
  //   [dispatch, marketFilterId, floorFilterId]
  // );

  /** ---------- Meter reading ---------- */
  const newContext = useSelector((s) => s.meterReading?.newContext);
  useEffect(() => {
    if (selectContractId)
      dispatch(fetchMeterReadingNewContext(selectContractId));
  }, [dispatch, selectContractId]);

  const lastReading = useMemo(
    () => mapNewContextToLastReading(newContext?.data),
    [newContext?.data]
  );

  const handleConfirmMeter = useCallback(
    async (payload) => {
      const previousIndex = Number(lastReading?.index ?? 0);
      const currentIndex = Number(payload.todayIndex || 0);
      const unitPrice =
        Number(payload.unitPrice || 0) ||
        Number(lastReading?.unitPrice || 0) ||
        0;

      const readingDto = {
        meterReadingId: guid(),
        shopId: selectShopId,
        contractId: selectContractId,
        previousIndex,
        currentIndex,
        unitPrice,
        reserveRate: 0.2,
        notes: payload.description?.trim() || null,
        isConfirmed: !!payload.isConfirmed,
      };

      await dispatch(addMeterReading(readingDto)).unwrap();
      setIsMeterModalOpen(false);
    },
    [dispatch, lastReading, selectShopId, selectContractId]
  );

  /** ---------- Create contract ---------- */
  const handleSubmitContract = useCallback(
    async (form) => {
      try {
        const contractId = guid();
        const folderUrl = `/storage/tenants/${contractId}/contracts`;

        const dto = {
          contractId,
          shopId: form.shopId,
          tenantId: form.tenantId,
          signedOn: form.startDate,
          startDate: form.startDate,
          endDate: form.endDate,
          dueDayOfMonth: Number(form.dueDayOfMonth),
          ownerPortionAmount: Number(form.ownerPortionAmount),
          franchisePortionAmount: Number(form.franchisePortionAmount),
          marketPortionAmount: Number(form.marketPortionAmount),
          electricityNote: "",
          businessActivity: form.businessActivity?.trim() || "",
          Note: form.description?.trim() || "",
          version: "V1",
          InitialElectricityIndex: Number(form.electricityNote?.trim() || 0),
        };

        if (form.file) {
          await dispatch(
            uploadContractAndSaveMedia({
              file: form.file,
              ownerId: contractId,
              folderUrl,
              ownerType: 6,
              kind: 6,
              isPrimary: true,
            })
          ).unwrap();
        }

        await dispatch(addContract(dto)).unwrap();
        await dispatch(fetchAvailableShopsForContracts());

        // refresh table
        await dispatch(
          fetchContractListItems({ queryOptions: { Page: 1, PageSize: 25 } })
        );
        setOpenModal(false);
      } catch (err) {
        console.error("Contract submit hata:", err);
      }
    },
    [dispatch]
  );

  const handleDebtsSubmit = useCallback(
    (payload) => dispatch(addContractDebtPayment(payload)),
    [dispatch]
  );

  return (
    <div dir="rtl" className="p-4 bg-slate-50">
      {contractListItemsStatus === "failed" && (
        <div className="text-sm text-red-600 mb-2">
          {contractListItemsError || "قراردادها بارگیری نشد."}
        </div>
      )}
      <section>
        <CustomTableV2
          columns={columns}
          toolbarTitle="فهرست قراردادها"
          transport="legacy"
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          maxBodyHeight={520}
          showSearchBar={true}
          emptyMessage="هیچ قراردادی یافت نشد."
          addButtonLabel="قرارداد جدید"
          addButtonIcon={NotebookPen}
          showAddButton={true}
          onAddClick={() => setOpenModal(true)}          
          selectable={true}
          onSelectedClick={handleSelectedReport}
          fetcher={fetcher}
        />
      </section>

      {availableShopsStatus === "failed" && (
        <div className="text-xs text-red-600 mt-3">
          {availableShopsError || "فهرست دکان‌های در دسترس گرفتن نشد."}
        </div>
      )}

      <TenantContractModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleSubmitContract}
        markets={markets}
        floors={floors}
        shops={(availableShops || []).map((s) => ({
          value: toStr(s.id),
          label: tidy(s.name ?? s.shopName ?? "دکان"),
          id: s.id,
          marketId: s.marketId,
          floorId: s.floorId,
          hasActiveFranchiseOwner: s.hasActiveFranchiseOwner,
        }))}
        tenants={tenants}
      />

      <MeterReadingConfirmModal
        isOpen={isMeterModalOpen}
        onClose={() => setIsMeterModalOpen(false)}
        onConfirm={handleConfirmMeter}
        lastReading={lastReading}
        currencySymbol={"؋"}
      />

      <AddDebtsModal
        open={debtsModalOpen}
        contractId={selectedContractId}
        onClose={() => setDebtsModalOpen(false)}
        onSubmit={handleDebtsSubmit}
      />

      <ServerReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        variant="contract"
        rows={reportRows}
      />
    </div>
  );
}
