import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import Button from "../../../shared/components/Button";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import FranchiseShopModal from "../components/FranchiseShopModal";

import { fetchMarkets } from "../../market/slices/marketSlice";
import { fetchFloors } from "../../floor/slices/floorSlice";

import { shopService } from "../../shops/services/shopService";
import { uploadContractAndSaveMedia } from "../../files/slices/filesSlice";
import { addShare } from "../slices/shopFranchiseSharesSlice";

const toStr = (v) => (v == null ? "" : String(v));

const guid = () =>
  globalThis.crypto?.randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });

export default function ShopAssignScreen() {
  const dispatch = useDispatch();
  const { ownerId } = useParams();

  const markets = useSelector((s) => s.market?.list || []);
  const floors = useSelector((s) => s.floor?.list || []);

  const [refreshKey, setRefreshKey] = useState(0);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [activeShop, setActiveShop] = useState(null);

  const contractFolder = (id) => `/storage/franchise-owners/${id}/contracts`;

  const [mineItems, setMineItems] = useState([]);
  const [mineLoading, setMineLoading] = useState(false);



const loadMineTop50 = useCallback(async () => {
  if (!ownerId) return;

  setMineLoading(true);
  try {
    // ilk 50
    const res = await shopService.listAssignMine(ownerId, {
      page: 1,
      pageSize: 50,
      // sort: "PercentMy:desc" // backend ApplySort bunu destekliyorsa aç
    });

    setMineItems(Array.isArray(res?.items) ? res.items : []);
  } finally {
    setMineLoading(false);
  }
}, [ownerId]);

useEffect(() => {
  loadMineTop50();
}, [loadMineTop50, refreshKey]);


  useEffect(() => {
    if (!ownerId) return;
    if (!markets.length) dispatch(fetchMarkets());
    if (!floors.length) dispatch(fetchFloors());
  }, [dispatch, ownerId, markets.length, floors.length]);

  const marketById = useMemo(() => {
    const m = {};
    for (const x of markets) m[toStr(x.id)] = x;
    return m;
  }, [markets]);

  const floorById = useMemo(() => {
    const m = {};
    for (const x of floors) m[toStr(x.id)] = x;
    return m;
  }, [floors]);

  const marketFilterOptions = useMemo(
    () => (markets || []).map((m) => ({ value: toStr(m.id), label: m.marketName ?? "-" })),
    [markets]
  );

  // Floor options MUST depend on selected market in FilterModal draft => use asyncLoadOptions
  const floorAsyncOptions = useCallback(
    async (_q, _page, ctx) => {
      const parentMarketId = toStr(ctx?.parentValue);
      if (!parentMarketId) return { options: [], hasMore: false };

      const opts = (floors || [])
        .filter((f) => toStr(f.marketId) === parentMarketId)
        .map((f) => ({
          value: toStr(f.id),
          label: f.floorName ?? (f.level != null ? `طبقه ${f.level}` : "-"),
        }));

      return { options: opts, hasMore: false };
    },
    [floors]
  );


  // Fetchers: artık DIŞARIDAN filtre inject yok.
  // Filtreler CustomTableV2 -> FilterModal -> serializeQuery ile zaten finalQuery.filters içinde geliyor.
  const fetcherMine = useCallback(
    async (q) => {
      if (!ownerId) return { items: [], totalCount: 0, totalPages: 1 };
      return await shopService.listAssignMine(ownerId, q);
    },
    [ownerId]
  );

  const fetcherAvailable = useCallback(
    async (q) => {
      if (!ownerId) return { items: [], totalCount: 0, totalPages: 1 };
      return await shopService.listAssignAvailable(ownerId, q);
    },
    [ownerId]
  );

  const onPickShop = useCallback((row) => {
    setActiveShop(row);
    setModalOpen(true);
  }, []);

  const marketFilterCol = useMemo(
    () => ({
      key: "marketId",
      header: "مارکیت",
      type: "text",
      minWidth: 160,
      sortable: true,

      // FILTER
      filterType: "select",
      filterLabel: "مارکیت",
      serverField: "MarketId",
      filterOp: "eq",
      filterOptions: marketFilterOptions,
      filterOrder: 1,
      clearsOnChange: ["floorId"],

      render: (v) => marketById[toStr(v)]?.marketName ?? "-",
    }),
    [marketFilterOptions, marketById]
  );

  const floorFilterCol = useMemo(
    () => ({
      key: "floorId",
      header: "طبقه",
      type: "text",
      width: 130,
      sortable: true,

      // FILTER
      filterType: "select",
      filterLabel: "طبقه",
      serverField: "FloorId",
      filterOp: "eq",
      filterOrder: 2,
      dependsOnKey: "marketId",
      asyncLoadOptions: floorAsyncOptions,
      parentRequiredText: "ابتدا مارکیت را انتخاب کنید",

      render: (v) => floorById[toStr(v)]?.floorName ?? "-",
    }),
    [floorAsyncOptions, floorById]
  );

  const columnsAvailable = useMemo(
    () => [
      { key: "shopName", header: "نام دکان", sortable: true, type: "text", minWidth: 220, filterType: "text", serverField: "ShopName" },

      marketFilterCol,
      floorFilterCol,

      {
        key: "percentOpen",
        header: "سهم باز (%)",
        sortable: true,
        type: "number",
        width: 120,
        align: "right",
        render: (v) => (Number.isFinite(Number(v)) ? `${Math.round(Number(v))}%` : "-"),
      },
      { key: "ownersCount", header: "تعداد مالک", sortable: true, type: "number", width: 110, align: "right" },
      {
        key: "actions",
        header: "عملیات",
        sortable: false,
        width: 140,
        align: "center",
        render: (_v, row) => (
          <Button size="sm" className="!px-3 !py-1 text-xs" onClick={() => onPickShop(row)}>
            تخصیص
          </Button>
        ),
      },
    ],
    [marketFilterCol, floorFilterCol, onPickShop]
  );

  const handleSubmit = useCallback(
    async (form) => {
      if (!ownerId || !activeShop?.shopId) return;

      const contractId = guid();
      const folderUrl = contractFolder(ownerId);

      if (form.file) {
        await dispatch(
          uploadContractAndSaveMedia({
            file: form.file,
            ownerId,
            folderUrl,
            ownerType: 3,
            kind: 5,
            isPrimary: true,
          })
        ).unwrap();
      }

      const dto = {
        id: contractId,
        shopId: activeShop.shopId,
        franchiseOwnerId: ownerId,
        sharePercent: Number(form.myShare),
        effectiveFrom: form.startDate?.gregorian || null,
        effectiveTo: form.endDate?.gregorian || null,
        notes: form.description?.trim() || null,
      };

      await dispatch(addShare(dto)).unwrap();

      setModalOpen(false);
      setActiveShop(null);

      // iki tabloyu da yenile
      setRefreshKey((k) => k + 1);
    },
    [dispatch, ownerId, activeShop]
  );

  const title = useMemo(() => {
    const m = activeShop ? marketById[toStr(activeShop.marketId)]?.marketName : null;
    const f = activeShop ? floorById[toStr(activeShop.floorId)]?.floorName : null;
    const s = activeShop?.shopName || "دکان";
    if (m || f) return `${m || "مارکیت"} > ${f || "طبقه"} > ${s}`;
    return s;
  }, [activeShop, marketById, floorById]);

  return (
    <div dir="rtl" className="p-4 bg-slate-50 min-h-full">
      {/* %30 / %70 */}
      <div className="grid grid-cols-10 gap-3">
        {/* Left: Mine (30%) */}
        {/* Left: Mine (30%) - OLD CARD DESIGN, TOP 50 */}
<section className="col-span-10 lg:col-span-3 bg-white border rounded-md p-3 overflow-auto">
  <div className="p-2 flex items-center justify-between">
    <h3 className="font-semibold text-sm">
      دکان‌های سهم من ({mineItems.length})
    </h3>
  </div>

  {mineLoading && (
    <div className="text-xs text-slate-500 p-2 text-center">
      در حال بارگذاری...
    </div>
  )}

  {!mineLoading && mineItems.length === 0 && (
    <div className="text-xs text-gray-500 p-2 text-center">
      هیچ دکانی با سهم شما وجود ندارد.
    </div>
  )}

  <div className="space-y-3">
    {mineItems.map((sh) => {
      const m = marketById[toStr(sh.marketId)];
      const f = floorById[toStr(sh.floorId)];

      const percent =
        typeof sh.percentMy === "number"
          ? Number((sh.percentMy.toFixed?.(2) ?? sh.percentMy).toString())
          : null;

      return (
        <div
          key={toStr(sh.shopId)}
          className="
            flex overflow-hidden
            border-2 border-[color:var(--primary)]
            bg-white
            rounded-l-md rounded-r-none
            hover:shadow-md transition
          "
        >
          {/* Sol renkli şerit */}
          <div
            className="
              w-24 min-w-24
              bg-[color:var(--primary)]
              text-white flex flex-col items-center justify-between
              py-3
              rounded-l-none rounded-r-none
            "
          >
            <div className="text-[22px] font-extrabold leading-none">
              {percent != null ? `${percent}%` : `—`}
            </div>
            <div className="text-[15px] font-semibold opacity-95">سهم</div>
          </div>

          {/* İnce ayırıcı */}
          <div className="w-[1px] bg-[color-mix(in_oklab,var(--primary) 55%,white)]" />

          {/* Sağ içerik */}
          <div className="flex-1 p-3 pr-4 min-w-0 rounded-none">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-[21px] font-extrabold truncate">
                {sh.shopName || "(بی‌نام)"}
              </div>
            </div>

            <div className="text-[14px] text-gray-600 mt-1 truncate">
              {m?.marketName || "-"} ⟨ {f?.floorName ?? "-"} ⟩
            </div>
          </div>
        </div>
      );
    })}
  </div>
</section>


        {/* Right: Available (70%) */}
        <section className="col-span-10 lg:col-span-7 bg-white border rounded-md p-3">
          <CustomTableV2
            key={`available-${ownerId}-${refreshKey}`}
            dir="rtl"
            columns={columnsAvailable}
            toolbarTitle="دکان‌های دارای سهم باز"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={640}
            showSearchBar={true}
            showServerSearchButton={true}
            emptyMessage="هیچ دکانی یافت نشد."
            fetcher={fetcherAvailable}
          />
        </section>
      </div>

      {modalOpen && (
        <FranchiseShopModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setActiveShop(null);
          }}
          onSubmit={handleSubmit}
          title={title}
          calendarMode="persian"
          dir="rtl"
          myShareMax={Math.max(1, Math.min(100, Math.round(Number(activeShop?.percentOpen ?? 100))))}
        />
      )}
    </div>
  );
}