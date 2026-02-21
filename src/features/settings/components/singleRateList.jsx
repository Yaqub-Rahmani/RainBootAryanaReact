import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { Percent } from "lucide-react";
import SingleRateModal from "../modal/singleRateModal";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import {
  addSingleRatePolicy,
  fetchSingleRatePolicies,
} from "../slices/singleRatePolicySlice";

const TYPE_ELECTRIC = 1; // ریزرف برق
const TYPE_MARKET = 2; // ریزرف مارکیت

const SingleRateList = () => {
  const dispatch = useDispatch();

  const list = useSelector((s) => s.singleRatePolicy.list);
  const listStatus = useSelector((s) => s.singleRatePolicy.listStatus);
  const error = useSelector((s) => s.singleRatePolicy.error);

  const [openModal, setOpenModal] = useState(false);
  const [modalType, setModalType] = useState(null); // 1: برق, 2: مارکیت

  const { show, hide } = useGlobalLoading();

  // Global loader
  useEffect(() => {
    if (listStatus === "loading") show();
    else hide();
    return () => hide();
  }, [listStatus, show, hide]);

  // İlk yüklemede listeyi çek
  useEffect(() => {
    dispatch(fetchSingleRatePolicies());
  }, [dispatch]);

  // Listeyi aktif olana göre sırala (aktifler üstte)
  const sortedList = useMemo(() => {
    if (!list) return [];
    return [...list].sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1;
    });
  }, [list]);

  // Tiplerine göre ikiye ayır
  const electricItems = useMemo(
    () => sortedList.filter((p) => p.type === TYPE_ELECTRIC),
    [sortedList]
  );

  const marketItems = useMemo(
    () => sortedList.filter((p) => p.type === TYPE_MARKET),
    [sortedList]
  );

  // Ortak row mapper
  const mapToRows = useCallback((items) => {
    return (items || []).map((p, index) => ({
      id: String(p.id || index),
      rowNumber: index + 1,
      createdAtUtc: p.createdAtUtc,
      ratePercent: p.ratePercent,
      notes: p.notes || "—",
      isActive: p.isActive,
      type: p.type,
    }));
  }, []);

  const rowsElectric = useMemo(
    () => mapToRows(electricItems),
    [electricItems, mapToRows]
  );

  const rowsMarket = useMemo(
    () => mapToRows(marketItems),
    [marketItems, mapToRows]
  );

  // Ortak kolonlar
  const columns = useMemo(
    () => [
      {
        key: "createdAtUtc",
        header: "تاریخ آغاز اجرا",
        minWidth: 160,
        type: "date",
        render: (_v, r) =>
          r.createdAtUtc
            ? convertAfDate(r.createdAtUtc, { monthStyle: "name" })
            : "—",
      },
      {
        key: "ratePercent",
        header: "فیصدی ریزرف (%)",
        minWidth: 140,
        type: "number",
      },
      {
        key: "isActive",
        header: "وضعیت",
        minWidth: 120,
        type: "text",
        render: (v, r) => (r.isActive ? "فعال" : "غیر فعال"),
      },
      {
        key: "notes",
        header: "نوضیحات",
        minWidth: 160,
        type: "text",
      },
    ],
    []
  );

  // Modal açma
  const handleOpenModal = useCallback((type) => {
    setModalType(type);
    setOpenModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setOpenModal(false);
    setModalType(null);
  }, []);

  // Modal onay
  const handleModalConfirm = useCallback(
    ({ ratePercent, notes }) => {
      if (!modalType) return;

      const today = new Date();
      const createdAtUtc = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

      const dto = {
        type: modalType,
        ratePercent: Number(ratePercent) || 0,
        createdAtUtc,
        notes: notes || "",
      };

      dispatch(addSingleRatePolicy(dto))
        .then(() => {
          setOpenModal(false);
          setModalType(null);
          dispatch(fetchSingleRatePolicies());
        })
        .catch((err) => {
          console.error("SingleRatePolicy eklenirken hata:", err);
        });
    },
    [dispatch, modalType]
  );

  return (
    <section dir="rtl" className="w-full">
      {error && (
        <div className="mb-3 text-sm text-red-600">
          خطا در بارگیری پالیسی‌ها: {error}
        </div>
      )}

      {/* İki tablo tüm ekranı ikiye bölüşsün */}
      <div className="grid grid-cols-2 gap-x-6 w-full">
        {/* ریزرف برق */}
        <CustomTable
          columns={columns}
          data={rowsElectric}
          loading={listStatus === "loading"}
          initialDensity="compact"
          initialPageSize={10}
          stickyFirstCol
          searchable={false}
          toolbarTitle="ریزرف برق"
          emptyMessage="هیچ پالیسی برای ریزرف برق ثبت نشده است."
          rowKey={(r) => r.id}
          addButtonLabel="ریزرف برق"
          onAddClick={() => handleOpenModal(TYPE_ELECTRIC)}
          addButtonIcon={Percent}
          showAddButton={true}
        />

        {/* ریزرف مارکیت */}
        <CustomTable
          columns={columns}
          data={rowsMarket}
          loading={listStatus === "loading"}
          initialDensity="compact"
          initialPageSize={10}
          stickyFirstCol
          searchable={false}
          toolbarTitle="ریزرف مارکیت"
          emptyMessage="هیچ پالیسی برای ریزرف مارکیت ثبت نشده است."
          rowKey={(r) => r.id}
          addButtonLabel="ریزرف مارکیت"
          onAddClick={() => handleOpenModal(TYPE_MARKET)}
          addButtonIcon={Percent}
          showAddButton={true}
        />
      </div>

      <SingleRateModal
        isOpen={openModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
        typeId={modalType}
      />
    </section>
  );
};

export default SingleRateList;
