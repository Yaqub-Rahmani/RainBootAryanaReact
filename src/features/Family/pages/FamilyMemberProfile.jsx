import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router-dom";

import "../styles/FamilyMemberProfile.css";

import Button from "../../../shared/components/Button";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import PaymentModal from "../../../shared/components/Payment/PaymentModal";

import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal";
import FingerModal from "../../fingerprint/Model/fingerModel";

import { normalizeMediaPath } from "../../../shared/utils/normalizeMediaPath";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import {
  OwnerType,
  MediaKind,
  guid,
  nowIso,
} from "../../../shared/person/onboardConstants";
import { getTokens } from "../../../shared/services/apiClient";

import { imageService } from "../../images/services/imageService";
import { mediaAssetService } from "../../mediaAsset/services/mediaAssetService";
import { familyMemberService } from "../service/familyMemberService";

import {
  ChevronsDown,
  ChevronsUp,
  Download,
  Edit,
  Fingerprint,
} from "lucide-react";

// thunks (senin mevcut slice’ların)
import {
  fetchFamilyMemberProfile,
  clearFamilyMemberProfile,
} from "../slices/familyMemberSlice";
import { fetchFamilyBalanceEntryDetails } from "../slices/familyBalanceEntrySlice";

import { createPaymentOutflow } from "../../paymentOutflow/slices/paymentOutflowSlice";

