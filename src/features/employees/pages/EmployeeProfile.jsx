import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/EmployeeProfile.css";

import Button from "../../../shared/components/Button";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import PaymentModal from "../../../shared/components/Payment/PaymentModal";

import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal";
import FingerModal from "../../fingerprint/Model/fingerModel";

import { normalizeMediaPath } from "../../../shared/utils/normalizeMediaPath";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import { OwnerType, MediaKind, guid, nowIso } from "../../../shared/person/onboardConstants";
import { getTokens } from "../../../shared/services/apiClient";

import { imageService } from "../../images/services/imageService";
import { mediaAssetService } from "../../mediaAsset/services/mediaAssetService";

import { employeeService } from "../services/employeeService";
import { employeeTransactionService } from "../services/employeeTransactionService";
import { createPaymentOutflow } from "../../paymentOutflow/slices/paymentOutflowSlice";

import {
  ChevronsDown,
  ChevronsUp,
  Download,
  Edit,
  Fingerprint,
  Trash2,
} from "lucide-react";
import TxFlowModal from "../components/TxFlowModal";
import Input from "../../../shared/components/Input";

const OutflowType = { EmployeeSalary: 7 };
const Currency = { Afn: 1, Usd: 2 };
const PAYMENT_METHOD_MAP = { cash: 1, bank: 2, transfer: 2 };

function resolvePaymentMethod(m) {
  if (m && typeof m === "object") {
    const pm = m.pm ?? m.value;
    if (typeof pm === "number") return pm;
    if (typeof pm === "string") return PAYMENT_METHOD_MAP[pm] ?? Number(pm);
  }
  if (typeof m === "string") return PAYMENT_METHOD_MAP[m] ?? Number(m);
  if (typeof m === "number") return m;
  return NaN;
}

function isProbablyImage(url) {
  if (!url) return false;
  const base = String(url).split("?")[0].toLowerCase();
  return /\.(png|jpe?g|webp|gif|svg)$/i.test(base);
}

