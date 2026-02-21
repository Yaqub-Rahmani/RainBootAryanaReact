import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect";
import { addShop } from "../slices/shopSlice";
import { fetchFloors } from "../../floor/slices/floorSlice";
import { fetchMarkets } from "../../market/slices/marketSlice";
import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { Store, X } from "lucide-react";

// Helpers
// UUID formatını kontrol eden regex daha kısa ve temiz hale getirildi.
const isUuidLike = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Seçenek normalize edici helper (zaten iyiydi, korundu)
const normalize = (opt) => opt == null ? "" : typeof opt === "object" ? String(opt.value ?? "") : String(opt);

export default function ShopModal({ open, onClose }) {
  const dispatch = useDispatch();
  const { show, hide } = useGlobalLoading();

  // Store verileri
  const { list: markets, status: marketsStatus } = useSelector((s) => s.market);
  const { list: floors, status: floorsStatus } = useSelector((s) => s.floor);
  
  const marketsLoading = marketsStatus === "loading";
  const floorsLoading = floorsStatus === "loading";

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";


  // Form state
  const [form, setForm] = useState({
    marketId: "",
    floorId: "",
    name: "",
    areaM2: "", // Metrekare alanı string olarak tutulmaya devam ediyor.
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal açılınca market & floor yoksa getir
  useEffect(() => {
    if (!open) return;
    // Eğer veri yoksa veya yüklenmemişse fetch et.
    if (!markets?.length && marketsStatus !== "loading") dispatch(fetchMarkets());
    if (!floors?.length && floorsStatus !== "loading") dispatch(fetchFloors());
  }, [open, dispatch, markets?.length, floors?.length, marketsStatus, floorsStatus]);

  // Modal kapanınca formu sıfırla
  useEffect(() => {
    if (!open) {
      setForm({ marketId: "", floorId: "", name: "", areaM2: "" });
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  // Submit edilebilir mi kontrolü useMemo ile optimize edildi
  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      isUuidLike(String(form.marketId)) &&
      isUuidLike(String(form.floorId))
    );
  }, [form]);

  // Seçenekler (marketOptions, floorOptions useMemo ile optimize edildi, zaten iyiydi)
  const marketOptions = useMemo(() =>
      (markets || []).map((m) => ({
        value: String(m.id),
        label: m.marketName || "(adsız مارکیت)",
      })),
    [markets]
  );

  const floorOptions = useMemo(() =>
      (floors || [])
        .filter((f) => !form.marketId || String(f.marketId) === String(form.marketId))
        .map((f) => ({
          value: String(f.id),
          label: f.floorName ?? `Floor ${f.level ?? ""}`,
        })),
    [floors, form.marketId]
  );

  const isLoadingOptions = marketsLoading || floorsLoading || (!markets.length && !floors.length);

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) {
      setError("اطلاعات نامعتبر است یا eksik alanlar var.");
      // Hata ayıklama için konsola neden submit edilemediğini yazdır.
      console.error("Form gönderilemedi. Gerekli alanlar boş veya UUID formatı hatalı.");
      return;
    }

    try {
      setSubmitting(true);
      show(); // Global loading'i göster

      // ShopCreateDto ile bire bir uyumlu payload oluşturuldu.
      const payload = {
        marketId: String(form.marketId),
        floorId: String(form.floorId),
        name: form.name.trim() || null,
        // AreaM2 değeri number'a dönüştürülüyor veya null gönderiliyor.
        areaM2:
          form.areaM2 === "" || form.areaM2 == null
            ? null
            : Number(form.areaM2),
      };
      
      const action = await dispatch(addShop(payload));

      if (addShop.fulfilled.match(action)) {
        onClose && onClose();
      } else {
        // Redux action error durumunda payload veya mesajı yakala
        const errorMessage = action.payload || action.error?.message || "خطا در ذخیره دوکان";
        setError(errorMessage);
        console.error("Mağaza eklenirken hata oluştu:", errorMessage, action.error);
      }
    } catch (err) {
      setError(err?.message || "Genel bir hata oluştu.");
      console.error("handleSubmit sırasında try/catch hatası:", err);
    } finally {
      hide(); // Global loading'i gizle
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-1">دوکان جدید</h2>
        <p className="text-sm text-gray-500">
          لطفاً اطلاعات دوکان را وارد کنید.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Market */}
          <div>
            <label className="block text-sm mb-1">مارکیت:</label>
            <SmartSelect
              options={marketOptions}
              value={form.marketId === "" ? null : String(form.marketId)}
              onChange={(opt) =>
                setForm((f) => ({
                  ...f,
                  marketId: normalize(opt),
                  floorId: "", // Market değişince kat seçimi sıfırlanır
                }))
              }
              placeholder={isLoadingOptions ? "درحال بارگذاری..." : "انتخاب مارکیت"}
              clearable
              searchable
              size="md"
              disabled={isLoadingOptions}
            />
          </div>

          {/* Floor */}
          <div>
            <label className="block text-sm mb-1">طبقه:</label>
            <SmartSelect
              options={floorOptions}
              value={form.floorId === "" ? null : String(form.floorId)}
              onChange={(opt) => setForm((f) => ({ ...f, floorId: normalize(opt) }))}
              placeholder={
                form.marketId === ""
                  ? "اول مارکیت را انتخاب کنید."
                  : isLoadingOptions
                  ? "درحال بارگذاری..."
                  : "انتخاب طبقه"
              }
              clearable
              searchable
              size="md"
              disabled={!form.marketId || isLoadingOptions}
            />
          </div>

          {/* Name (zorunlu) */}
          <Input
            label="شماره دوکان:"
            placeholder="مثال: A-12"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
            icon="Store" // Bu ikonun projenizde tanımlı olduğunu varsayıyorum.
          />

          {/* AreaM2 (opsiyonel) */}
          <Input
            label="مساحت (متر مربع):"
            placeholder="مثال: 45.5"
            type="number"
            value={form.areaM2}
            onChange={(v) => setForm((f) => ({ ...f, areaM2: v }))}
            min="0"
            step="0.01"
          />

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="mt-5 flex gap-2 justify-between pt-2">
            <Button
              onClick={onClose}
              type="button"
              primaryColor={secondaryColor}
              icon={X}
            >
              بستن
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit || submitting || isLoadingOptions}
              primaryColor={primaryColor}
              icon={Store}
            >
              {submitting ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
