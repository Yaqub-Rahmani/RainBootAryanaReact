import React, { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import UserCard from "../../../shared/components/user/UserCard";
import { fetchFamilyView } from "../slices/familyMemberSlice"; // path'i projene göre düzelt
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { useNavigate } from "react-router-dom";
import Button from "../../../shared/components/Button";
import { ListRestart } from "lucide-react";

const fmtAFN = (n) => {
  if (typeof n !== "number") return n ?? "-";
  try {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
};

export default function FamilyMemberList({ qName = "", activeOnly = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { show, hide } = useGlobalLoading();

  // ⛔ PROBLEM: buradaki gibi yapma: s.familyMember?.viewList || []
  // ✅ SADECE state referansını al:
  const viewListFromState = useSelector((s) => s.familyMember?.viewList);
  const status            = useSelector((s) => s.familyMember?.status);
  const error             = useSelector((s) => s.familyMember?.error);

  // Fallback'i selector DIŞINDA yap: her render'da yeni referans oluştursa da
  // artık useSelector'ın içinde değil, uyarı bu yüzden kapanır.
  const list = Array.isArray(viewListFromState) ? viewListFromState : [];

  // İlk yüklemede tüm family view'leri çek
  useEffect(() => {
    dispatch(fetchFamilyView(null));
  }, [dispatch]);

  // Arama tekrar boşaldığında listeyi tazele
  useEffect(() => {
    if (qName === "") {
      dispatch(fetchFamilyView(null));
    }
  }, [qName, dispatch]);

  // Global loader yönetimi
  useEffect(() => {
    if (status === "loading") {
      show();
    } else {
      hide();
    }
    return () => {
      hide();
    };
  }, [status, show, hide]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(list) ? list : [];

    // Aktif filtre (DTO'daki alan isimlerini kendi modeline göre düzenle)
    if (activeOnly) {
      arr = arr.filter(
        (it) =>
          it?.status === true ||
          it?.isActive === true ||
          it?.isActive === 1
      );
    }

    const q = qName?.toString().toLowerCase().trim();
    if (!q) return arr;

    return arr.filter((it) => {
      const name =
        (it?.displayName || it?.fullName || "").toLowerCase();
      const phone = (it?.primaryPhone || "").toLowerCase();
      const addr  = (it?.addressFull || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        addr.includes(q)
      );
    });
  }, [list, qName, activeOnly]);

  const showEmpty = status === "succeeded" && filtered.length === 0 && !error;

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button
          icon={ListRestart}
          primaryColor={"var(--role-danger-bg)"}
          onClick={() => dispatch(fetchFamilyView(null))}>
            تکرار امتخان کنید
            </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {filtered.map((it) => (
          <UserCard
            key={it.id}
            avatarSrc={it.avatar || "/images/user.png"}
            name={it.displayName || it.fullName}
            address={it.relationTag || ""}
            phone={it.primaryPhone || "-"}
            balance={fmtAFN(it.balance)}
            balanceSuffix="AF"
            onViewProfile={() =>
              navigate(`/family-member-profile/${it.id}`)
            }
          />
        ))}
      </div>

      {showEmpty && (
        <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>
      )}

      {status === "loading" && filtered.length === 0 && !error && (
        <div className="text-sm text-gray-500">Yükleniyor…</div>
      )}
    </div>
  );
}
