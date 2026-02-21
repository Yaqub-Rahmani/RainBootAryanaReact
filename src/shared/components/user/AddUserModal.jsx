import React, {
  useEffect,
  useId,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import Input from "../../../shared/components/Input";
import Button from "../../../shared/components/Button";
import SmartSelect from "../../../shared/components/SmartSelect.jsx";
import { AvatarUploader } from "../../../shared/imageCrop/AvatarUploader.jsx";
import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal.jsx";
import defaultAvatar from "../../../assets/avatars/avatar.svg";
import idcardfrontavatar from "../../../assets/avatars/idcardfront.svg";
import idcardbackavatar from "../../../assets/avatars/idcardback.svg";
import {
  ArrowBigLeft,
  ArrowBigRight,
  Fingerprint,
  UserRoundPlus,
  X,
} from "lucide-react";
import "../../styles/user/addUserModel.css";
import FingerModal from "../../../features/fingerprint/Model/fingerModel.jsx";

// Province & District slices
import { fetchProvinces } from "../../../features/province/slices/provinceSlice";
import { fetchDistricts } from "../../../features/district/slices/districtSlice";

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
// const normalizePhone = (v) => s(v).replace(/[^\d+]/g, "").replace(/^00/, "+");
const normalizePhone = (v) => s(v).replace(/[^+\d]/g, "");

export default function AddUserModal({
  open,
  onClose,
  onSave,
  title = "صاحب امتیاز",
  isShowParent = false,
}) {
  const dispatch = useDispatch();

  // Provinces store
  const provinces = useSelector((st) => st.province.list);
  const provinceStatus = useSelector((st) => st.province.status);

  // Districts store (TÜM liste)
  const districts = useSelector((st) => st.district.list);
  const districtStatus = useSelector((st) => st.district.status);

  const formId = useId();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  

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
    gender: "male",
    familyRole: "child",
  });

  // images & crop
  const [openCrop, setOpenCrop] = useState(false);
  const [rawImage, setRawImage] = useState("");
  const [activeTarget, setActiveTarget] = useState(null);
  const [avatarProfile, setAvatarProfile] = useState(defaultAvatar);
  const [avatarCardFront, setAvatarCardFront] = useState(idcardfrontavatar);
  const [avatarCardBack, setAvatarCardBack] = useState(idcardbackavatar);

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";


  // fingerprint (tek nesneye yazılacak alanlar)
  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerprintTemplateBase64, setFingerprintTemplateBase64] =
    useState("");
  const [fingerprintBitmapPngBase64, setFingerprintBitmapPngBase64] =
    useState("");

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

  // modal açılınca: form reset + iller ve ilçeler getir
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
      gender: "male",
      familyRole: "child",
    });
    setAvatarProfile(defaultAvatar);
    setAvatarCardFront(idcardfrontavatar);
    setAvatarCardBack(idcardbackavatar);
    setFingerprintTemplateBase64("");
    setFingerprintBitmapPngBase64("");

    dispatch(fetchProvinces());
    dispatch(fetchDistricts());
  }, [open, dispatch]);

  // İl değişince: geçersiz district reset
  useEffect(() => {
    if (!form.provinceId) {
      setForm((f) => ({ ...f, districtId: "" }));
    } else if (form.districtId) {
      const ok = districts?.some(
        (d) =>
          String(d.id) === String(form.districtId) &&
          String(d.provinceId) === String(form.provinceId)
      );
      if (!ok) setForm((f) => ({ ...f, districtId: "" }));
    }
  }, [form.provinceId, form.districtId, districts]);

  // --- Zorunlular ---
  const hasProfilePhoto = useMemo(
    () => !!avatarProfile && avatarProfile !== defaultAvatar,
    [avatarProfile]
  );

  const canContinueStep1 = useMemo(
    () =>
      s(form.displayName).trim() &&
      s(form.fatherName).trim() &&
      s(form.phone).trim() &&
      hasProfilePhoto &&
      (!isShowParent || // parent alanı gösterilmiyorsa ekstra şart yok
        form.familyRole === "parent" ||
        form.familyRole === "child"), // gösteriliyorsa parent/child’ten biri seçili olmalı
    [
      form.displayName,
      form.fatherName,
      form.phone,
      hasProfilePhoto,
      isShowParent,
      form.familyRole,
    ]
  );

  const canSubmitStep2 = useMemo(
    () =>
      s(form.nationalId).trim() &&
      s(form.provinceId).trim() &&
      s(form.districtId).trim(),
    [form.nationalId, form.provinceId, form.districtId]
  );

  const goNext = () => {
    if (canContinueStep1) setStep(2);
  };
  const goBack = () => setStep(1);

  // select opsiyonları
  const provinceOptions = useMemo(
    () =>
      Array.isArray(provinces)
        ? provinces.map((p) => ({ value: String(p.id), label: p.name }))
        : [],
    [provinces]
  );
  const districtOptions = useMemo(
    () =>
      Array.isArray(districts)
        ? districts
            .filter(
              (d) => String(d.provinceId) === String(form.provinceId || "")
            )
            .map((d) => ({ value: String(d.id), label: d.name }))
        : [],
    [districts, form.provinceId]
  );

  const provincesLoading = provinceStatus === "loading";
  const districtsLoading = districtStatus === "loading";

  // --- KAYDET: TEK OBJE ---
  const handleAdd = async (e) => {
    e?.preventDefault?.();
    if (submitting || !canSubmitStep2) return;

    const province = provinceOptions.find((o) => o.value === form.provinceId);
    const district = districtOptions.find((o) => o.value === form.districtId);

    const payload = {
      id: form.id,
      createdAt: new Date().toISOString(),
      displayName: s(form.displayName).trim(),
      fatherName: s(form.fatherName).trim(),
      phone: normalizePhone(form.phone),
      phone2: s(form.phone2).trim() ? normalizePhone(form.phone2) : null,
      note: s(form.note).trim() || null,
      nationalId: s(form.nationalId).trim(),
      gender: form.gender,
      familyRole: form.familyRole, // "parent" | "child"
      isParent: form.familyRole === "parent", // eski yapı ile uyumluluk için
      address: s(form.address).trim(),
      provinceId: form.provinceId || null,
      provinceName: province?.label || null,
      districtId: form.districtId || null,
      districtName: district?.label || null,
      avatarProfile,
      idCardFront: avatarCardFront,
      idCardBack: avatarCardBack,
      fingerprintTemplateBase64,
      fingerprintBitmapPngBase64,
    };

    try {
      setSubmitting(true);
      await onSave?.(payload);
      onClose?.();
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      dir="rtl"
      className="fomodal__overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${formId}-title`}
      // onMouseDown={(e) => {
      //   if (e.target === e.currentTarget) onClose?.();
      // }}
    >
      <div className="fomodal__dialog" onMouseDown={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="fomodal__header">
          <div>
            <h2 id={`${formId}-title`} className="fomodal__title">
              {title} {step === 1 ? "(1/2)" : "(2/2)"}
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
          <Button iconOnly ariaLabel="بستن" primaryColor={dangerColor} onClick={onClose} icon={X} />
        </header>

        {/* Body */}
        <form id={formId} onSubmit={handleAdd} className="fomodal__body">
          {step === 1 && (
            <div className="fomodal__grid-step1">
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

                  {/* <div className="fo-row fo-row--wide">
                    <Input multiline rows={3} type="text" label="یادداشت" placeholder="..." icon="Edit" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />
                                    <div className="gender-select" role="radiogroup" aria-label="عضویت خانواده" dir="rtl">
                  <label className={`gender-option ${form.gender === "male" ? "selected" : ""}`} onClick={() => setForm((f) => ({ ...f, gender: "male" }))}>
                    <input type="radio" name="gender" value="male" checked={form.gender === "male"} readOnly />
                    <span>والدین</span>
                  </label>

                  <label className={`gender-option ${form.gender === "female" ? "selected" : ""}`} onClick={() => setForm((f) => ({ ...f, gender: "female" }))}>
                    <input type="radio" name="gender" value="female" checked={form.gender === "female"} readOnly />
                    <span>اولاد</span>
                  </label>
                </div>                
                  </div> */}

                  <div
                    className="fo-row fo-row--wide"
                    style={{
                      display: "grid",
                      gridTemplateColumns: isShowParent ? "2fr 1fr" : "1fr",
                      gap: 12,
                      alignItems: "stretch",
                    }}
                  >
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

                    {isShowParent && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: "100%",
                        }}
                      >
                        <div
                          style={{
                            textAlign: "center",
                            minWidth: 0,
                          }}
                        >
                          {/* Üst label */}
                          <div
                            className="form-label"
                            style={{ marginBottom: 8, color: "var(--text)" }}
                          >
                            نوع عضو خانواده را انتخاب کنید
                          </div>

                          {/* Radio group */}
                          <div
                            className="gender-select"
                            role="radiogroup"
                            aria-label="نوع عضو خانواده"
                            dir="rtl"
                          >
                            <label
                              className={`gender-option ${
                                form.familyRole === "parent" ? "selected" : ""
                              }`}
                              onClick={() =>
                                setForm((f) => ({ ...f, familyRole: "parent" }))
                              }
                            >
                              <input
                                type="radio"
                                name="familyRole"
                                value="parent"
                                checked={form.familyRole === "parent"}
                                readOnly
                              />
                              <span>والدین</span>
                            </label>

                            <label
                              className={`gender-option ${
                                form.familyRole === "child" ? "selected" : ""
                              }`}
                              onClick={() =>
                                setForm((f) => ({ ...f, familyRole: "child" }))
                              }
                            >
                              <input
                                type="radio"
                                name="familyRole"
                                value="child"
                                checked={form.familyRole === "child"}
                                readOnly
                              />
                              <span>فرزند</span>
                            </label>
                          </div>
                          {!form.familyRole && (
                            <small style={{ color: "var(--role-danger-fg)" }}>
                              انتخاب نوع عضو خانواده الزامی است
                            </small>
                          )}

                          {/* Alt açıklama (isteğe bağlı) */}
                          <small
                            style={{
                              display: "block",
                              marginTop: 6,
                              fontSize: 12,
                              color: "var(--muted, #6b7280)",
                            }}
                          >
                            در صورت لزوم می‌توانید بعداً تغییر دهید
                          </small>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <aside className="focard focard__pad fo-flex-center flex-col">
                <AvatarUploader
                  value={avatarProfile}
                  onPick={handlePick("profile")}
                  variant="profile"
                  size={168}
                  label="انتخاب عکس پروفایل"
                  caption="عکس مورد نظر را برگزینید"
                />
                {!hasProfilePhoto && (
                  <small
                    style={{ color: "var(--role-danger-fg)", marginTop: 6 }}
                  >
                    عکس پروفایل الزامی است
                  </small>
                )}

                <div
                  className="gender-select"
                  role="radiogroup"
                  aria-label="جنسیت"
                  dir="rtl"
                >
                  <label
                    className={`gender-option ${
                      form.gender === "male" ? "selected" : ""
                    }`}
                    onClick={() => setForm((f) => ({ ...f, gender: "male" }))}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value="male"
                      checked={form.gender === "male"}
                      readOnly
                    />
                    <span>مرد</span>
                  </label>

                  <label
                    className={`gender-option ${
                      form.gender === "female" ? "selected" : ""
                    }`}
                    onClick={() => setForm((f) => ({ ...f, gender: "female" }))}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value="female"
                      checked={form.gender === "female"}
                      readOnly
                    />
                    <span>زن</span>
                  </label>
                </div>
              </aside>
            </div>
          )}

          {step === 2 && (
            <div className="fomodal__grid-step2">
              <section className="focard focard__pad">
                <div className="fo-row" style={{ gridTemplateColumns: "1fr" }}>
                  <Input
                    type="id"
                    mask="custom"
                    maskPattern="9999-9999-99999"
                    label="نمبر تذکره"
                    placeholder="XXXX-XXXX-XXXXX"
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
                        placeholder={
                          provinceOptions.length === 0 || provincesLoading
                            ? "در حال بارگذاری..."
                            : "انتخاب ولایت"
                        }
                        size="md"
                        dir="rtl"
                        disabled={
                          provincesLoading && provinceOptions.length === 0
                        }
                      />
                      {!form.provinceId && (
                        <small style={{ color: "var(--role-danger-fg)" }}>
                          انتخاب ولایت الزامی است
                        </small>
                      )}
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
                          form.provinceId
                            ? districtsLoading
                              ? "..."
                              : "انتخاب ولسوالی"
                            : "--------"
                        }
                        size="md"
                        disabled={
                          !form.provinceId ||
                          (districtsLoading && districtOptions.length === 0)
                        }
                        dir="rtl"
                      />
                      {form.provinceId && !form.districtId && (
                        <small style={{ color: "var(--role-danger-fg)" }}>
                          انتخاب ولسوالی الزامی است
                        </small>
                      )}
                    </div>
                  </div>
                </div>
              </section>

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

              <div
                className="fo-row fo-row--wide"
                style={{
                  display: "grid",
                  gridTemplateColumns: "9fr 3fr",
                  gap: "12px",
                }}
              >
                <Input
                  multiline
                  rows={3}
                  type="text"
                  placeholder="آدرس کامل..."
                  icon="MapPin"
                  value={form.address}
                  onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                  }}
                >
                  <div
                    style={{ display: "grid", gap: 8, justifyItems: "center" }}
                  >
                    <Button
                      iconOnly
                      iconSize={69}
                      icon={Fingerprint}
                      size="xl"
                      type="button"
                      onClick={() => setFingerOpen(true)}
                      variant={
                        fingerprintTemplateBase64 ? "success" : "secondary"
                      }
                      style={{
                        width: 150,
                        height: 90,
                        fontSize: "3rem",
                        opacity: fingerprintTemplateBase64 ? 1 : 0.5,
                        boxShadow: fingerprintTemplateBase64
                          ? "none"
                          : "0 0 12px rgba(1, 168, 158, 0.3)",
                        backgroundColor: fingerprintTemplateBase64
                          ? undefined
                          : "rgba(200, 200, 200, 0.6)",
                        transition: "all 0.3s ease",
                      }}
                      title={
                        fingerprintTemplateBase64 ? "ثبت شد" : "ثبت بایومتریک"
                      }
                      data-test="btn-fingerprint"
                    />
                    <small
                      aria-live="polite"
                      style={{
                        color: fingerprintTemplateBase64
                          ? "var(--role-success-fg, var(--accent))"
                          : "var(--muted)",
                      }}
                    >
                      {fingerprintTemplateBase64
                        ? "بایومتریک ثبت شد"
                        : "ثبت بایومتریک (اختیاری)"}
                    </small>
                  </div>
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
                primaryColor={secondaryColor}
                // style={{
                //   height: "var(--btn-height)",
                //   borderRadius: "var(--btn-radius)",
                // }}
                disabled={submitting}
              >
                برگشت
              </Button>
              <Button
                icon={UserRoundPlus}
                type="submit"
                form={formId}
                disabled={!canSubmitStep2 || submitting}
                title={
                  !canSubmitStep2 ? "فیلدهای ضروری را تکمیل کنید" : undefined
                }
                // style={{
                //   height: "var(--btn-height)",
                //   borderRadius: "var(--btn-radius)",
                // }}
                primaryColor={primaryColor}
                data-test="btn-add-user"
              >
                {submitting ? "در حال ذخیره..." : "ذخیره"}
              </Button>
            </div>
          ) : (
            <Button
              icon={ArrowBigLeft}
              type="button"
              onClick={goNext}
              disabled={!canContinueStep1 || submitting}
              primaryColor={primaryColor}
              style={{
                // height: "var(--btn-height)",
                // borderRadius: "var(--btn-radius)",
                width: "100%",
              }}
              data-test="btn-next"
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

        {/* Fingerprint Modal (sade) */}
        <FingerModal
          open={fingerOpen}
          onClose={() => setFingerOpen(false)}
          mode="create"
          verbose={false}
          autoCloseOnSuccess={true}
          successCloseDelay={900}
          onCompleted={(res) => {
            // create başarılıysa doğrudan tek-objeye yaz
            if (
              res?.result === "success" &&
              res?.action === "create" &&
              res?.mergedTemplateBase64
            ) {
              setFingerprintTemplateBase64(res.mergedTemplateBase64);
              setFingerprintBitmapPngBase64(res.lastBitmapPngBase64 || "");
            }
          }}
        />
      </div>
    </div>
  );
}
