import { useEffect, useMemo, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import ScrollCard from "../../../shared/components/ScrollCard";
import SmartSelect from "../../../shared/components/SmartSelect";
import FloorModal from "../modals/FloorModal";
import { fetchFloors } from "../slices/floorSlice";
import { fetchMarkets } from "../../market/slices/marketSlice";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { Store } from "lucide-react";

export default function FloorList() {
  const dispatch = useDispatch();

  const markets = useSelector((s) => s.market?.list || []);
  const marketStatus = useSelector((s) => s.market?.status || "idle");
  const floors = useSelector((s) => s.floor?.list || []);
  const status = useSelector((s) => s.floor?.status || "idle");
  const error = useSelector((s) => s.floor?.error || null);

  const [marketId, setMarketId] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const hasLoggedInitialData = useRef(false);

  // Global loader
  const { show, hide } = useGlobalLoading();
  useEffect(() => {
    const isLoading = status === "loading" || marketStatus === "loading";
    if (isLoading) show(); else hide();
    return () => hide();
  }, [status, marketStatus, show, hide]);

  useEffect(() => {
    if (!markets || markets.length === 0) dispatch(fetchMarkets({ status: null }));
    dispatch(fetchFloors({ marketId: null, status: null }));
  }, [dispatch]);

  useEffect(() => {
    if (status === "succeeded" && !hasLoggedInitialData.current) {
      hasLoggedInitialData.current = true;
    }
  }, [status]);

  // Market id->name map
  const marketNameById = useMemo(() => {
    const map = new Map();
    for (const m of markets || []) map.set(String(m.id), m.marketName);
    return map;
  }, [markets]);

  // Select options
  const marketOptions = useMemo(
    () => (markets || []).map((m) => ({ value: String(m.id), label: m.marketName })),
    [markets]
  );

  function normalizeSelectValue(opt) {
    if (opt == null) return "";
    if (typeof opt === "object") return opt.value == null ? "" : String(opt.value);
    return String(opt);
  }

  // Client-side filter
  const filteredFloors = useMemo(() => {
    if (marketId === "") return floors || [];
    return (floors || []).filter(
      (f) => String(f.marketId ?? f.market?.id) === String(marketId)
    );
  }, [floors, marketId]);

  // Table rows
  const rows = useMemo(
    () =>
      (filteredFloors || []).map((f, i) => {
        const mid = String(f.marketId ?? f.market?.id ?? "");
        return {
          id: String(f.id ?? `${mid}-${f.floorName ?? i}`),
          rowNumber: i + 1,
          marketId: mid || null,
          marketName: f.market?.marketName || marketNameById.get(mid) || "—",
          floorName: f.floorName ?? "—",
          level: typeof f.level === "number" ? f.level : (f.level ?? "—"),
        };
      }),
    [filteredFloors, marketNameById]
  );

  // Columns
  const columns = useMemo(
    () => [
      {
        key: "marketName",
        header: "مارکیت",
        sortable: false,
        searchable: false,
        primaryFilter: false,
        minWidth: 180,
        filterValue: (row) => row.marketId,
        type: "text",
      },
      {
        key: "floorName",
        header: "نام طبقه",
        sortable: false,
        searchable: false,
        minWidth: 180,
        type: "text",
      },
    ],
    []
  );

  return (
    <section dir="rtl" className="w-full">

        <CustomTable
          columns={columns}
          data={rows}
          loading={status === "loading" || marketStatus === "loading"}
          initialDensity="compact"
          initialPageSize={9}
          stickyFirstCol
          toolbarTitle="طبقه‌ها"
          emptyMessage={
            status === "failed"
              ? (error || "خطا در دریافت اطلاعات")
              : "هیچ طبقه‌ای ثبت نشده است."
          }
          rowKey={(r) => r.id}
          addButtonLabel="طبقه جدید"
          onAddClick={setOpenModal}
          addButtonIcon={Store}
          showAddButton={true}
        />

      <FloorModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        defaultMarketId={marketId === "" ? null : marketId}
      />
    </section>
  );
}