export default function FamilyMemberProfile() {
  const { familyId } = useParams();
  const dispatch = useDispatch();

  const profile = useSelector((s) => s.familyMember?.profile);
  const profileStatus = useSelector((s) => s.familyMember?.profileStatus);
  const profileError = useSelector((s) => s.familyMember?.profileError);

  // collapse
  const [open, setOpen] = useState(false);

  // payment modal
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentModel, setPaymentModel] = useState({
    method: null,
    amount: "",
    reference: "",
    description: "",
    fingerprintTemplateBase64: "",
    fingerprintBitmapPngBase64: "",
  });

  // table summary
  const [summary, setSummary] = useState(null);

  // ---- Media edit pipeline states ----
  const fileInputRef = useRef(null);
  const pendingMediaRef = useRef(null); // { kind, title }

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropTitle, setCropTitle] = useState("");

  // ---- Fingerprint pipeline states ----
  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerBusy, setFingerBusy] = useState(false);

  useEffect(() => {
    if (!familyId) return;
    dispatch(fetchFamilyMemberProfile(familyId));
    return () => dispatch(clearFamilyMemberProfile());
  }, [dispatch, familyId]);

  const isProbablyImage = (url) => {
    if (!url) return false;
    const base = String(url).split("?")[0].toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(base);
  };

  const fmtMoney = (n) =>
    n || n === 0 ? Number(n).toLocaleString("en-US") : "—";

  // profile dto (C# FamilyMemberProfileDto ile uyumlu alanlar)
  const displayName = profile?.DisplayName ?? profile?.displayName ?? "—";
  const fatherName = profile?.FatherName ?? profile?.fatherName ?? "";
  const nationalId = profile?.NationalId ?? profile?.nationalId ?? "—";
  const phonePrimary = profile?.PhonePrimary ?? profile?.phonePrimary ?? "";
  const phoneSecondary =
    profile?.PhoneSecondary ?? profile?.phoneSecondary ?? "";
  const phonesText =
    [phonePrimary, phoneSecondary].filter(Boolean).join(" / ") || "—";
  const province = profile?.Province ?? profile?.province ?? "—";
  const district = profile?.District ?? profile?.district ?? "—";
  const addressLine = profile?.AddressLine ?? profile?.addressLine ?? "—";
  const addressFull = profile?.AddressFull ?? profile?.addressFull ?? "—";
  const active = (profile?.IsActive ?? profile?.isActive ?? true) === true;

  const totalIn = profile?.TotalIn ?? profile?.totalIn ?? 0;
  const totalOut = profile?.TotalOut ?? profile?.totalOut ?? 0;
  const balanceRaw = profile?.Balance ?? profile?.balance ?? totalIn - totalOut;
  const balanceFmt =
    typeof balanceRaw === "number"
      ? balanceRaw.toLocaleString("en-US", { minimumFractionDigits: 2 })
      : fmtMoney(balanceRaw);

  const [mediaRev, setMediaRev] = useState(0);
  const withBust = (url, rev) => {
    if (!url) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}v=${encodeURIComponent(rev ?? Date.now())}`;
  };
  // avatar
  const rawAvatar = profile?.AvatarUrl ?? profile?.avatarUrl ?? "";
  // const avatarUrl = rawAvatar ? normalizeMediaPath(rawAvatar) : null;
  const avatarUrl = rawAvatar ? withBust(normalizeMediaPath(rawAvatar), mediaRev) : null;

  const avatarSrc = avatarUrl && isProbablyImage(avatarUrl) ? avatarUrl : null;

  const cardSpecs = useMemo(
    () => [
      { kind: MediaKind.IdFront, key: "IdFrontUrl", title: "روی - تذکره" },
      { kind: MediaKind.IdBack, key: "IdBackUrl", title: "پشت - تذکره" },
      { kind: MediaKind.Avatar, key: "AvatarUrl", title: "عکس پروفایل" },
      {
        kind: MediaKind.FingerBitmap,
        key: "FingerBitmapUrl",
        title: "اثر انگشت",
      },
    ],
    [],
  );

  // ✅ CustomTableV2 filter şeması (zip’teki CustomTableV2 ile birebir)
  const paymentMethodLabels = {
    0: "نامشخص",
    1: "نقده حضوری",
    2: "ازطریق بانک",
    3: "از طریق حواله",
  };

  const BalanceColumns = useMemo(
    () => [
      // ✅ PaymentMethod (Franchise ile aynı)
      {
        key: "paymentMethod",
        header: "روش پرداخت",
        sortable: true,
        serverField: "PaymentMethod",
        render: (_v, r) => paymentMethodLabels[r?.paymentMethod] || "—",

        filterType: "select",
        filterLabel: "روش پرداخت",
        filterOptions: [
          { value: "Unknown", label: "نامشخص" },
          { value: "cash", label: "نقده حضوری" },
          { value: "bank", label: "ازطریق بانک" },
          { value: "transfer", label: "از طریق حواله" },
        ],
        filterOp: "eq",
      },

      // ✅ Direction
      {
        key: "directionLabel",
        header: "نوع",
        sortable: true,
        serverField: "Direction",
        render: (_v, r) => r?.DirectionLabel ?? r?.directionLabel ?? "—",

        filterType: "select",
        filterLabel: "نوع جریان",
        filterOptions: [
          { value: "In", label: "دریافت (ورود به حساب)" },
          { value: "Out", label: "پرداخت (خروج از حساب)" },
        ],
        filterOp: "eq",
      },

      // ✅ Amount range
      {
        key: "amount",
        header: "مبلغ",
        sortable: false,
        serverField: "Amount",
        align: "end",
        render: (v) => (v != null ? Number(v).toLocaleString("en-US") : "—"),

        filterType: "numberRange",
        filterLabel: "با مبلغ",
        minPlaceholder: "حداقل مبلغ",
        maxPlaceholder: "حداکثر مبلغ",
      },
      {
        key: "referenceNo",
        header: "رپرانس",
        sortable: false,
        serverField: "ReferenceNo", // ✅ DOĞRU FIELD
        render: (_v, r) => r?.ReferenceNo ?? r?.referenceNo ?? "—",

        // filterType: "text",
        // filterLabel: "رپرانس",
        // filterPlaceholder: "جستجو در رپرانس...",
        // filterOp: "contains",
      },

      // ✅ OccurredAtUtc (transaction date) - profesyonel: dateRange
      {
        key: "occurredAtUtc",
        header: "تاریخ معامله",
        sortable: true,
        serverField: "OccurredAtUtc",
        render: (value) =>
          value
            ? convertAfDate(String(value).slice(0, 10), { monthStyle: "name" })
            : "—",

        // filterType: "dateRange",
        // filterLabel: "بازه تاریخ معامله",
        // fromPlaceholder: "از تاریخ...",
        // toPlaceholder: "تا تاریخ...",
      },

      // ✅ CreatedAtUtc (audit date) - istersen visible false bırak
      {
        key: "createdAtUtc",
        header: "تاریخ ثبت",
        sortable: true,
        serverField: "CreatedAtUtc",
        visible: false,
        render: (value) =>
          value
            ? convertAfDate(String(value).slice(0, 10), { monthStyle: "name" })
            : "—",
        filterType: "dateRange",
        filterLabel: "تاریخ ثبت",
        fromPlaceholder: "از تاریخ...",
        toPlaceholder: "تا تاریخ...",
      },

      // ✅ CreatedByUserName (DTO deferred filter)
      {
        key: "createdByUserName",
        header: "ثبت‌ کننده",
        sortable: true,
        serverField: "CreatedByUserName",
        render: (v, r) => v ?? r?.CreatedByUserName ?? "—",

        filterType: "text",
        filterLabel: "ثبت‌ کننده",
        filterPlaceholder: "جستجو در نام ثبت‌ کننده...",
        filterOp: "contains",
      },

      // ✅ PeriodLabel (opsiyonel)
      {
        key: "periodLabel",
        header: "دوره",
        sortable: false,
        serverField: "PeriodLabel",
        visible: false,
        render: (v, r) => v ?? r?.PeriodLabel ?? "—",
      },

      // ✅ Notes
      {
        key: "notes",
        header: "یادداشت",
        sortable: false,
        serverField: "Notes",
        render: (v) => (v == null || String(v).trim() === "" ? "—" : String(v)),

        // filterType: "text",
        // filterLabel: "یادداشت",
        // filterPlaceholder: "جستجو در یادداشت...",
        // filterOp: "contains",
      },
    ],
    [],
  );

  // -------- Media Edit helpers --------
  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const openPickerFor = (kind, title) => {
    pendingMediaRef.current = { kind, title };
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onPickedFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pending = pendingMediaRef.current;
    if (!pending?.kind) return;

    const dataUrl = await fileToDataUrl(file);

    // ✅ Crop modal kesin açılır
    setCropTitle(pending.title);
    setCropSrc(dataUrl);
    setCropOpen(true);
  };

  // Zip’teki ImagesController response: { saved, path, fileName, mime, ... } (C# SaveImageResponse)
  const pickSavedPath = (res) => {
    const x = res?.data ?? res;
    return x?.Path ?? x?.path ?? "";
  };

  const kindToSubfolder = (kind) => {
    if (kind === MediaKind.Avatar) return "avatars";
    if (kind === MediaKind.IdFront) return "id-cards/front";
    if (kind === MediaKind.IdBack) return "id-cards/back";
    if (kind === MediaKind.FingerBitmap) return "fingers";
    return "misc";
  };

  const saveCroppedAsMedia = async (pngDataUrl) => {
    const pending = pendingMediaRef.current;
    if (!pending?.kind) return;

    try {
      // 1) image save
      const baseFolder = `/storage/family-members/${familyId}`;
      const folderUrl = `${baseFolder}/${kindToSubfolder(pending.kind)}`;

      const savedRes = await imageService.saveIfDataUrl({
        photoFolderUrl: folderUrl,
        baseFile: pngDataUrl,
      });
      const relativePath = pickSavedPath(savedRes);
      if (!relativePath) throw new Error("تصویر ذخیره نشد.");

      // 2) media add
      const id = guid();
      await mediaAssetService.add({
        Id: id,
        OwnerType: OwnerType.FamilyMember,
        OwnerId: familyId,
        Kind: pending.kind,
        StorageUrl: relativePath,
        HashChecksum: "",
        IsPrimary: true,
        CreatedAt: nowIso(),
      });

      // 3) set primary (eskileri false yapar)
      await media_asset_setPrimary_safe(id);

      // 4) refresh profile
      dispatch(fetchFamilyMemberProfile(familyId));
      setMediaRev(Date.now());

    } catch (err) {
      alert(String(err?.response?.data ?? err?.message ?? "خطا"));
    } finally {
      setCropOpen(false);
      pendingMediaRef.current = null;
    }
  };

  async function media_asset_setPrimary_safe(id) {
    try {
      await mediaAssetService.setPrimary(id);
    } catch (e) {
      // bazı projelerde add zaten primary’yi set ediyor olabilir; hata alsa bile ekranı bozma
    }
  }

  // -------- Download (proper name + auth header) --------
  const sanitizeFileName = (s) =>
    String(s || "")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const guessExt = (url, mime) => {
    const u = String(url || "")
      .split("?")[0]
      .toLowerCase();
    const m = String(mime || "").toLowerCase();
    if (m.includes("png")) return ".png";
    if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
    if (m.includes("webp")) return ".webp";
    if (m.includes("pdf")) return ".pdf";
    const match = u.match(/\.(png|jpe?g|webp|gif|pdf)$/i);
    return match ? `.${match[1].toLowerCase()}` : "";
  };

  const downloadMedia = async (url, title) => {
    if (!url) return;
    try {
      const token = getTokens()?.accessToken;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const blob = await res.blob();
      const ext = guessExt(url, blob.type);

      const fileName =
        sanitizeFileName(
          `اعضای خانواده ${displayName} ${fatherName} ${title}`,
        ) + ext;

      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      // isimlendirme başarısızsa en azından aç
      window.open(url, "_blank");
    }
  };

  // -------- Fingerprint: create -> save bitmap -> media primary -> upsert template --------
  const onFingerprintCompleted = async (payload) => {
    if (!payload || payload.result !== "success" || payload.action !== "create")
      return;
    if (!payload.mergedTemplateBase64) return;

    setFingerBusy(true);
    try {
      let relatedMediaId = null;

      // bitmap varsa media olarak kaydet
      if (payload.lastBitmapPngBase64) {
        const folderUrl = `/storage/family-members/${familyId}/fingers`;
        const savedRes = await imageService.saveIfDataUrl({
          photoFolderUrl: folderUrl,
          baseFile: payload.lastBitmapPngBase64,
        });
        const relativePath = pickSavedPath(savedRes);
        if (!relativePath) throw new Error("اثر انگشت ذخیره نشد.");

        const id = guid();
        await mediaAssetService.add({
          Id: id,
          OwnerType: OwnerType.FamilyMember,
          OwnerId: familyId,
          Kind: MediaKind.FingerBitmap,
          StorageUrl: relativePath,
          HashChecksum: "",
          IsPrimary: true,
          CreatedAt: nowIso(),
        });
        await media_asset_setPrimary_safe(id);
        relatedMediaId = id;
      }

      // template upsert (C#: FamilyMemberFingerprintUpsertDto)
      await familyMemberService.upsertFingerprint(familyId, {
        templateBase64: payload.mergedTemplateBase64,
        relatedMediaAssetId: relatedMediaId,
      });

      setFingerOpen(false);
      dispatch(fetchFamilyMemberProfile(familyId));
      setMediaRev(Date.now());
    } catch (err) {
      alert(
        String(err?.response?.data ?? err?.message ?? "خطا در ثبت اثر انگشت"),
      );
    } finally {
      setFingerBusy(false);
    }
  };

  const [balanceTableKey, setBalanceTableKey] = useState(0);

  const OutflowType = { FamilyMemberPayout: 6 };
  const Currency = { Afn: 1, Usd: 2 };
  const PAYMENT_METHOD_MAP = { cash: 1, bank: 2, transfer: 2 };



  const resolvePaymentMethod = (m) => {
    if (m && typeof m === "object") {
      const pm = m.pm ?? m.value;
      if (typeof pm === "number") return pm;
      if (typeof pm === "string") return PAYMENT_METHOD_MAP[pm] ?? Number(pm);
    }
    if (typeof m === "string") return PAYMENT_METHOD_MAP[m] ?? Number(m);
    if (typeof m === "number") return m;
    return NaN;
  };

  const parseAmount = (v) => {
    if (v == null || String(v).trim() === "") return null;
    if (typeof v === "number") return v;
    const n = Number(String(v).replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const handleSubmitPayment = async (model) => {
    const entryId = guid();

    const method = resolvePaymentMethod(model?.method);
    if (!Number.isFinite(method) || method <= 0) {
      alert("روش پرداخت نامعتبر است.");
      return;
    }

    const amount = parseAmount(model?.amount);
    if (!amount || amount <= 0) {
      alert("مبلغ نامعتبر است.");
      return;
    }

    // maxPayable (balance) guard
    if (
      typeof balanceRaw === "number" &&
      Number.isFinite(balanceRaw) &&
      amount > balanceRaw
    ) {
      alert("مبلغ بیشتر از موجودی قابل پرداخت است.");
      return;
    }

    const fpTemplate = model?.fingerprintTemplateBase64 || null;
    const fpBitmap = model?.fingerprintBitmapPngBase64 || null;
    const hasAnyFp = !!fpTemplate || !!fpBitmap;

    if (hasAnyFp && (!fpTemplate || !fpBitmap)) {
      alert("اگر اثرانگشت ارسال می‌شود، هم تصویر و هم قالب الزامی است.");
      return;
    }

    const apiDto = {
      entryId,
      method,
      ownerId: familyId, // ✅ backend OutflowType=FamilyMemberPayout iken FamilyMemberId gibi yorumlar
      amount,
      reference: (model?.reference ?? "").trim() || null,
      description: (model?.description ?? "").trim() || null,
      fingerprintTemplateBase64: fpTemplate,
      fingerprintBitmapPngBase64: fpBitmap,
      currency: Currency.Afn,
      outflowType: OutflowType.FamilyMemberPayout,
    };

    const r = await dispatch(createPaymentOutflow({ dto: apiDto }));
    if (r.error) {
      alert(String(r.payload || r.error.message || "خطا در ثبت پرداخت"));
      return;
    }

    setPaymentOpen(false);

    // ✅ Ödeme sonrası listeyi ve profili anında güncelle
    setBalanceTableKey((k) => k + 1);
    // dispatch(fetchFamilyMemberProfile(familyId));
    dispatch(fetchFamilyMemberProfile(familyId));
    setMediaRev(Date.now());

  };

  const gender = profile?.Gender ?? profile?.gender ?? 0; // 0 Unknown, 1 Male, 2 Female
  const isParent = (profile?.IsParent ?? profile?.isParent ?? false) === true;
  const relationTagRaw = (
    profile?.RelationTag ??
    profile?.relationTag ??
    ""
  ).trim();

  const deriveRoleLabel = (g, parent) => {
    if (parent) {
      if (g === 1) return "پدر"; // Baba
      if (g === 2) return "مادر"; // Anne
      return "والد";
    }
    if (g === 1) return "پسر"; // Erkek çocuk
    if (g === 2) return "دختر"; // Kız çocuk
    return "فرزند";
  };

  const roleLabel = relationTagRaw || deriveRoleLabel(gender, isParent);

  // -------- Payment --------
  const handleAddPayment = () => {
    setPaymentModel({
      method: null,
      amount: "",
      reference: "",
      description: "",
      fingerprintTemplateBase64: "",
      fingerprintBitmapPngBase64: "",
    });
    setPaymentOpen(true);
  };

  return (
    <div className="owner-profile" dir="rtl">
      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPickedFile}
      />

      {/* HEADER */}
      <div className="owner-header">
        <div className="left-cluster">
          <div
            className="avatar"
            style={{ "--avatar-size": open ? "88px" : "44px" }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar-placeholder" />
            )}
          </div>

          <div className="title-block">
            <div className="name">
              {displayName}
              <span className={`status-pill ${active ? "ok" : "bad"}`}>
                {active ? "فعال" : "غیر فعال"}
              </span>
              <span className={`role-pill ${isParent ? "parent" : "child"}`}>
                {roleLabel}
              </span>
            </div>
            <div className="father">
              {fatherName ? `فرزند ${fatherName}` : "—"}
            </div>
            {/* <div className="father">{isParent ? roleLabel : (fatherName ? `فرزند ${fatherName}` : "—")}</div> */}
          </div>
        </div>

        <div className="right-cluster">
          <div className="balance">
            <div className="amount">{balanceFmt}</div>
            <div className="caption">باقیه موجود</div>
          </div>

          <Button
            size="lg"
            icon={open ? ChevronsUp : ChevronsDown}
            iconOnly
            onClick={() => setOpen((v) => !v)}
            className="collapse-btn"
            primaryColor="var(--role-secondary-bg)"
          />
        </div>
      </div>

      {/* COLLAPSE BODY */}
      <div className={`collapse-body ${open ? "open" : ""}`}>
        <div className="info-grid">
          <div className="col">
            <InfoRow label="نام">{displayName}</InfoRow>
            <InfoRow label="نام پدر">{fatherName || "—"}</InfoRow>
            <InfoRow label="شماره های تماس">{phonesText}</InfoRow>
            <InfoRow label="نمبر تذکره">{nationalId}</InfoRow>
          </div>

          <div className="col">
            <InfoRow label="ولایت">{province}</InfoRow>
            <InfoRow label="ولسوالی">{district}</InfoRow>
            <InfoRow label="آدرس">{addressLine}</InfoRow>
            <InfoRow label="آدرس کامل">{addressFull}</InfoRow>
          </div>
        </div>

        {/* MEDIA GRID */}
        {/* MEDIA GRID (Tenant style) */}
        <div className="tenantMediaGrid" style={{ "--media-cols": 4 }}>
          {cardSpecs.map((c) => {
            const raw =
              profile?.[c.key] ??
              profile?.[c.key.charAt(0).toLowerCase() + c.key.slice(1)];

            const url = raw
              ? withBust(normalizeMediaPath(raw), mediaRev)
              : null;
            const canImg = url && isProbablyImage(url);

            return (
              <div className="tenantMediaCard" key={c.key}>
                <div className="tenantMediaBox">
                  {canImg ? (
                    <img src={url} alt={c.title} loading="lazy" />
                  ) : (
                    <div className="tenantMediaPh">—</div>
                  )}
                </div>

                <div className="tenantMediaFooter">
                  <div className="tenantMediaTitle">{c.title}</div>

                  <div className="tenantMediaActions">
                    {c.kind === MediaKind.FingerBitmap ? (
                      <Button
                        size="sm"
                        primaryColor="var(--role-secondary-bg)"
                        iconOnly
                        icon={Fingerprint}
                        disabled={fingerBusy}
                        onClick={() => setFingerOpen(true)}
                        title="ثبت/به‌روزرسانی اثر انگشت"
                      />
                    ) : (
                      <Button
                        size="sm"
                        primaryColor="var(--role-secondary-bg)"
                        iconOnly
                        icon={Edit}
                        onClick={() => openPickerFor(c.kind, c.title)}
                        title="به‌روزرسانی"
                      />
                    )}

                    <Button
                      size="sm"
                      primaryColor="var(--role-primary-bg)"
                      iconOnly
                      icon={Download}
                      disabled={!url}
                      onClick={() => url && downloadMedia(url, c.title)}
                      title="دانلود"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {profileError && <div className="error">خطا: {profileError}</div>}

      {summary && (
        <div className={`balanceHeader ${summary.balance < 0 ? "neg" : "pos"}`}>
          <div className="bhLeft">
            <div className="bhTitle">خلاصه مالی</div>
            <div className="bhSub">بر اساس فیلترهای فعلی</div>
          </div>

          <div className="bhRight">
            <div className="bhCard in">
              <div className="bhLabel">مجموع (ورود)</div>
              <div className="bhValue">{fmtMoney(summary.totalIn)}</div>
            </div>
            <div className="bhCard out">
              <div className="bhLabel">مجموع (خروج)</div>
              <div className="bhValue">{fmtMoney(summary.totalOut)}</div>
            </div>
            <div className="bhCard balance">
              <div className="bhLabel">باقی مانده</div>
              <div className="bhValue bhBalanceValue">
                {fmtMoney(summary.balance)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TABLE */}
      <section>
        <CustomTableV2
          key={balanceTableKey}
          columns={BalanceColumns}
          toolbarTitle="جزئیات بیلانس عضو خانواده"
          transport="legacy"
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          maxBodyHeight={520}
          showAddButton
          addButtonLabel="پرداخت جدید"
          onAddClick={handleAddPayment}
          showSearchBar={false}
          selectable
          fetcher={async (q) => {
            const action = await dispatch(
              fetchFamilyBalanceEntryDetails({
                queryOptions: q,
                familyMemberId: familyId,
              }),
            );
            if (action.error)
              throw new Error(action.payload || action.error.message || "خطا");

            const data = action.payload?.res?.data ?? action.payload?.res;
            if (data?.summary) setSummary(data.summary);
            return data?.page ?? data;
          }}
        />
      </section>

      {/* PAYMENT */}
      {paymentOpen && (
        <PaymentModal
          open={paymentOpen}
          value={paymentModel}
          maxPayable={balanceRaw ?? null}
          currencyLabel="؋"
          onChange={setPaymentModel}
          onClose={() => setPaymentOpen(false)}
          onSubmit={handleSubmitPayment}
          title="پرداخت عضو خانواده"
          hint={`پرداخت از حساب ${displayName} ${fatherName ? `فرزند ${fatherName}` : ""} | موجودی: ${
            balanceRaw ?? 0
          } ؋`}
        />
      )}

      {/* CROP MODAL */}
      <ImageCropModal
        open={cropOpen}
        src={cropSrc}
        title={cropTitle}
        onClose={() => setCropOpen(false)}
        onCropped={saveCroppedAsMedia}
      />

      {/* FINGER MODAL (zip’te default export + auto-start) */}
      <FingerModal
        open={fingerOpen}
        mode="create"
        verbose={false}
        autoCloseOnSuccess={true}
        successCloseDelay={900}
        onClose={() => (fingerBusy ? null : setFingerOpen(false))}
        onCompleted={onFingerprintCompleted}
      />
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{children}</div>
    </div>
  );
}
