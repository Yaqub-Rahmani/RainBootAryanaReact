import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import ProvinceModal from "../modals/ProvinceModal";
import { fetchProvinces } from "../slices/provinceSlice";
import ScrollCard from "../../../shared/components/ScrollCard";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { MapMinus } from "lucide-react";

export default function ProvinceList() {
  const dispatch = useDispatch();
  const provinces = useSelector((s) => s.province.list);
  const status = useSelector((s) => s.province.status);
  const [openModal, setOpenModal] = useState(false);

  // Global loader
  const { show, hide } = useGlobalLoading();
  useEffect(() => {
    if (status === "loading") show();
    else hide();
    return () => hide();
  }, [status, show, hide]);

  useEffect(() => {
    dispatch(fetchProvinces());
  }, [dispatch]);

  // Satırlar
  const rows = useMemo(
    () =>
      (provinces || []).map((p, i) => ({
        id: String(p.id ?? i),
        rowNumber: i + 1,
        name: p.name ?? "—",
      })),
    [provinces]
  );

  // Kolonlar
  const columns = useMemo(
    () => [
      // { key: "rowNumber", header: "#", width: 80, align: "center", sortable: false },
      { key: "name", header: "اسـم ولایات", sortable: false, searchable: false, minWidth: 240, type: "text" },
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
          initialPageSize={10}
          stickyFirstCol
          searchable= {false}
          toolbarTitle="ولایات"
          emptyMessage="هیچ ولایتی ثبت نشده است."
          rowKey={(r) => r.id}
          addButtonLabel="ولایت جدید"
          onAddClick={setOpenModal}
          addButtonIcon={MapMinus}
          showAddButton={true}
          />
       <ProvinceModal open={openModal} onClose={() => setOpenModal(false)} />
    </section>
  );
}
