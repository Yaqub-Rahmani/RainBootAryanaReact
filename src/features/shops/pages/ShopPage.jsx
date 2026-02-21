import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import ShopList from "../components/ShopList";
import ShopModal from "../components/ShopModal";
import ShopFilterModal from "../components/ShopFilterModal";
import { Search, X, Store, Filter } from "lucide-react";
import { fetchMarkets } from "../../market/slices/marketSlice";
import { fetchFloors } from "../../floor/slices/floorSlice";

export default function ShopPage() {
  const dispatch = useDispatch();
  const { filters } = useSelector((s) => s.shop);

  const [qName, setQName] = useState("");

  const [openModal, setOpenModal] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [advancedFilters, setAdvancedFilters] = useState({
    marketIds: [],
    floorId: null,
    name: null,
    shopCode: null,
    hasActiveContract: null,
    hasTenant: null,
    tenantName: null,
    businessActivity: null,
    hasFranchiseOwner: null,
    franchiseOwnerSummary: null,
    areaFrom: null,
    areaTo: null,
    contractEndFrom: null,
    contractEndTo: null,
    remainingDaysFrom: null,
    remainingDaysTo: null,
    isActive: null,
  });

  const { list: markets = [], status: marketsStatus } = useSelector(
    (s) => s.market
  );
  const { list: floors = [], status: floorsStatus } = useSelector(
    (s) => s.floor
  );

  const marketsLoading = marketsStatus === "loading";
  const floorsLoading = floorsStatus === "loading";

  // İsteğe bağlı: markets / floors fetch
  useEffect(() => {
    if (marketsStatus === "idle") {
      dispatch(fetchMarkets());
    }
  }, [marketsStatus, dispatch]);

  useEffect(() => {
    if (floorsStatus === "idle") {
      dispatch(fetchFloors());
    }
  }, [floorsStatus, dispatch]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        document.getElementById("shop-search")?.focus();
      }
      if (e.key === "Escape") setQName("");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // tek arama metni için debounce
  const [qDebounced, setQDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(qName), 250);
    return () => clearTimeout(t);
  }, [qName]);

  return (
    <div dir="rtl" className="min-h-screen flex flex-col overflow-visible">
      {/* Sticky Header */}
      <div className="p-4 sticky top-0 z-10 bg-white/90 border-b border-slate-200 backdrop-blur">
        <div className="flex items-center gap-3 justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            مدیریت دوکانها
          </h1>

          <div className="flex items-center gap-2 w-full max-w-lg">
            <Input
              id="shop-search"
              name="shop-search"
              value={qName}
              onChange={(v) =>
                setQName(typeof v === "string" ? v : v?.target?.value ?? "")
              }
              placeholder="جستجو..."
              label={null}
              icon={Search}
              iconRight={qName ? X : null}
              onIconRightClick={() => setQName("")}
              className="flex-1"
              inputClassName="w-full"
              autoComplete="off"
            />

            <Button
              size="md"
              variant="soft"
              icon={Filter}
              iconOnly
              onClick={() => setIsFilterOpen(true)}
            />

            <Button onClick={() => setOpenModal(true)} icon={Store}>
              دوکان جدید
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-visible">
        <ShopList q={qDebounced} filters={advancedFilters} />
      </div>

      <ShopModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        defaultMarketId={filters?.marketId}
        defaultFloorId={filters?.floorId}
      />

      <ShopFilterModal
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        initialFilters={advancedFilters}
        onApply={(payload) => setAdvancedFilters(payload)}
        markets={markets}
        floors={floors}
        marketsLoading={marketsLoading}
        floorsLoading={floorsLoading}
      />
    </div>
  );
}
