import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import { addProvince } from "../slices/provinceSlice";

export default function ProvinceModal({ open, onClose }) {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ name: "", code: "" });
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) {
      setForm({ name: "", code: "" });
      setError(null);
    }
  }, [open]);

  const canSubmit = form.name.trim().length > 0;

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!canSubmit) {
      setError("نام ولایت لازم است");
      return;
    }
    try {
      const action = await dispatch(
        addProvince({ name: form.name.trim(), code: form.code?.trim() || null })
      );

      if (addProvince.fulfilled.match(action)) {
        onClose?.(); // sadece ekleme başarılıysa kapat
      }
    } catch (err) {
      setError(err?.message || "خطا در ثبت ولایت");
    }
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
    >
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-1">ولایت جدید</h2>
        <p className="text-sm text-gray-500 my-4">
          لطفاً اطلاعات ولایت را وارد کنید.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="نام ولایت:"
            placeholder="نام ولایت"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            required
            error={!!error && !canSubmit}
            icon="MapPin"
          />
          {error && <div className="text-red-600 text-sm">{error}</div>}

          <div className="mt-5 flex gap-2 justify-between pt-2">
            <Button
              onClick={onClose}
              type="button"              
              primaryColor="#cbd1d4ff"
            >
              بستن
            </Button>
            <Button type="submit" disabled={!canSubmit} >
              ذخیره
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
