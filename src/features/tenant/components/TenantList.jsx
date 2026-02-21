import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import UserCard from "../../../shared/components/user/UserCard";
import { fetchTenantViews } from "../slices/tenantSlice";
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

export default function TenantList({ qName = "", activeOnly = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Slice: { views: TenantViewDto[], viewsStatus: "idle|loading|...", error: string|null }
  const list = useSelector((s) => s.tenant?.views || []);
  const status = useSelector((s) => s.tenant?.viewsStatus);
  const error = useSelector((s) => s.tenant?.error);

  const { show, hide } = useGlobalLoading();

  // İlk yükleme
  useEffect(() => {
    dispatch(fetchTenantViews({ active: null }));
  }, [dispatch]);

  // Arama temizlenince yeniden yükle
  useEffect(() => {
    if (qName === "") dispatch(fetchTenantViews({ active: null }));
  }, [qName, dispatch]);

  // Global loader kontrolü
  useEffect(() => {
    if (status === "loading") show();
    else hide();
    return () => {
      hide();
    };
  }, [status, show, hide]);

  const filtered = useMemo(() => {
    let arr = Array.isArray(list) ? list : [];

    if (activeOnly) {
      arr = arr.filter(
        (it) => it?.isActive === true || it?.isActive === 1 || it?.status === true
      );
    }

    const q = qName?.toString().toLowerCase().trim();
    if (!q) return arr;

    return arr.filter((it) => {
      const name = (it?.displayName || "").toLowerCase();
      const phone = (it?.primaryPhone || "").toLowerCase();
      const addr = (it?.addressFull || "").toLowerCase();
      return name.includes(q) || phone.includes(q) || addr.includes(q);
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
            onClick={() => dispatch(fetchTenantViews({ active: null }))}
          >
            تکرار امتحان کنید
          </Button>
        </div>
      )}

      {/* Responsive grid: fixed 5-per-row kaldırıldı */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {filtered.map((it) => (
          <UserCard
            key={it.id}
            avatarSrc={it.avatar || "/images/user.png"}
            name={it.displayName}
            address={it.addressFull || ""}
            phone={it.primaryPhone || "-"}
            balance={fmtAFN(it.balance)}
            balanceSuffix="AF"
            onViewProfile={() => navigate(`/tenant-profile/${it.id}`)}
          />
        ))}
      </div>

      {showEmpty && <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>}

      {status === "loading" && filtered.length === 0 && !error && (
        <div className="text-sm text-gray-500">Yükleniyor…</div>
      )}
    </div>
  );
}
