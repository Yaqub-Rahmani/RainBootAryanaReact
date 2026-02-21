import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect";
import { addFloor } from "../slices/floorSlice";

// loose UUID v4 checker (36 chars with dashes)
function isUuidLike(v) {
  return typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v);
}

function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID)
    return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function FloorModal({ open, onClose, defaultMarketId = null }) {
  const dispatch = useDispatch();
  const markets = useSelector((s) => s.market?.list || []);

  const [form, setForm] = useState({
    floorName: "",
    level: 0,
    marketId: defaultMarketId ? String(defaultMarketId) : "",
    status: true,
  });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm({
        floorName: "",
        level: 0,
        marketId: defaultMarketId ? String(defaultMarketId) : "",
        status: true,
      });
      setError(null);
      setSubmitting(false);
    }
  }, [open, defaultMarketId]);

  const canSubmit =
    form.floorName.trim().length > 0 &&
    String(form.marketId || "").length > 0 &&
    isUuidLike(String(form.marketId));

  const marketOptions = useMemo(
    () =>
      (markets || []).map((m) => ({
        value: String(m.id),
        label: m.marketName,
      })),
    [markets]
  );

  function normalizeSelectValue(opt) {
    if (opt == null) return "";
    if (typeof opt === "object")
      return opt.value == null ? "" : String(opt.value);
    return String(opt);
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) {
      setError("اطلاعات نامعتبر است");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        id: makeId(), // sunucu üretiyorsa bunu çıkarabilirsin
        marketId: String(form.marketId),
        floorName: form.floorName.trim(),
        level: Number.isFinite(Number(form.level)) ? Number(form.level) : 0,
        status: Boolean(form.status),

        // 🔴 EKLE: backend en azından market.id istiyor
        market: { id: String(form.marketId) },
      };

      const action = await dispatch(addFloor(payload));
      if (addFloor.fulfilled.match(action)) {
        onClose?.();
      } else {
        setError(action.payload || action.error?.message || "خطا در ثبت طبقه");
      }
    } catch (err) {
      setError(err?.message || "خطا در ثبت طبقه");
    } finally {
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
        <h2 className="text-2xl font-bold mb-1">طبقه جدید</h2>
        <p className="text-sm text-gray-500 my-4">
          لطفاً اطلاعات طبقه را وارد کنید.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">بازار:</label>
            <SmartSelect
              options={marketOptions}
              value={form.marketId === "" ? null : String(form.marketId)}
              onChange={(opt) =>
                setForm((f) => ({ ...f, marketId: normalizeSelectValue(opt) }))
              }
              placeholder="انتخاب مارکیت"
              clearable
              searchable
              size="md"
            />
          </div>

          <Input
            label="نام طبقه:"
            placeholder="نام طبقه"
            value={form.floorName}
            onChange={(v) => setForm((f) => ({ ...f, floorName: v }))}
            required
            icon="Layers"
          />

          <Input
            label="سطح (level):"
            placeholder="0"
            type="number"
            value={String(form.level)}
            onChange={(v) =>
              setForm((f) => ({ ...f, level: v === "" ? 0 : Number(v) }))
            }
            icon="ListOrdered"
          />

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="mt-5 flex gap-2 justify-between pt-2">
            <Button
              onClick={onClose}
              type="button"
              primaryColor="#cbd1d4ff"
              activeColor="#4a4d4fff"
            >
              بستن
            </Button>
            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "در حال ذخیره…" : "ذخیره"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
