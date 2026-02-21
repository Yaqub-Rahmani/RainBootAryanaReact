import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, RefreshCcw } from "lucide-react";

import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import Button from "../../../shared/components/Button";
import StatusBadge from "../../../shared/components/StatusBadge";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import { expenseService } from "../services/expenseService";
import { employeeService } from "../../employees/services/employeeService";
import ExpenseModal from "../components/ExpenseModal";

const fmtDate = (iso) => (iso ? convertAfDate(String(iso).slice(0, 10), { monthStyle: "name" }) : "—");

export default function ExpensesPage() {
  const { show, hide } = useGlobalLoading();

  const [tableKey, setTableKey] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);

  const [moneyAccounts, setMoneyAccounts] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [error, setError] = useState("");

  const refresh = useCallback(() => setTableKey((k) => k + 1), []);

  // Load dropdown options
// Load dropdown options
useEffect(() => {
  let alive = true;

  (async () => {
    setError("");
    show();
    try {
      const [acc, emp] = await Promise.all([
        expenseService.getMoneyAccounts(false),
        employeeService.getDetails({ Page: 1, PageSize: 500, Sort: "DisplayName" }),
      ]);

      if (!alive) return;
      setMoneyAccounts(Array.isArray(acc) ? acc : acc?.items ?? acc ?? []);
      setEmployees(Array.isArray(emp) ? emp : emp?.items ?? []);
    } catch (e) {
      if (!alive) return;
      setError("خطا در بارگذاری گزینه‌ها.");
    } finally {
      if (alive) hide();
    }
  })();

  return () => {
    alive = false;
    // component unmount sırasında loader açık kalmasın
    hide();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);


  const columns = useMemo(
    () => [
      {
        key: "occurredAtUtc",
        header: "تاریخ",
        sortable: true,
        serverField: "OccurredAtUtc",
        filterType: "dateRange",
        filterLabel: "تاریخ",
        render: (v) => fmtDate(v),
      },
      {
        key: "displayName",
        header: "عنوان",
        sortable: true,
        serverField: "DisplayName",
        searchable: true,
      },
      {
        key: "categoryLabel",
        header: "کتگوری",
        sortable: true,
        serverField: "Category",
        filterType: "select",
        filterLabel: "کتگوری",
        filterOp: "eq",
        filterOptions: [
          // { value: "1", label: "معاش کارمند" },
          { value: "2", label: "نان و چای کارمندان" },
          { value: "3", label: "مصارف روزانه مارکیت" },
          { value: "4", label: "خریداری جنس و لوازم" },
          { value: "5", label: "مصارف دفتر و اداری" },
          { value: "6", label: "بل‌ها: برق، آب، تلفن و انترنت" },
          { value: "7", label: "ترمیم، تعمیرات" },
          { value: "8", label: "مواد مصرفی" },
          { value: "9", label: "کرایه ترانسپورت" },
          { value: "10", label: "جریمه و فیس‌ها" },
          { value: "99", label: "دیگر" },
        ],
        render: (v, r) => r?.categoryLabel ?? v ?? "—",
      },
      {
        key: "sourceLabel",
        header: "منبع",
        sortable: true,
        serverField: "Source",
        filterType: "select",
        filterLabel: "منبع",
        filterOp: "eq",
        filterOptions: [
          { value: "1", label: "سهم مارکیت" },
          { value: "2", label: "ریزرف مارکیت" },
          { value: "3", label: "ریزرف امتیازدار" },
          { value: "4", label: "ریزرف برق" },
        ],
        render: (v, r) => r?.sourceLabel ?? v ?? "—",
      },
      {
        key: "directionLabel",
        header: "نوع",
        sortable: false,
        render: (_v, r) => {
          const d = r?.direction;
          if (d === 1 || String(d).toLowerCase() === "in") {
            return <StatusBadge status={1} label={r?.directionLabel ?? "ورود"} />;
          }
          return <StatusBadge status={3} label={r?.directionLabel ?? "خروج"} />;
        },
      },
      {
        key: "amount",
        header: "مبلغ",
        sortable: true,
        serverField: "Amount",
        align: "end",
        filterType: "numberRange",
        filterLabel: "با مبلغ",
        minPlaceholder: "حداقل مبلغ",
        maxPlaceholder: "حداکثر مبلغ",
        render: (v, r) => {
          const a = v == null ? null : Number(v);
          const label = r?.currencyLabel ?? (Number(r?.currency) === 2 ? "USD" : "؋");
          return a == null ? "—" : `${a.toLocaleString("en-US")} ${label}`;
        },
      },
      {
        key: "moneyAccountName",
        header: "حساب",
        sortable: false,
        render: (v) => v || "—",
      },
      {
        key: "paymentMethodLabel",
        header: "روش",
        sortable: true,
        serverField: "PaymentMethod",
        filterType: "select",
        filterLabel: "روش",
        filterOp: "eq",
        filterOptions: [
          { value: "1", label: "نقد" },
          { value: "2", label: "بانک" },
          { value: "3", label: "POS" },
          { value: "4", label: "چک" },
          { value: "5", label: "دیگر" },
        ],
        render: (v, r) => r?.paymentMethodLabel ?? v ?? "—",
      },
      {
        key: "employeeName",
        header: "کارمند",
        sortable: false,
        render: (v) => v || "—",
      },
      {
        key: "notes",
        header: "یادداشت",
        sortable: false,
        searchable: true,
        serverField: "Notes",
        render: (v) => (v ? String(v) : "—"),
      },
      {
        key: "__actions",
        header: "عملیات",
        sortable: false,
        render: (_v, r) => (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              className="px-2 py-1 rounded hover:bg-gray-100"
              title="ویرایش"
              onClick={() => {
                setEditRow(r);
                setModalOpen(true);
              }}
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded hover:bg-gray-100"
              title="حذف"
              onClick={async () => {
                if (!r?.id) return;
                const ok = window.confirm("این مصرف حذف شود؟");
                if (!ok) return;
                show();
                try {
                  await expenseService.remove(r.id);
                  refresh();
                } catch (e) {
                  window.alert(e?.response?.data?.message ?? e?.response?.data ?? "خطا در حذف");
                } finally {
                  hide();
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ),
      },
    ],
  [refresh, show, hide]
  );

  const openCreate = () => {
    setEditRow(null);
    setModalOpen(true);
  };

  return (
    <div dir="rtl" className="p-4">

      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

      <CustomTableV2
        key={tableKey}
        columns={columns}
        toolbarTitle="لیست مصارف"
        transport="legacy"
        initialPageSize={25}
        pageSizeOptions={[10, 25, 50, 100]}
        maxBodyHeight={600}
        showSearchBar
        selectable
        showAddButton
        addButtonLabel="ثبت مصرف"
        onAddClick={openCreate}
        fetcher={async (q) => {
          const data = await expenseService.getDetails(q);
          return data?.items ? data : data;
        }}
      />

      {modalOpen && (
        <ExpenseModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditRow(null);
          }}
          onSaved={refresh}
          initial={editRow}
          employees={employees}
          moneyAccounts={moneyAccounts}
        />
      )}
    </div>
  );
}
