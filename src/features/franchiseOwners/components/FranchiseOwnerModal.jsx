import { useEffect, useId, useMemo, useState } from "react";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect.jsx";
import { AvatarUploader } from "../../../shared/imageCrop/AvatarUploader.jsx";
import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal.jsx";
import defaultAvatar from "../../../assets/avatars/avatar.svg";
import idcardfrontavatar from "../../../assets/avatars/idcardfront.svg";
import idcardbackavatar from "../../../assets/avatars/idcardback.svg";
import { ArrowBigLeft, ArrowBigRight, Fingerprint, UserRoundPlus, X } from "lucide-react";
import "../styles/FranchiseOwnerModal.css";
import FingerModal from "../../fingerprint/Model/fingerModel.jsx";

/* safer uuid */
const makeId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

const s = (v) => (v == null ? "" : String(v));

export default function FranchiseOwnerModal({ open, onClose }) {
  const formId = useId();
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    id: makeId(),
    displayName: "",
    fatherName: "",
    phone: "",
    phone2: "",
    note: "",
    nationalId: "",
    provinceId: "",
    districtId: "",
    address: "",
  });

  // images & crop
  const [openCrop, setOpenCrop] = useState(false);
  const [rawImage, setRawImage] = useState("");
  const [activeTarget, setActiveTarget] = useState(null);
  const [avatarProfile, setAvatarProfile] = useState(defaultAvatar);
  const [avatarCardFront, setAvatarCardFront] = useState(idcardfrontavatar);
  const [avatarCardBack, setAvatarCardBack] = useState(idcardbackavatar);
  

  const handlePick = (target) => (base64) => {
    setActiveTarget(target);
    setRawImage(base64);
    setOpenCrop(true);
  };
  const handleCropped = (img) => {
    if (activeTarget === "profile") setAvatarProfile(img);
    else if (activeTarget === "cardFront") setAvatarCardFront(img);
    else if (activeTarget === "cardBack") setAvatarCardBack(img);
    setOpenCrop(false);
  };

  // selects
  const provinceOptions = useMemo(
    () => [
      { value: "1", label: "کابل" },
      { value: "2", label: "هرات" },
      { value: "3", label: "بلخ" },
    ],
    []
  );

  const districtOptions = useMemo(() => {
    if (form.provinceId === "1")
      return [
        { value: "101", label: "بگرامی" },
        { value: "102", label: "ده سبز" },
      ];
    if (form.provinceId === "2")
      return [
        { value: "201", label: "انجیل" },
        { value: "202", label: "گذرہ" },
      ];
    if (form.provinceId === "3")
      return [
        { value: "301", label: "دهدادی" },
        { value: "302", label: "شولگره" },
      ];
    return [];
  }, [form.provinceId]);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setForm({
      id: makeId(),
      displayName: "",
      fatherName: "",
      phone: "",
      phone2: "",
      note: "",
      nationalId: "",
      provinceId: "",
      districtId: "",
      address: "",
    });
    setAvatarProfile(defaultAvatar);
    setAvatarCardFront(idcardfrontavatar);
    setAvatarCardBack(idcardbackavatar);
  }, [open]);

  const canContinueStep1 =
    s(form.displayName).trim() &&
    s(form.fatherName).trim() &&
    s(form.phone).trim();
  const canSubmitStep2 =
    s(form.nationalId).trim() &&
    s(form.provinceId).trim() &&
    s(form.districtId).trim() &&
    s(form.address).trim();

  const goNext = () => {
    if (!canContinueStep1) return;
    setStep(2);
  };
  const goBack = () => setStep(1);
  const handleAdd = (e) => {
    e?.preventDefault?.();
    if (!canSubmitStep2) return;
    onClose?.();
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fomodal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="fomodal__dialog" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="fomodal__header">
          <div>
            <h2 id={`${formId}-title`} className="fomodal__title">
              {step === 1 ? "صاحب امتیاز (1/2)" : "صاحب امتیاز (2/2)"}
            </h2>
            <p className="fomodal__subtitle">
              {step === 1
                ? "برخی معلومات اساسی و عکس پروفایل"
                : "معلومات تذکره و آدرس + تصاویر تذکره"}
            </p>
            <div className="fomodal__progress" aria-hidden>
              <span style={{ width: step === 1 ? "50%" : "100%" }} />
            </div>
          </div>
            <Button
              iconOnly
              ariaLabel="Kapat"
              onClick={onClose}
              icon={X}
            />
        </header>

        {/* Body */}
        <form onSubmit={handleAdd} className="fomodal__body">
          {step === 1 && (
            <div className="fomodal__grid-step1">
              {/* bilgiler (col-9) */}
              <section className="focard focard--muted focard__pad">
                <div className="fo-row">
                  <div
                    className="fo-row"
                    style={{ gridTemplateColumns: "1fr 1fr" }}
                  >
                    <Input
                      label="اسم و تخلص"
                      placeholder="اسم / تخلص"
                      icon="User"
                      value={form.displayName}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, displayName: v }))
                      }
                      required
                    />
                    <Input
                      label="اسم پدر"
                      placeholder="اسم پدر"
                      icon="User"
                      value={form.fatherName}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, fatherName: v }))
                      }
                      required
                    />
                  </div>

                  <div
                    className="fo-row"
                    style={{ gridTemplateColumns: "1fr 1fr" }}
                  >
                    <Input
                      type="phone"
                      mask="phone"
                      label="شماره تماس"
                      icon="Phone"
                      value={form.phone}
                      onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      required
                    />
                    <Input
                      type="phone"
                      mask="phone"
                      label="شماره تماس (احتیاطی)"
                      icon="Phone"
                      value={form.phone2}
                      onChange={(v) => setForm((f) => ({ ...f, phone2: v }))}
                    />
                  </div>

                  {/* geniş not alanı */}
                  <div className="fo-row fo-row--wide">
                    <Input
                      multiline
                      rows={3}
                      type="text"
                      label="یادداشت"
                      placeholder="..."
                      icon="Edit"
                      value={form.note}
                      onChange={(v) => setForm((f) => ({ ...f, note: v }))}
                    />
                  </div>
                </div>
              </section>

              {/* görsel (col-3) */}
              <aside className="focard focard__pad fo-flex-center">
                <AvatarUploader
                  value={avatarProfile}
                  onPick={handlePick("profile")}
                  variant="profile"
                  size={168}
                  label="انتخاب عکس پروفایل"
                  caption="عکس مورد نظر را برگزینید"
                />
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="fomodal__grid-step2">
              {/* bilgiler (col-6) */}
              <section className="focard focard__pad">
                <div className="fo-row" style={{ gridTemplateColumns: "1fr" }}>
                  <Input
                    type="id"
                    mask="custom"
                    maskPattern="9999-9999-99999"
                    label="نمبر تذکره"
                    placeholder="xxxx-xxxx-xxxxx"
                    icon="IdCard"
                    value={form.nationalId}
                    onChange={(v) => setForm((f) => ({ ...f, nationalId: v }))}
                    required
                  />

                  <div
                    className="fo-row"
                    style={{ gridTemplateColumns: "1fr 1fr" }}
                  >
                    <div>
                      <label
                        className="form-label"
                        style={{ color: "var(--text)", marginBottom: 4 }}
                      >
                        ولایت
                      </label>
                      <SmartSelect
                        options={provinceOptions}
                        value={form.provinceId || null}
                        onChange={(next) =>
                          setForm((f) => ({
                            ...f,
                            provinceId: next || "",
                            districtId: "",
                          }))
                        }
                        clearable
                        searchable
                        placeholder="انتخاب ولایت"
                        size="md"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label
                        className="form-label"
                        style={{ color: "var(--text)", marginBottom: 4 }}
                      >
                        ولسوالی
                      </label>
                      <SmartSelect
                        options={districtOptions}
                        value={form.districtId || null}
                        onChange={(next) =>
                          setForm((f) => ({ ...f, districtId: next || "" }))
                        }
                        clearable
                        searchable
                        placeholder={
                          form.provinceId ? "انتخاب ولسوالی" : "--------"
                        }
                        size="md"
                        disabled={!form.provinceId}
                        dir="rtl"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* kimlikler (col-6) */}
              <section className="focard focard--muted focard__pad">
                <div className="fo-id-grid">
                  <div className="fo-flex-center">
                    <AvatarUploader
                      value={avatarCardFront}
                      onPick={handlePick("cardFront")}
                      variant="card"
                      size={168}
                      label="روی کارت تذکره"
                      caption="تصویر سمت رویی تذکره"
                    />
                  </div>
                  <div className="fo-flex-center">
                    <AvatarUploader
                      value={avatarCardBack}
                      onPick={handlePick("cardBack")}
                      variant="card"
                      size={168}
                      label="پشت کارت تذکره"
                      caption="تصویر سمت پشتی تذکره"
                    />
                  </div>
                </div>
              </section>

              {/* geniş adres alanı (gridin tamamını kapla) */}
              {/* <div className="fo-row fo-row--wide">
                <Input
                  multiline
                  rows={3}
                  type="text"
                  placeholder="آدرس کامل..."
                  icon="MapPin"
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  required
                />
              </div> */}
              {/* geniş adres alanı (col-9 + col-3) */}
              <div
                className="fo-row fo-row--wide"
                style={{ display: "grid", gridTemplateColumns: "9fr 3fr", gap: "12px" }}
              >
                <Input
                  multiline
                  rows={3}
                  type="text"
                  placeholder="آدرس کامل..."
                  icon="MapPin"
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                  required
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%", // kapsayıcı yüksekliği doldurur
                  }}
                >
                  <Button
                    iconOnly
                    icon={Fingerprint}
                    size="xl"
                    type="button"
                    onClick={() => setOpen(true)} // modal açılır
                    variant={done ? "success" : "accent"} // yeşil veya soluk renk
                    style={{
                      width: 150,
                      height: 150,
                      borderRadius: "50%",
                      fontSize: "2.5rem",
                      opacity: done ? 1 : 0.5, // parmak izi onaylanmamışsa soluk görünüm
                      boxShadow: done
                        ? "0 0 20px rgba(0, 255, 0, 0.4)"
                        : "0 0 12px rgba(1, 168, 158, 0.3)",
                      transition: "all 0.3s ease",
                    }}
                  />
                </div>

              </div>


            </div>
          )}
        </form>

        {/* Footer */}
        <footer className="fomodal__footer">
          {step === 2 ? (
            <div className="fo-actions">
              <Button
                icon={ArrowBigRight}
                type="button"
                variant="secondary"
                onClick={goBack}
                style={{
                  height: "var(--btn-height)",
                  borderRadius: "var(--btn-radius)",
                }}
              >
                برگشت
              </Button>
              <Button
                icon={UserRoundPlus}
                type="submit"
                form={formId}
                disabled={!canSubmitStep2}
                title={
                  !canSubmitStep2 ? "فیلدهای ضروری را پُر کنید" : undefined
                }
                style={{
                  height: "var(--btn-height)",
                  borderRadius: "var(--btn-radius)",
                }}
              >
                ذخیره
              </Button>
            </div>
          ) : (
            <Button
              icon={ArrowBigLeft}
              type="button"
              onClick={goNext}
              disabled={!canContinueStep1}
              style={{
                height: "var(--btn-height)",
                borderRadius: "var(--btn-radius)",
                width: "100%",
              }}
            >
              ادامه بده
            </Button>
          )}
        </footer>

        {/* Crop Modal */}
        <ImageCropModal
          open={openCrop}
          src={rawImage}
          onClose={() => setOpenCrop(false)}
          onCropped={handleCropped}
        />

        <FingerModal
          open={open}
          onClose={() => setOpen(false)}
          scanCount={scanCount}
          done={done}
          running={running}
          status={status}
          error={error}
          onRetry={onRetry}
          onConfirm={onConfirm}
          runScans={runScans}
        />

      </div>
    </div>
  );
}
