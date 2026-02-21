import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import UserCard from "../../../shared/components/user/UserCard";
import { fetchAllOwnerViews } from "../slices/franchiseOwnerSlice";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { useNavigate } from "react-router-dom";
import { ListRestart } from "lucide-react";
import Button from "../../../shared/components/Button";

const fmtAFN = (n) => {
  if (typeof n !== "number") return n ?? "-";
  try {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(Math.round(n));
  }
};

export default function FranchiseOwnerList({ qName = "", activeOnly = false }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const list = useSelector((s) => s.franchiseOwner?.ownerViews?.list || []);
  const status = useSelector((s) => s.franchiseOwner?.ownerViews?.status);
  const error = useSelector((s) => s.franchiseOwner?.ownerViews?.error);

  const { show, hide } = useGlobalLoading();

  useEffect(() => {
    dispatch(fetchAllOwnerViews(null));
  }, [dispatch]);

  useEffect(() => {
    if (qName === "") dispatch(fetchAllOwnerViews(null));
  }, [qName, dispatch]);

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
        (it) => it?.status === true || it?.isActive === true || it?.isActive === 1
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

    const menuItems = useMemo(
    () => [
      // { key: "pay", label: "پرداخت" },
      // { key: "report", label: "گرفتن گزارش" },
      // { key: "update", label: "Güncelle" },
      // { key: "delete", label: "Sil", variant: "danger" }, // opsiyonel stil ipucu
    ],
    []
  );

  // Seçeneklere göre aksiyonlar
  const handleMenuAction = useCallback(
    (key, user) => {
      if (!user?.id) return;

      switch (key) {
        case "pay":
          // örnek route: ödeme ekranı
          navigate(`/franchise-owner/${user.id}/pay`);
          break;

        case "report":
          // örnek route: rapor ekranı
          // navigate(`/franchise-owner/${user.id}/report`);
          if (window.confirm("آیا گزارش میگیرید.?")) {
            // TODO: dispatch(deleteFranchiseOwner(user.id))
            // .then(() => dispatch(fetchAllOwnerViews(null)))
            console.log("delete:", user.id);
          }
          break;

        // case "update":
        //   // örnek route: güncelleme ekranı
        //   navigate(`/franchise-owner/${user.id}/edit`);
        //   break;

        // case "delete":
        //   // şimdilik basit onay; modal varsa ona bağla
        //   if (window.confirm("Bu kullanıcıyı silmek istiyor musunuz?")) {
        //     // TODO: dispatch(deleteFranchiseOwner(user.id))
        //     // .then(() => dispatch(fetchAllOwnerViews(null)))
        //     console.log("delete:", user.id);
        //   }
        //   break;

        default:
          break;
      }
    },
    [navigate]
  );


  return (
    <div className="space-y-4">
      {error && (
        <div className="text-sm text-red-600 flex items-center justify-between gap-2">
          <span>{error}</span>
          <Button
            icon={ListRestart}
            primaryColor={"var(--role-danger-bg)"}
            onClick={() => dispatch(fetchAllOwnerViews(null))}
          >
            تکرار امتحان کنید
          </Button>
        </div>
      )}

      {/* Responsive grid (no fixed 5-per-row) */}
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {filtered.map((it) => (
          <UserCard
            key={it.id}
            avatarSrc={it.avatar || "/images/user.png"}
            name={it.displayName}
            address={it.addressFull || ""}
            phone={it.primaryPhone || "-"}
            balance={fmtAFN(it.balance)}
            balanceSuffix="؋"
            onViewProfile={() => navigate(`/franchise-owner-profile/${it.id}`)}
            menuItems={menuItems}
            onMenuAction={(key) => handleMenuAction(key, it)}
          />
        ))}
      </div>

      {showEmpty && <div className="text-sm text-gray-500">Kayıt bulunamadı.</div>}

      {status === "loading" && filtered.length === 0 && !error && (
        <div className="text-sm text-gray-500">در حال بارگیر…</div>
      )}
    </div>
  );
}
