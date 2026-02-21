import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import UserCard from "../../../shared/components/user/UserCard";
import Button from "../../../shared/components/Button";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { employeeService } from "../services/employeeService";
import { ListRestart } from "lucide-react";
import defaultAvatar from "../../../assets/avatars/avatar.svg";

const fmtNumber = (n) => {
  if (n === null || n === undefined || n === "") return "—";
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(x);
  } catch {
    return String(Math.round(x));
  }
};

export default function EmployeeList({ qName = "", activeOnly = false }) {
  const navigate = useNavigate();
  const { show, hide } = useGlobalLoading();

  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);

  // request race guard
  const reqSeq = useRef(0);

  const fetchList = useCallback(async () => {
    const seq = ++reqSeq.current;
    setStatus("loading");
    setError(null);

    // Global loader yalnız ilk yüklemede (liste boşken) gösterilsin
    if (!rows || rows.length === 0) show();

    try {
      const pageSize = 60; // kart görünümü için makul
      const opt = {
        page: 1,
        pageSize,
        sort: "DisplayName:asc",
        search: qName ? String(qName).trim() : "",
      };

      const data = await employeeService.getDetails(opt, activeOnly ? true : undefined);
      if (seq !== reqSeq.current) return; // stale response

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
      setError(e?.message || "دریافت لیست کارمندان ناموفق بود.");
      setStatus("failed");
    } finally {
      if (seq === reqSeq.current) hide();
    }
  }, [activeOnly, hide, qName, rows, show]);

  useEffect(() => {
    fetchList();
    return () => {
      // sayfadan çıkarken loader açık kalmasın
      hide();
    };
  }, [fetchList, hide]);

  const cards = useMemo(() => {
    const arr = Array.isArray(rows) ? rows : [];
    return arr.map((it) => {
      const id = it?.id ?? it?.Id;
      const name = it?.displayName ?? it?.DisplayName ?? "—";
      const job = it?.jobTitle ?? it?.JobTitle ?? "";
      const active = it?.isActive ?? it?.IsActive;
      const salary = it?.salaryAmount ?? it?.SalaryAmount;

      // YENİ: telefon + avatar
      const phonePrimary = it?.phonePrimary ?? it?.PhonePrimary ?? "";
      const avatarUrl = it?.avatarUrl ?? it?.AvatarUrl ?? "";

      const line2 = [job, active === false ? "غیرفعال" : ""].filter(Boolean).join(" • ");
      const phoneLike = phonePrimary ? `تلفن: ${phonePrimary}` : "تلفن: —";

      return {
        id,
        avatar: avatarUrl || null,
        name,
        address: line2 || "—",
        phone: phoneLike,
        salary,
      };
    });
  }, [rows]);

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

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {cards.map((c) => (
          <UserCard
            key={c.id}
            avatarSrc={c.avatar || defaultAvatar}
            name={c.name}
            address={c.address}
            phone={c.phone}
            balance={fmtNumber(c.salary)}
            balanceSuffix="؋"
            onViewProfile={() => navigate(`/employee-profile/${c.id}`)}
            menuItems={[]}
          />
        ))}
      </div>

      {showEmpty && <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>}

      {status === "loading" && cards.length === 0 && !error && (
        <div className="text-sm text-gray-500">در حال بارگیری…</div>
      )}
    </div>
  );
}
