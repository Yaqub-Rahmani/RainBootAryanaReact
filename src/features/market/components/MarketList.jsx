import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import ScrollCard from "../../../shared/components/ScrollCard";
import MarketModal from "../modals/MarketModal";
import { fetchMarkets } from "../slices/marketSlice";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { Warehouse } from "lucide-react";

export default function MarketList() {
  const dispatch = useDispatch();
  const markets = useSelector((s) => s.market?.list || []);
  const status = useSelector((s) => s.market?.status || "idle");
  const error = useSelector((s) => s.market?.error || null);

  const [openModal, setOpenModal] = useState(false);

  // Global loader
  const { show, hide } = useGlobalLoading();
  useEffect(() => {
    if (status === "loading") show();
    else hide();
    return () => hide();
  }, [status, show, hide]);

  useEffect(() => {
    dispatch(fetchMarkets({ status: null }));
  }, [dispatch]);

  const rows = useMemo(
    () =>
      (markets || []).map((m, i) => ({
        id: String(m.id ?? i),
        rowNumber: i + 1,
        marketName: m.marketName ?? "—",
        isActive: !!m.status,
      })),
    [markets]
  );

  const renderStatus = (v) => {
    const text = v ? "فعال" : "غیرفعال";
    const cls = v
      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
      : "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300";
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${cls}`}>
        {text}
      </span>
    );
  };

  const columns = useMemo(
    () => [
      { key: "marketName", header: "مارکیت", sortable: false, searchable: false, minWidth: 220, type: "text" },
    ],
    []
  );

  return (
    <section dir="rtl" className="w-full">

        <CustomTable
          columns={columns}
          data={rows}
          loading={status === "loading"}
          initialDensity="compact"
          initialPageSize={9}
          stickyFirstCol
          toolbarTitle="مارکیت ها"
          emptyMessage={
            status === "failed"
              ? (error || "خطا در دریافت اطلاعات")
              : "هیچ مارکت ثبت نشده است."
          }
          rowKey={(r) => r.id}
          addButtonLabel="مارکیت جدید"
          onAddClick={setOpenModal}
          addButtonIcon={Warehouse}
          showAddButton={true}
        />
        <MarketModal open={openModal} onClose={() => setOpenModal(false)} />

    </section>
  );
}