function withBust(url, rev) {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(rev ?? Date.now())}`;
}

function sanitizeFileName(s) {
  return String(s || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function guessExt(url, mime) {
  const u = String(url || "").split("?")[0].toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("pdf")) return ".pdf";
  const match = u.match(/\.(png|jpe?g|webp|gif|pdf)$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
}

export default function EmployeeProfile() {
  const { employeeId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [profileErr, setProfileErr] = useState(null);
  const [collapseOpen, setCollapseOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("transactions"); // transactions | salary | work

  const pageDir = useMemo(() => {
    if (typeof document === "undefined") return "rtl";
    const raw =
      document.documentElement?.getAttribute("dir") ||
      document.body?.getAttribute("dir") ||
      "rtl";
    return String(raw).toLowerCase() === "ltr" ? "ltr" : "rtl";
  }, []);

  const [mediaRev, setMediaRev] = useState(0);

  // -------- Work info --------
  const [workModel, setWorkModel] = useState({
    jobTitle: "",
    salaryAmount: "",
    salaryCurrency: Currency.Afn,
    payDay: 1,
    taxes: 0,
    interest: 0,
    notes: "",
    isActive: true,
  });
  const [workSaving, setWorkSaving] = useState(false);

  // -------- Salary payment modal --------
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentModel, setPaymentModel] = useState(null);

  // -------- Manual transaction modal --------
  const [txOpen, setTxOpen] = useState(false);
  const [txBusy, setTxBusy] = useState(false);
  const [txModel, setTxModel] = useState({
    direction: 1,
    amount: "",
    year: "",
    month: "",
  }); // BalanceDirection: In=1, Out=2

  // -------- Media edit pipeline --------
  const fileInputRef = useRef(null);
  const pendingMediaRef = useRef(null); // { kind, title }

  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropTitle, setCropTitle] = useState("");

  // -------- Fingerprint pipeline --------
  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerBusy, setFingerBusy] = useState(false);

  const [salaryTableKey, setSalaryTableKey] = useState(0);
  const [txTableKey, setTxTableKey] = useState(0);

  const refresh = async () => {
    if (!employeeId) return;
    try {
      setProfileErr(null);
      const p = await employeeService.getProfile(employeeId);
      setProfile(p);

      const w = p?.workInfo || p?.WorkInfo;
      setWorkModel({
        jobTitle: w?.jobTitle ?? w?.JobTitle ?? "",
        salaryAmount: w?.salaryAmount ?? w?.SalaryAmount ?? "",
        salaryCurrency: w?.salaryCurrency ?? w?.SalaryCurrency ?? Currency.Afn,
        payDay: w?.payDay ?? w?.PayDay ?? 1,
        taxes: w?.taxes ?? w?.Taxes ?? 0,
        interest: w?.interest ?? w?.Interest ?? 0,
        notes: w?.notes ?? w?.Notes ?? "",
        isActive: (w?.isActive ?? w?.IsActive ?? true) === true,
      });

      // cache-bust for media
      setMediaRev(Date.now());
    } catch (e) {
      setProfileErr(e?.response?.data || e?.message || "خطا");
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const displayName = profile?.displayName ?? profile?.DisplayName ?? "—";
  const fatherName = profile?.fatherName ?? profile?.FatherName ?? "—";
  const active = (profile?.isActive ?? profile?.IsActive ?? true) === true;

  const phonePrimary = profile?.phonePrimary ?? profile?.PhonePrimary ?? "";
  const phoneSecondary = profile?.phoneSecondary ?? profile?.PhoneSecondary ?? "";
  const phonesText = [phonePrimary, phoneSecondary].filter(Boolean).join(" / ") || "—";

  const nationalId = profile?.nationalId ?? profile?.NationalId ?? "—";
  const province = profile?.province ?? profile?.Province ?? "—";
  const district = profile?.district ?? profile?.District ?? "—";
  const addressLine = profile?.addressLine ?? profile?.AddressLine ?? "—";
  const addressFull = profile?.addressFull ?? profile?.AddressFull ?? "—";

  const rawAvatar = profile?.avatarUrl ?? profile?.AvatarUrl ?? "";
  const avatarUrl = rawAvatar ? withBust(normalizeMediaPath(rawAvatar), mediaRev) : null;
  const avatarSrc = avatarUrl && isProbablyImage(avatarUrl) ? avatarUrl : null;

  const rawIdFront = profile?.idFrontUrl ?? profile?.IdFrontUrl ?? "";
  const rawIdBack = profile?.idBackUrl ?? profile?.IdBackUrl ?? "";
  const rawFingerBitmap = profile?.fingerBitmapUrl ?? profile?.FingerBitmapUrl ?? "";

  const idFrontUrl = rawIdFront ? withBust(normalizeMediaPath(rawIdFront), mediaRev) : null;
  const idBackUrl = rawIdBack ? withBust(normalizeMediaPath(rawIdBack), mediaRev) : null;
  const fingerBitmapUrl = rawFingerBitmap ? withBust(normalizeMediaPath(rawFingerBitmap), mediaRev) : null;

  const workActive = workModel?.isActive === true;
  const salaryText =
    workModel?.salaryAmount == null || String(workModel.salaryAmount).trim() === ""
      ? "—"
      : Number(String(workModel.salaryAmount).replace(/[, ]/g, "")).toLocaleString("en-US");

  const cardSpecs = useMemo(
    () => [
      { kind: MediaKind.IdFront, title: "روی - تذکره", get: () => idFrontUrl },
      { kind: MediaKind.IdBack, title: "پشت - تذکره", get: () => idBackUrl },
      { kind: MediaKind.Avatar, title: "عکس پروفایل", get: () => avatarUrl },
      { kind: MediaKind.FingerBitmap, title: "اثر انگشت", get: () => fingerBitmapUrl },
    ],
    [idFrontUrl, idBackUrl, avatarUrl, fingerBitmapUrl],
  );

  const kindToSubfolder = (kind) => {
    if (kind === MediaKind.Avatar) return "avatars";
    if (kind === MediaKind.IdFront) return "id-cards/front";
    if (kind === MediaKind.IdBack) return "id-cards/back";
    if (kind === MediaKind.FingerBitmap) return "fingers";
    return "misc";
  };

  const pickSavedPath = (res) => {
    const x = res?.data ?? res;
    return x?.path ?? x?.Path ?? x?.storageUrl ?? x?.StorageUrl ?? "";
  };

  const openFilePickerFor = (kind, title) => {
    pendingMediaRef.current = { kind, title };
    if (fileInputRef.current) {
      // aynı dosyayı tekrar seçebilmek için
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const onFilePicked = async (e) => {
    const file = e.target?.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(String(reader.result || ""));
      setCropTitle(pendingMediaRef.current?.title || "ویرایش تصویر");
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  };

  async function media_asset_setPrimary_safe(id) {
    try {
      await mediaAssetService.setPrimary(id);
    } catch {
      // bazı projelerde add zaten primary’yi set ediyor olabilir
    }
  }

  const applyLocalProfileMedia = (kind, storageUrl) => {
  setProfile((prev) => {
    if (!prev) return prev;
    const next = { ...prev };
    const u = storageUrl || "";

    if (kind === MediaKind.Avatar) {
      next.avatarUrl = u;  next.AvatarUrl = u;
    } else if (kind === MediaKind.IdFront) {
      next.idFrontUrl = u; next.IdFrontUrl = u;
    } else if (kind === MediaKind.IdBack) {
      next.idBackUrl = u;  next.IdBackUrl = u;
    } else if (kind === MediaKind.FingerBitmap) {
      next.fingerBitmapUrl = u; next.FingerBitmapUrl = u;
    }

    return next;
  });

  // img yeniden yüklensin (query param bust)
  setMediaRev(Date.now());
};


  const saveCroppedAsMedia = async (pngDataUrl) => {
    const pending = pendingMediaRef.current;
    if (!pending?.kind) return;

    try {
      // 1) image save
      const baseFolder = `/storage/employees/${employeeId}`;
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
        OwnerType: OwnerType.Employee,
        OwnerId: employeeId,
        Kind: pending.kind,
        StorageUrl: relativePath,
        HashChecksum: "",
        IsPrimary: true,
        CreatedAt: nowIso(),
      });

      // 3) set primary
      await media_asset_setPrimary_safe(id);
      applyLocalProfileMedia(pending.kind, relativePath);

      // 4) refresh
      await refresh();
    } catch (err) {
      alert(String(err?.response?.data ?? err?.message ?? "خطا"));
    } finally {
      setCropOpen(false);
      pendingMediaRef.current = null;
    }
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
        sanitizeFileName(`کارمند ${displayName} ${fatherName} ${title}`) + ext;

      const a = document.createElement("a");
      const objUrl = URL.createObjectURL(blob);
      a.href = objUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objUrl);
    } catch {
      window.open(url, "_blank");
    }
  };

  // -------- Fingerprint: create -> save bitmap -> media primary -> upsert template --------
  const onFingerprintCompleted = async (payload) => {
    if (!payload || payload.result !== "success" || payload.action !== "create") return;
    if (!payload.mergedTemplateBase64) {
      alert("Template دریافت نشد.");
      return;
    }

    setFingerBusy(true);
    try {
      let relatedMediaId = null;

      // bitmap varsa media olarak kaydet
      if (payload.lastBitmapPngBase64) {
        const folderUrl = `/storage/employees/${employeeId}/fingers`;
        const savedRes = await imageService.saveIfDataUrl({
          photoFolderUrl: folderUrl,
          baseFile: payload.lastBitmapPngBase64,
        });
        const relativePath = pickSavedPath(savedRes);
        if (!relativePath) throw new Error("اثر انگشت ذخیره نشد.");

        const id = guid();
        await mediaAssetService.add({
          Id: id,
          OwnerType: OwnerType.Employee,
          OwnerId: employeeId,
          Kind: MediaKind.FingerBitmap,
          StorageUrl: relativePath,
          HashChecksum: "",
          IsPrimary: true,
          CreatedAt: nowIso(),
        });
        await media_asset_setPrimary_safe(id);
        relatedMediaId = id;
      }

      await employeeService.upsertFingerprint(employeeId, {
        templateBase64: payload.mergedTemplateBase64,
        relatedMediaAssetId: relatedMediaId,
      });

      setFingerOpen(false);
      applyLocalProfileMedia(MediaKind.FingerBitmap, relativePath);
      await refresh();
    } catch (err) {
      alert(String(err?.response?.data ?? err?.message ?? "خطا در ثبت اثر انگشت"));
    } finally {
      setFingerBusy(false);
    }
  };

  // -------- Work info save --------
  const parseNumber = (v) => {
    if (v == null || String(v).trim() === "") return null;
    if (typeof v === "number") return v;
    const n = Number(String(v).replace(/[, ]/g, ""));
    return Number.isFinite(n) ? n : null;
  };

  const handleSaveWorkInfo = async () => {
    try {
      setWorkSaving(true);
      const dto = {
        jobTitle: (workModel.jobTitle || "").trim(),
        salaryAmount: parseNumber(workModel.salaryAmount),
        salaryCurrency: Number(workModel.salaryCurrency) || Currency.Afn,
        payDay: Number(workModel.payDay) || 1,
        taxes: parseNumber(workModel.taxes) ?? 0,
        interest: parseNumber(workModel.interest) ?? 0,
        notes: (workModel.notes || "").trim() || null,
        isActive: !!workModel.isActive,
      };
      await employeeService.upsertWorkInfo(employeeId, dto);
      await refresh();
    } catch (e) {
      alert(String(e?.response?.data ?? e?.message ?? "خطا"));
    } finally {
      setWorkSaving(false);
    }
  };

  // -------- Salary payment --------
  const handleAddSalaryPayment = () => {
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

  const handleSubmitPayment = async (model) => {
    const entryId = guid();
    const method = resolvePaymentMethod(model?.method);

    const amount = parseNumber(model?.amount);
    if (!amount || amount <= 0) {
      alert("مبلغ نامعتبر است.");
      return;
    }
    if (!Number.isFinite(method) || method <= 0) {
      alert("روش پرداخت نامعتبر است.");
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
      ownerId: employeeId,
      amount,
      reference: (model?.reference ?? "").trim() || null,
      description: (model?.description ?? "").trim() || null,
      fingerprintTemplateBase64: fpTemplate,
      fingerprintBitmapPngBase64: fpBitmap,
      currency: Currency.Afn,
      outflowType: OutflowType.EmployeeSalary,
    };

    const r = await dispatch(createPaymentOutflow({ dto: apiDto }));
    if (createPaymentOutflow.rejected.match(r)) {
      alert(String(r.payload ?? "ثبت ناموفق بود"));
      return;
    }

    setPaymentOpen(false);
    setSalaryTableKey((x) => x + 1);
    await refresh();
  };

  // -------- Transactions --------
  const openTxModal = () => {
    setTxModel({ direction: 1, amount: "", year: "", month: "" });
    setTxOpen(true);
  };

  const resolveDirection = (d) => {
    if (d === 1 || d === 2) return d;
    const s = String(d || "").toLowerCase();
    if (s === "in") return 1;
    if (s === "out") return 2;
    const n = Number(d);
    return Number.isFinite(n) ? n : NaN;
  };

  const submitTx = async (payload) => {
    const src = payload ?? txModel;

    const amount = parseNumber(src.amount);
    const direction = resolveDirection(src.direction);

    if (!amount || amount <= 0) {
      alert("مبلغ نامعتبر است.");
      return;
    }
    if (![1, 2].includes(direction)) {
      alert("نوع جریان نامعتبر است.");
      return;
    }

    const year = src.year === "" || src.year == null ? null : Number(src.year);
    const month = src.month === "" || src.month == null ? null : Number(src.month);

    setTxBusy(true);
    try {
      await employeeTransactionService.add({
        employeeId,
        direction,
        amount,
        year: Number.isFinite(year) ? year : null,
        month: Number.isFinite(month) ? month : null,
      });
      setTxOpen(false);
      setTxTableKey((x) => x + 1);
      await refresh();
    } catch (e) {
      alert(String(e?.response?.data ?? e?.message ?? "خطا"));
    } finally {
      setTxBusy(false);
    }
  };

  const deleteTx = async (id) => {
    if (!id) return;
    if (!window.confirm("حذف شود؟")) return;
    try {
      await employeeTransactionService.remove(id);
      setTxTableKey((x) => x + 1);
    } catch (e) {
      alert(String(e?.response?.data ?? e?.message ?? "خطا"));
    }
  };

  // -------- Tables --------
  const salaryColumns = useMemo(
    () => [
      {
        key: "occurredAtUtc",
        header: "تاریخ",
        sortable: true,
        serverField: "OccurredAtUtc",
        render: (v) =>
          v ? convertAfDate(String(v).slice(0, 10), { monthStyle: "name" }) : "—",
      },
      {
        key: "amount",
        header: "مبلغ",
        sortable: true,
        serverField: "Amount",
        align: "end",
        render: (v) => (v == null ? "—" : Number(v).toLocaleString("en-US")),
      },
      { key: "moneyAccountName", header: "حساب", sortable: false },
      { key: "currency", header: "واحد", sortable: false },
      {
        key: "paymentMethod",
        header: "روش",
        sortable: true,
        serverField: "PaymentMethod",
      },
      {
        key: "notes",
        header: "یادداشت",
        sortable: false,
        searchable: true,
        serverField: "Notes",
      },
      {
        key: "moneyEntryId",
        header: "Entry",
        sortable: false,
        render: (v) => (v ? String(v).slice(0, 8) : "—"),
      },
    ],
    [],
  );

  const txColumns = useMemo(
    () => [
      {
        key: "paidAtUtc",
        header: "تاریخ",
        sortable: true,
        serverField: "PaidAtUtc",
        render: (v) =>
          v ? convertAfDate(String(v).slice(0, 10), { monthStyle: "name" }) : "—",
      },
      {
        key: "direction",
        header: "نوع",
        sortable: true,
        serverField: "Direction",
        filterType: "select",
        filterLabel: "نوع",
        filterOptions: [
          { value: "In", label: "دریافت (ورود)" },
          { value: "Out", label: "پرداخت (خروج)" },
        ],
        filterOp: "eq",
        render: (v, r) => {
          const d = r?.direction ?? r?.Direction ?? v;
          if (d === 1 || String(d).toLowerCase() === "in") return "دریافت";
          if (d === 2 || String(d).toLowerCase() === "out") return "پرداخت";
          return "—";
        },
      },
      {
        key: "amount",
        header: "مبلغ",
        sortable: false,
        serverField: "Amount",
        align: "end",
        filterType: "numberRange",
        filterLabel: "با مبلغ",
        minPlaceholder: "حداقل مبلغ",
        maxPlaceholder: "حداکثر مبلغ",
        render: (v) => (v != null ? Number(v).toLocaleString("en-US") : "—"),
      },
      {
        key: "year",
        header: "سال",
        sortable: true,
        serverField: "Year",
        render: (v) => (v != null ? String(v) : "—"),
      },
      {
        key: "month",
        header: "ماه",
        sortable: true,
        serverField: "Month",
        render: (v) => (v != null ? String(v) : "—"),
      },
      {
        key: "actions",
        header: "",
        sortable: false,
        render: (_v, r) => (
          <Button
            title="حذف"
            onClick={() => deleteTx(r?.id ?? r?.Id)}
            type="button"
            primaryColor={"var(--role-danger-bg)"}
            iconOnly
            icon={Trash2}
          />
        ),
      },
    ],
    [],
  );

  return (
    <div className="empProfileRoot" dir={pageDir}>
      <div className="empHeader">
        <div className="empHeaderLeft">
          <div className="empAvatar" style={{ "--avatar-size": collapseOpen ? "64px" : "44px" }}>
            {avatarSrc ? (
              <img className="empAvatarImg" src={avatarSrc} alt="avatar" />
            ) : (
              <div className="empAvatarPlaceholder" />
            )}
          </div>

          <div className="empTitleBlock">
            <div className="empNameRow">
              <div className="empName">{displayName}</div>
              <span className={`empStatusPill ${active ? "ok" : "bad"}`}>
                {active ? "فعال" : "غیرفعال"}
              </span>
              {workActive ? (
                <span className="empRolePill ok">معاش فعال</span>
              ) : (
                <span className="empRolePill">معاش غیرفعال</span>
              )}
            </div>
            <div className="empSub">{fatherName}</div>
          </div>
        </div>

        <div className="empHeaderRight">
          <div className="empBalance">
            <div className="amount">{salaryText}</div>
            <div className="caption">معاش</div>
          </div>
          <Button
            size="lg"
            icon={collapseOpen ? ChevronsUp : ChevronsDown}
            ariaLabel={collapseOpen ? "بستن" : "باز کردن"}
            iconOnly
            onClick={() => setCollapseOpen((x) => !x)}
            className="collapse-btn"
            primaryColor="var(--role-secondary-bg)"
          />
        </div>
      </div>

      {profileErr && <div className="empError">{String(profileErr)}</div>}

      <div className={`empCollapseBody ${collapseOpen ? "open" : ""}`}>
        <div className="empInfoGrid">
          <div>
            <InfoRow label="نام">{displayName}</InfoRow>
            <InfoRow label="نام پدر">{fatherName}</InfoRow>
            <InfoRow label="شماره های تماس">{phonesText}</InfoRow>
            <InfoRow label="نمبر تذکره">{nationalId}</InfoRow>
          </div>
          <div>
            <InfoRow label="ولایت">{province}</InfoRow>
            <InfoRow label="ولسوالی">{district}</InfoRow>
            <InfoRow label="آدرس">{addressLine}</InfoRow>
            <InfoRow label="آدرس کامل">{addressFull}</InfoRow>
          </div>
        </div>

        {/* MEDIA GRID (FamilyMemberProfile ile aynı davranış) */}
        <div className="tenantMediaGrid" style={{ "--media-cols": 4 }}>
          {cardSpecs.map((c) => {
            const url = c.get();
            const canImg = url && isProbablyImage(url);

            return (
              <div className="tenantMediaCard" key={c.kind}>
                <div className="tenantMediaBox">
                  {canImg ? <img src={url} alt={c.title} loading="lazy" /> : <div className="tenantMediaPh">—</div>}
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
                        onClick={() => openFilePickerFor(c.kind, c.title)}
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onFilePicked}
      />

      <div className="empTabs">
        <TabBtn active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")}>
          جریان‌ها
        </TabBtn>
        <TabBtn active={activeTab === "salary"} onClick={() => setActiveTab("salary")}>
          پرداخت‌های معاش
        </TabBtn>
        <TabBtn active={activeTab === "work"} onClick={() => setActiveTab("work")}>
          وظیفه و معاش
        </TabBtn>
      </div>

      {activeTab === "work" && (
        <div className="empCard">
          <div className="empFormGrid">
            <Input
              label="وظیفه"
              value={workModel.jobTitle}
              onChange={(v) => setWorkModel((s) => ({ ...s, jobTitle: v }))}
              placeholder="..."
            />

            <Input
              type="number"
              label="معاش"
              value={workModel.salaryAmount}
              onChange={(v) => setWorkModel((s) => ({ ...s, salaryAmount: v }))}
              placeholder="0"
            />

            <Input
              type="number"
              label="روز پرداخت"
              value={workModel.payDay}
              onChange={(v) => setWorkModel((s) => ({ ...s, payDay: v }))}
              placeholder="1"
            />

            <Input
              type="number"
              label="مالیات"
              value={workModel.taxes}
              onChange={(v) => setWorkModel((s) => ({ ...s, taxes: v }))}
              placeholder="0"
            />

            <Input
              type="number"
              label="ماکولات"
              value={workModel.interest}
              onChange={(v) => setWorkModel((s) => ({ ...s, interest: v }))}
              placeholder="0"
            />

            <Input
              label="یادداشت"
              value={workModel.notes}
              onChange={(v) => setWorkModel((s) => ({ ...s, notes: v }))}
              multiline
              rows={2}
              placeholder="..."
            />

            <div className="empFieldInline">
              <label>وضعیت</label>
              <input
                type="checkbox"
                checked={!!workModel.isActive}
                onChange={(e) => setWorkModel((s) => ({ ...s, isActive: e.target.checked }))}
              />
              <span>{workModel.isActive ? "فعال" : "غیرفعال"}</span>
            </div>
          </div>

          <div className="empFormActions">
            <Button onClick={handleSaveWorkInfo} disabled={workSaving}>
              ذخیره
            </Button>
          </div>
        </div>
      )}

      {activeTab === "salary" && (
        <div>
          <CustomTableV2
            key={salaryTableKey}
            columns={salaryColumns}
            toolbarTitle="پرداخت‌های معاش"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={520}
            showSearchBar
            showAddButton
            addButtonLabel="پرداخت معاش"
            onAddClick={handleAddSalaryPayment}
            fetcher={async (q) => {
              const data = await employeeService.getSalaryPayments(employeeId, q);
              return data?.items ? data : data;
            }}
          />
        </div>
      )}

      {activeTab === "transactions" && (
        <div>
          <CustomTableV2
            key={txTableKey}
            columns={txColumns}
            toolbarTitle="جریان‌های ورود و خروج"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={520}
            showAddButton
            addButtonLabel="ثبت جریان"
            onAddClick={openTxModal}
            showSearchBar
            fetcher={async (q) => {
              const data = await employeeTransactionService.getByEmployee(employeeId, q);
              return data?.items ? data : data;
            }}
          />
        </div>
      )}

      {paymentOpen && (
        <PaymentModal
          open={paymentOpen}
          value={paymentModel}
          currencyLabel="؋"
          onChange={setPaymentModel}
          onClose={() => setPaymentOpen(false)}
          onSubmit={handleSubmitPayment}
          title="پرداخت معاش"
          hint={`${displayName} | پرداخت از حساب پیش‌فرض`}
        />
      )}

      {cropOpen && (
        <ImageCropModal
          open={cropOpen}
          title={cropTitle}
          src={cropSrc}
          onClose={() => {
            setCropOpen(false);
            pendingMediaRef.current = null;
          }}
          onCropped={saveCroppedAsMedia}
        />
      )}

      {/* Fingerprint modal (FIXED: mode + onCompleted) */}
      <FingerModal
        open={fingerOpen}
        mode="create"
        verbose={false}
        autoCloseOnSuccess={true}
        successCloseDelay={900}
        onClose={() => (fingerBusy ? null : setFingerOpen(false))}
        onCompleted={onFingerprintCompleted}
      />

      <TxFlowModal
        open={txOpen}
        busy={txBusy}
        disabled={false}
        value={txModel}
        onChange={setTxModel}
        onClose={() => (!txBusy ? setTxOpen(false) : null)}
        onSubmit={submitTx}
        title="ثبت جریان"
        hint="نوع جریان و مبلغ را مشخص کنید."
      />
    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="empInfoRow">
      <div className="empInfoLabel">{label}</div>
      <div className="empInfoValue">{children}</div>
    </div>
  );
}

function TabBtn({ active, onClick, children }) {
  return (
    <button className={`empTab ${active ? "is-active" : ""}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}
