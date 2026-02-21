import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Button from "../../../shared/components/Button";
import { fetchDistricts } from "../slices/districtSlice";
import DistrictModal from "../modals/DistrictModal";
import ScrollCard from "../../../shared/components/ScrollCard";
import SmartSelect from "../../../shared/components/SmartSelect";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { MapMinus } from "lucide-react";

export default function DistrictList() {
  const dispatch = useDispatch();

  // Store
  const provinces = useSelector((s) => s.province?.list || []);
  const provinceStatus = useSelector((s) => s.province?.status || "idle");
  const districts = useSelector((s) => s.district?.list || []);
  const status = useSelector((s) => s.district?.status || "idle");
  const error = useSelector((s) => s.district?.error || null);

  // Select değeri string tutulur ("" | "12"), gerektiğinde Number'a çevrilir
  const [provinceId, setProvinceId] = useState("");
  const [openModal, setOpenModal] = useState(false);

  // Global loader
  const { show, hide } = useGlobalLoading();
  useEffect(() => {
    const isLoading = status === "loading" || provinceStatus === "loading";
    if (isLoading) show(); else hide();
    return () => hide();
  }, [status, provinceStatus, show, hide]);

  // ---- İlk yüklemede veriyi çek ----
  const hasLoggedInitialData = useRef(false);

  useEffect(() => {
    dispatch(fetchDistricts({ provinceId: null })); // hepsini çek, client-side filtre
  }, [dispatch]);

  useEffect(() => {
    if (status === "succeeded" && !hasLoggedInitialData.current) {
      hasLoggedInitialData.current = true;
    }
  }, [status, districts]);

  // provinceId -> name hızlı lookup
  const provinceNameById = useMemo(() => {
    const map = new Map();
    for (const p of provinces) map.set(p.id, p.name);
    return map;
  }, [provinces]);

  const provinceOptions = useMemo(
    () => provinces.map((p) => ({ value: String(p.id), label: p.name })),
    [provinces]
  );

  // SmartSelect normalize
  function normalizeSelectValue(opt) {
    if (opt === null || opt === undefined) return "";
    if (typeof opt === "object") {
      if (opt.value === null || opt.value === undefined) return "";
      return String(opt.value);
    }
    return String(opt);
  }

  // Client-side filtreleme
  const filteredDistricts = useMemo(() => {
    if (provinceId === "") return districts;
    const pidNum = Number(provinceId);
    if (!Number.isFinite(pidNum)) return districts;
    return districts.filter((d) => {
      const dPid = d.provinceId ?? d.province?.id;
      return Number(dPid) === pidNum;
    });
  }, [districts, provinceId]);

  // Tablo satırları
  const rows = useMemo(
    () =>
      filteredDistricts.map((d, i) => ({
        id: String(d.id ?? `${d.name}-${i}`),
        rowNumber: i + 1,
        provinceId: Number(d.provinceId ?? d.province?.id ?? NaN) || null,
        provinceName: d.province?.name || provinceNameById.get(d.provinceId) || "—",
        districtName: d.name ?? "—",
      })),
    [filteredDistricts, provinceNameById]
  );

  // Kolonlar
  const columns = useMemo(
    () => [
      {
        key: "provinceName",
        header: "ولایت",
        sortable: false,
        searchable: false,
        primaryFilter: true,
        minWidth: 180,
        // İstersen ileride parent-child filtre kurmak için provinceId'yi taşıyoruz
        filterValue: (row) => row.provinceId,
        type: "text",
      },
      {
        key: "districtName",
        header: "اسم ولسوالی",
        sortable: false,
        searchable: false,
        minWidth: 220,
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
          loading={status === "loading"}
          initialDensity="compact"
          initialPageSize={9}
          stickyFirstCol
          toolbarTitle="ولسوالی ها"
          emptyMessage={
            status === "failed"
              ? (error || "خطا در دریافت اطلاعات")
              : "هیچ ولسوالی ثبت نشده است."
          }
          rowKey={(r) => r.id}
          addButtonLabel="ولسوالی جدید"
          onAddClick={setOpenModal}
          addButtonIcon={MapMinus}
          showAddButton={true}
        />

    {/* <Button onClick={() => setOpenModal(true)} className="w-full">
      ولسوالی جدید
    </Button> */}

      {/* Modal kart DIŞINDA */}
      <DistrictModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        defaultProvinceId={provinceId === "" ? null : Number(provinceId)}
      />
    </section>
  );
}
