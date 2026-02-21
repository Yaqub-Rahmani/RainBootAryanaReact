// src/features/district/components/DistrictModal.js
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect";
import { addDistrict } from "../slices/districtSlice";

export default function DistrictModal({ open, onClose, defaultProvinceId = null }) {
  const dispatch = useDispatch();
  const provinces = useSelector((s) => s.province.list);

  // provinceId state'ini string tutuyoruz: "" | "12"
  const [form, setForm] = useState({
    name: "",
    code: "",
    provinceId: defaultProvinceId != null ? String(defaultProvinceId) : "",
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        code: "",
        provinceId: defaultProvinceId != null ? String(defaultProvinceId) : "",
      });
      setError(null);
    }
  }, [open, defaultProvinceId]);

  const canSubmit =
    form.name.trim().length > 0 && String(form.provinceId || "").length > 0;

  const provinceOptions = useMemo(
    () => (provinces || []).map((p) => ({ value: String(p.id), label: p.name })),
    [provinces]
  );

  // SmartSelect bazı projelerde primitif, bazılarında {value,label} döndürebilir
  function normalizeSelectValue(opt) {
    if (opt === null || opt === undefined) return "";
    if (typeof opt === "object") {
      if (opt.value === null || opt.value === undefined) return "";
      return String(opt.value);
    }
    return String(opt); // primitif
  }

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) {
      setError("نام ولسوالی و ولایت لازم است");
      return;
    }
    try {
      const action = await dispatch(
        addDistrict({
          name: form.name.trim(),
          code: form.code?.trim() || null,
          provinceId: Number(form.provinceId),
          isActive: true,
        })
      );
      if (addDistrict.fulfilled.match(action)) {
        onClose?.();
      }
    } catch (err) {
      setError(err?.message || "خطا در ثبت ولسوالی");
    }
  };

  if (!open) return null;

  return (
    <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-1">ولسوالی جدید</h2>
        <p className="text-sm text-gray-500 my-4">لطفاً اطلاعات ولسوالی را وارد کنید.</p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">ولایت:</label>
            <SmartSelect
              options={provinceOptions}
              // SmartSelect value: seçili değer yoksa null, varsa string id
              value={form.provinceId === "" ? null : form.provinceId}
              onChange={(opt) => {
                const next = normalizeSelectValue(opt);
                setForm((f) => ({ ...f, provinceId: next }));
              }}
              placeholder="انتخاب ولایت"
              clearable
              searchable
              size="md"
            />
          </div>

          <Input
            label="نام ولسوالی:"
            placeholder="نام ولسوالی"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
            icon="MapPin"
          />

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="mt-5 flex gap-2 justify-between pt-2">
            <Button onClick={onClose} type="button" primaryColor="#cbd1d4ff" activeColor="#4a4d4fff">
              بستن
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              ذخیره
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
