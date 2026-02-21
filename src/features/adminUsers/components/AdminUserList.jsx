import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../shared/components/Button";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { ListRestart } from "lucide-react";

import { adminUserService } from "../services/adminUserService";
import AdminUserCard from "./AdminUserCard";

export default function AdminUserList({
  qName = "",
  activeOnly = false,
  refreshKey = 0,
  onEdit,
  onDisable,
}) {
  const { show, hide } = useGlobalLoading();

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  const reqSeq = useRef(0);

  const fetchList = useCallback(async () => {
    const seq = ++reqSeq.current;
    setStatus("loading");
    setError(null);
    if (!rows || rows.length === 0) show();

    try {
      const opt = {
        page: 1,
        pageSize: 60,
        sort: "Name:asc",
        search: qName ? String(qName).trim() : "",
      };

      const data = await adminUserService.getDetails(opt, activeOnly ? true : undefined);
      if (seq !== reqSeq.current) return;

      const items = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.Items)
          ? data.Items
          : Array.isArray(data)
            ? data
            : [];

      setRows(items);
      setStatus("succeeded");
    } catch (e) {
      if (seq !== reqSeq.current) return;
      setError(e?.message || "دریافت لیست ادمین ها ناموفق بود.");
      setStatus("failed");
    } finally {
      if (seq === reqSeq.current) hide();
    }
  }, [activeOnly, hide, qName, rows, show]);

  useEffect(() => {
    fetchList();
    return () => hide();
  }, [fetchList, hide, refreshKey]);

  const cards = useMemo(() => (Array.isArray(rows) ? rows : []), [rows]);

  const showEmpty = status === "succeeded" && cards.length === 0 && !error;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button icon={ListRestart} primaryColor={"var(--role-danger-bg)"} onClick={fetchList}>
            تکرار امتحان کنید
          </Button>
        </div>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {cards.map((row) => {
          const id = row?.id ?? row?.Id ?? Math.random();
          return (
            <AdminUserCard
              key={id}
              row={row}
              onEdit={onEdit}
              onDisable={onDisable}
            />
          );
        })}
      </div>

      {showEmpty && <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>}

      {status === "loading" && cards.length === 0 && !error && (
        <div className="text-sm text-gray-500">در حال بارگیری…</div>
      )}
    </div>
  );
}
