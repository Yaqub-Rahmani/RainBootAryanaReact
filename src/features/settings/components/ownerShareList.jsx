import React, {
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import CustomTable from "../../../shared/components/CustomTable";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { Users } from "lucide-react";
import OwnerShareModal from "../modal/ownerShareModal";

import {
  fetchOwnerDistributionPolicies,
  addOwnerDistributionPolicy,
} from "../../settings/slices/ownerDistributionPolicySlice";
import { convertAfDate } from "../../../shared/date/convertAfDate";

export default function OwnerShareList() {
  const dispatch = useDispatch();

  const list = useSelector((s) => s.ownerDistributionPolicy.list);
  const listStatus = useSelector((s) => s.ownerDistributionPolicy.listStatus);
  const error = useSelector((s) => s.ownerDistributionPolicy.error);

  const [openModal, setOpenModal] = useState(false);

  // Global loader
  const { show, hide } = useGlobalLoading();
  useEffect(() => {
    if (listStatus === "loading") show();
    else hide();
    return () => hide();
  }, [listStatus, show, hide]);

  // İlk yüklemede liste
  useEffect(() => {
    dispatch(fetchOwnerDistributionPolicies());
  }, [dispatch]);

  const sortedList = useMemo(
  () =>
    [...(list || [])].sort((a, b) => {
      if (a.isActive === b.isActive) return 0;
      return a.isActive ? -1 : 1; // true önce
    }),
  [list]
);


  // Tablo satırları
  const rows = useMemo(
    () =>
      (sortedList || []).map((p, i) => ({
        id: String(p.id ?? i),
        rowNumber: i + 1,
        effectiveFromUtc: p.createdAtUtc,
        taxPercent: p.rateTax,
        reservePercent: p.rateOwnerReserve,
        zakatPercent: p.rateZakat,
        charityPercent: p.rateCharity,
        familyPool: p.rateFamilyPool,
        notes: p.notes ?? "—",
        isActive: p.isActive ?? false, 
      })),
    [sortedList]
  );

  // Tablo kolonları
  const columns = useMemo(
    () => [
      {
        key: "effectiveFromUtc",
        header: "تاریخ آغاز اجرا",
        minWidth: 160,
        type: "date",
        render: (_v, r) =>
          r.effectiveFromUtc
            ? convertAfDate(r.effectiveFromUtc, { monthStyle: "name" })
            : "—",
      },
      {
        key: "taxPercent",
        header: "مالیه (%)",
        minWidth: 120,
        type: "number",
      },
      {
        key: "reservePercent",
        header: "ریزرف (%)",
        minWidth: 120,
        type: "number",
      },
      {
        key: "zakatPercent",
        header: "زکات (%)",
        minWidth: 120,
        type: "number",
      },
      {
        key: "charityPercent",
        header: "خیرات (%)",
        minWidth: 120,
        type: "number",
      },
      {
        key: "familyPool",
        header: "سهم خانواده%",
        minWidth: 200,
        type: "text",
      },
      {
      key: "isActive",
      header: "وضعیت",
      minWidth: 120,
      type: "text",
      render: (v, r) => (r.isActive ? "فعال" : "غیر فعال"),
    },
    ],
    []
  );

  const handleAddClick = useCallback(() => {
    setOpenModal(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setOpenModal(false);
  }, []);

  // Yeni politika kaydetme
  const handleModalConfirm = useCallback(
    ({ taxPercent, reservePercent, zakatPercent, charityPercent }) => {
      const rateTax = Number(taxPercent) || 0;
      const rateOwnerReserve = Number(reservePercent) || 0;
      const rateZakat = Number(zakatPercent) || 0;
      const rateCharity = Number(charityPercent) || 0;

      const sum = rateTax + rateOwnerReserve + rateZakat + rateCharity;

      if (sum > 100) {
        console.error("Toplam oran 100%'den büyük olamaz.", { sum });
        return;
      }

      const rateFamilyPool = 100 - sum;

      const today = new Date();
      const createdAtUtc = today.toISOString().slice(0, 10); // "YYYY-MM-DD"

      const dto = {
        rateTax,
        rateZakat,
        rateCharity,
        rateOwnerReserve,
        rateFamilyPool,
        createdAtUtc,
        notes: null,
      };


      dispatch(addOwnerDistributionPolicy(dto)).then(() => {
        setOpenModal(false);
        dispatch(fetchOwnerDistributionPolicies());
      });
    },
    [dispatch]
  );

  return (
    <section dir="rtl" className="w-full">
      {error && (
        <div className="mb-3 text-sm text-red-600">
          خطا در بارگیری پالیسی‌ها: {error}
        </div>
      )}

      <CustomTable
        columns={columns}
        data={rows}
        loading={listStatus === "loading"}
        initialDensity="compact"
        initialPageSize={10}
        stickyFirstCol
        searchable={false}
        toolbarTitle="تقسیمات سهم مالک"
        emptyMessage="هیچ پالیسی برای تقسیمات سهم مالک ثبت نشده است."
        rowKey={(r) => r.id}
        addButtonLabel="پالیسی جدید"
        onAddClick={handleAddClick}
        addButtonIcon={Users}
        showAddButton={true}
      />

      <OwnerShareModal
        isOpen={openModal}
        onClose={handleModalClose}
        onConfirm={handleModalConfirm}
      />
    </section>
  );
}
