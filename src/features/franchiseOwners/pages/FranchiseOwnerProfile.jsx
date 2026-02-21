import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";

import "../styles/FranchiseOwnerProfile.css";

import Button from "../../../shared/components/Button";
import CustomTable from "../../../shared/components/CustomTable";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import PaymentModal from "../../../shared/components/Payment/PaymentModal";
import ServerReportModal from "../../../shared/reporting/ServerReportModal";

import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { normalizeMediaPath } from "../../../shared/utils/normalizeMediaPath";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import { api, getTokens } from "../../../shared/services/apiClient";

import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal";
import FingerModal from "../../fingerprint/Model/fingerModel";

import { imageService } from "../../images/services/imageService";
import { mediaAssetService } from "../../mediaAsset/services/mediaAssetService";

import { fetchOwnerProfile } from "../slices/franchiseOwnerSlice";
import { selectOwnerProfile, selectOwnerProfileMeta } from "../selectors/franchiseOwnerSelectors";

import { fetchFranchiseOwnerShops } from "../../shops/slices/shopSlice";
import { selectOwnerShops, selectOwnerShopsStatus, selectOwnerShopsError } from "../../shops/selectors/shopSelectors";

import { fetchFranchiseBalanceEntryDetails } from "../slices/franchiseBalanceEntrySlice";
import { createPaymentOutflow } from "../../paymentOutflow/slices/paymentOutflowSlice";

import { uploadContractAndSaveMedia } from "../../files/slices/filesSlice";

import { OwnerType, MediaKind, guid, nowIso } from "../../../shared/person/onboardConstants";

import { ChevronsDown, ChevronsUp, Download, Edit, Fingerprint } from "lucide-react";

/* ---------------- Consts ---------------- */
const OutflowType = { FranchiseOwnerPayout: 1 };
const Currency = { Afn: 1, Usd: 2 };
const PAYMENT_METHOD_MAP = { cash: 1, bank: 2, transfer: 2 };

  const paymentMethodLabels = {
    0: "نامشخص",
    1: "نقده حضوری",
    2: "ازطریق بانک",
    3: "از طریق حواله",
  };

const sanitizeFileName = (s) =>
  String(s || "")
    .replace(/[\\/:*?"<>|]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const guessExt = (url, mime) => {
  const u = String(url || "").split("?")[0].toLowerCase();
  const m = String(mime || "").toLowerCase();
  if (m.includes("png")) return ".png";
  if (m.includes("jpeg") || m.includes("jpg")) return ".jpg";
  if (m.includes("webp")) return ".webp";
  if (m.includes("pdf")) return ".pdf";
  const match = u.match(/\.(png|jpe?g|webp|gif|pdf)$/i);
  return match ? `.${match[1].toLowerCase()}` : "";
};

const isProbablyImage = (url) => {
  if (!url) return false;
  try {
    const base = String(url).split("?")[0].toLowerCase();
    return /\.(png|jpe?g|webp|gif|svg)$/i.test(base);
  } catch {
    return false;
  }
};

const fmtMoney = (n) => (n || n === 0 ? Number(n).toLocaleString("en-US") : "—");

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

const pickSavedPath = (res) => {
  const x = res?.data ?? res;
  return x?.Path ?? x?.path ?? x?.storageUrl ?? x?.url ?? "";
};

const kindToSubfolder = (kind) => {
  switch (kind) {
    case MediaKind.Avatar:
      return "avatars";
    case MediaKind.IdFront:
      return "id-cards/front";
    case MediaKind.IdBack:
      return "id-cards/back";
    case MediaKind.FingerBitmap:
      return "fingers";
    case MediaKind.FranchiseContract:
      return "contracts";
    default:
      return "misc";
  }
};

async function safeSetPrimary(id) {
  try {
    await mediaAssetService.setPrimary(id);
  } catch {
    // bazı projelerde add zaten primary set ediyor olabilir
  }
}

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

/* ---------------- Component ---------------- */
export default function FranchiseOwnerProfile() {
  const { ownerId, id } = useParams();
  const resolvedId = ownerId || id;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { show, hide } = useGlobalLoading();

  const profile = useSelector(selectOwnerProfile);
  const profileMeta = useSelector(selectOwnerProfileMeta);

  const items = useSelector(selectOwnerShops);
  const shopsStatus = useSelector(selectOwnerShopsStatus);
  const shopsError = useSelector(selectOwnerShopsError);

  const [open, setOpen] = useState(false);

  // report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const handleSelectedReport = (selectedRows) => {
    setReportRows(Array.isArray(selectedRows) ? selectedRows : []);
    setReportOpen(true);
  };

  // payment
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentModel, setPaymentModel] = useState({
    method: null,
    amount: "",
    reference: "",
    description: "",
    fingerprintTemplateBase64: "",
    fingerprintBitmapPngBase64: "",
  });

  const [summary, setSummary] = useState(null);

  // fingerprint modal
  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerBusy, setFingerBusy] = useState(false);

  // image crop modal
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropTitle, setCropTitle] = useState("");

  // pickers
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  // which media is being updated
  const pendingMediaRef = useRef(null); // { kind, title, isPdf }

  // load profile
  useEffect(() => {
    if (!resolvedId) return;
    dispatch(fetchOwnerProfile(resolvedId));
  }, [dispatch, resolvedId]);

  // load shops once on expand
  const shopsLoadedOnce = useRef(false);
  useEffect(() => {
    if (!open || !resolvedId || shopsLoadedOnce.current) return;
    shopsLoadedOnce.current = true;
    dispatch(fetchFranchiseOwnerShops(resolvedId)).catch(() => {});
  }, [open, resolvedId, dispatch]);

  // global loading
  useEffect(() => {
    const isLoading = profileMeta?.status === "loading" || shopsStatus === "loading";
    if (isLoading) show();
    else hide();
    return () => hide();
  }, [profileMeta?.status, shopsStatus, show, hide]);

  // derived
  const displayName = profile?.DisplayName ?? profile?.displayName ?? "—";
  const fatherName = profile?.FatherName ?? profile?.fatherName ?? "";

  const genderText = useMemo(() => {
    const g = profile?.Gender ?? profile?.gender;
    if (typeof g === "number") return g === 1 ? "مرد" : "زن";
    if (typeof g === "string") {
      const s = g.trim().toLowerCase();
      if (["1", "m", "male", "erkek"].includes(s)) return "مرد";
      if (["2", "f", "female", "kadin", "kadın"].includes(s)) return "زن";
    }
    return g || "—";
  }, [profile]);

  const balanceRaw = profile?.Balance ?? profile?.balance ?? 0;
  const balanceFmt =
    typeof balanceRaw === "number"
      ? balanceRaw.toLocaleString("en-US", { minimumFractionDigits: 2 })
      : fmtMoney(balanceRaw);

      const [mediaRev, setMediaRev] = useState(0);
      // cache bust (aynı media güncellendiğinde tarayıcı cache'ini kırmak için)
      const withBust = (url, rev) => {
        if (!url) return url;
        const sep = url.includes("?") ? "&" : "?";
        return `${url}${sep}v=${encodeURIComponent(rev ?? Date.now())}`;
      };



  const rawAvatar = profile?.AvatarUrl || profile?.avatarUrl;
  const avatarUrl = rawAvatar ? withBust(normalizeMediaPath(rawAvatar), mediaRev) : null;
  const avatarSrc = avatarUrl && isProbablyImage(avatarUrl) ? avatarUrl : null;

  // media specs (profile keys)
  const mediaCards = useMemo(
    () => [
      { kind: MediaKind.IdFront, key: "IdFrontUrl", title: "روی - تذکره", isPdf: false, isFinger: false },
      { kind: MediaKind.IdBack, key: "IdBackUrl", title: "پشت - تذکره", isPdf: false, isFinger: false },
      { kind: MediaKind.Avatar, key: "AvatarUrl", title: "عکس پروفایل", isPdf: false, isFinger: false },
      { kind: MediaKind.FingerBitmap, key: "FingerBitmapUrl", title: "اثر انگشت", isPdf: false, isFinger: true },
      { kind: MediaKind.FranchiseContract, key: "ContractUrl", title: "قرارداد امتیاز", isPdf: true, isFinger: false },
    ],
    []
  );

  /* ---------------- Media ops (no duplication) ---------------- */

  const baseFolder = useMemo(() => (resolvedId ? `/storage/franchise-owners/${resolvedId}` : ""), [resolvedId]);

  const addPrimaryMedia = useCallback(
    async ({ kind, storageUrl, isPrimary = true }) => {
      const dto = {
        id: guid(),
        ownerType: OwnerType.FranchiseOwner,
        ownerId: resolvedId,
        kind,
        storageUrl,
        hashChecksum: "",
        isPrimary,
        createdAt: nowIso(),
      };

      await mediaAssetService.add(dto);
      if (isPrimary) await safeSetPrimary(dto.id);
      return dto.id;
    },
    [resolvedId]
  );

  // const refreshProfile = useCallback(() => {
  //   if (!resolvedId) return;
  //   dispatch(fetchOwnerProfile(resolvedId));
  // }, [dispatch, resolvedId]);

  const refreshProfile = useCallback(() => {
  if (!resolvedId) return;
  dispatch(fetchOwnerProfile(resolvedId));
  setMediaRev(Date.now());
}, [dispatch, resolvedId]);


  const downloadMedia = useCallback(
    async (url, title) => {
      if (!url) return;
      try {
        const token = getTokens()?.accessToken;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const blob = await res.blob();
        const ext = guessExt(url, blob.type);
        const fileName = sanitizeFileName(`صاحب امتیاز ${displayName} ${fatherName} ${title}`) + ext;

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
    },
    [displayName, fatherName]
  );

  const openPickerFor = useCallback((kind, title, isPdf) => {
    pendingMediaRef.current = { kind, title, isPdf: !!isPdf };

    if (isPdf) {
      if (pdfInputRef.current) {
        pdfInputRef.current.value = "";
        pdfInputRef.current.click();
      }
      return;
    }

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
      imageInputRef.current.click();
    }
  }, []);

  // image picked -> crop
  const onPickedImageFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const pending = pendingMediaRef.current;
    if (!pending?.kind || pending?.isPdf) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      setCropTitle(pending.title || "تصویر");
      setCropSrc(dataUrl);
      setCropOpen(true);
    } catch {
      pendingMediaRef.current = null;
    }
  }, []);

  // crop saved -> save image to folder + add media asset
  const saveCroppedAsMedia = useCallback(
    async (pngDataUrl) => {
      const pending = pendingMediaRef.current;
      if (!resolvedId || !pending?.kind || pending?.isPdf) {
        setCropOpen(false);
        pendingMediaRef.current = null;
        return;
      }

      try {
        const folderUrl = `${baseFolder}/${kindToSubfolder(pending.kind)}`;

        const savedRes = await imageService.saveIfDataUrl({
          photoFolderUrl: folderUrl,
          baseFile: pngDataUrl,
        });

        const relativePath = pickSavedPath(savedRes);
        if (!relativePath) throw new Error("تصویر ذخیره نشد.");

        await addPrimaryMedia({ kind: pending.kind, storageUrl: relativePath, isPrimary: true });

        setCropOpen(false);
        pendingMediaRef.current = null;
        refreshProfile();
      } catch (err) {
        setCropOpen(false);
        pendingMediaRef.current = null;
        alert(String(err?.response?.data ?? err?.message ?? "خطا"));
      }
    },
    [addPrimaryMedia, baseFolder, refreshProfile, resolvedId]
  );

  // pdf picked -> upload + link media asset (thunk handles add)
  const onPickedPdfFile = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const pending = pendingMediaRef.current;
      if (!resolvedId || !pending?.isPdf || pending.kind !== MediaKind.FranchiseContract) return;

      try {
        const folderUrl = `${baseFolder}/${kindToSubfolder(MediaKind.FranchiseContract)}`;

        const r = await dispatch(
          uploadContractAndSaveMedia({
            file,
            ownerId: resolvedId,
            folderUrl,
            ownerType: OwnerType.FranchiseOwner,
            kind: MediaKind.FranchiseContract,
            isPrimary: true,
            createdAt: nowIso(),
          })
        );

        if (uploadContractAndSaveMedia.rejected.match(r)) {
          alert(String(r.payload || "قرارداد آپلود نشد."));
          return;
        }

        pendingMediaRef.current = null;
        refreshProfile();
      } catch (err) {
        alert(String(err?.response?.data ?? err?.message ?? "خطا"));
      }
    },
    [baseFolder, dispatch, refreshProfile, resolvedId]
  );

  // fingerprint completed -> save bitmap + upsert template
  const onFingerprintCompleted = useCallback(
    async (payload) => {
      if (!resolvedId) return;
      if (!payload || payload.result !== "success" || payload.action !== "create") return;

      const mergedTemplateBase64 = payload.mergedTemplateBase64;
      const bitmapPng = payload.lastBitmapPngBase64;

      if (!mergedTemplateBase64) {
        alert("Template دریافت نشد.");
        return;
      }

      setFingerBusy(true);
      try {
        let relatedMediaAssetId = null;

        // 1) save bitmap -> /fingers
        if (bitmapPng) {
          const folderUrl = `${baseFolder}/${kindToSubfolder(MediaKind.FingerBitmap)}`;

          const savedRes = await imageService.saveIfDataUrl({
            photoFolderUrl: folderUrl,
            baseFile: bitmapPng,
          });

          const relativePath = pickSavedPath(savedRes);
          if (!relativePath) throw new Error("اثر انگشت ذخیره نشد.");

          relatedMediaAssetId = await addPrimaryMedia({
            kind: MediaKind.FingerBitmap,
            storageUrl: relativePath,
            isPrimary: true,
          });
        }

        // 2) template upsert (C# tarafında endpoint olacak: POST /api/FranchiseOwners/{id}/fingerprint)
        await api.post(`/api/FranchiseOwners/${resolvedId}/fingerprint`, {
          templateBase64: mergedTemplateBase64,
          relatedMediaAssetId,
        });

        setFingerOpen(false);
        refreshProfile();
      } catch (err) {
        alert(String(err?.response?.data ?? err?.message ?? "خطا در ثبت اثر انگشت"));
      } finally {
        setFingerBusy(false);
      }
    },
    [addPrimaryMedia, baseFolder, refreshProfile, resolvedId]
  );

  /* ---------------- Shops table ---------------- */

  const statusBadge = (s) => {
    switch (s) {
      case 0:
        return {
          text: "پیش‌نویس",
          cls: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200",
        };
      case 1:
        return {
          text: "فعال",
          cls: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
        };
      case 2:
        return {
          text: "معلق",
          cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
        };
      case 3:
        return {
          text: "پایان‌یافته",
          cls: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
        };
      default:
        return {
          text: "نامشخص",
          cls: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
        };
    }
  };

  // unique per shop, prefer latest SignedOn/StartDate
  const tableRows = useMemo(() => {
    const byShop = new Map();
    const score = (x) => {
      const so = x?.contractSignedOn ?? x?.SignedOn;
      const sd = x?.contractStartDate ?? x?.StartDate;
      const s1 = so ? Date.parse(so) : -Infinity;
      const s0 = sd ? Date.parse(sd) : -Infinity;
      return Math.max(s1, s0);
    };

    for (const sh of items || []) {
      const sid = sh?.shopId ?? sh?.ShopId;
      if (!sid) continue;
      const key = String(sid);
      const curr = byShop.get(key);
      if (!curr || score(sh) > score(curr)) byShop.set(key, sh);
    }

    return Array.from(byShop.values()).map((sh) => ({
      id: `shop-${String(sh.shopId ?? sh.ShopId)}`,
      tenantName: sh.tenantName ?? sh.TenantName ?? "—",
      marketName: sh.marketName ?? sh.MarketName ?? "—",
      floorName: sh.floorName ?? sh.FloorName ?? "—",
      shopName: sh.shopName ?? sh.ShopName ?? "—",
      marketId: sh.marketId ?? sh.MarketId ?? null,
      floorId: sh.floorId ?? sh.FloorId ?? null,
      sharePercent: typeof (sh.sharePercent ?? sh.SharePercent) === "number" ? sh.sharePercent ?? sh.SharePercent : null,
      dueDayOfMonth: sh.dueDayOfMonth ?? sh.DueDay ?? null,
      myPortionAmount: sh.myPortionAmount ?? sh.MyPortionAmount,
      totalFranchisePortionAmount: sh.totalFranchisePortionAmount ?? sh.TotalFranchisePortionAmount,
      contractStartDate: sh.contractStartDate ?? sh.StartDate ?? null,
      contractEndDate: sh.contractEndDate ?? sh.EndDate ?? null,
      contractSignedOn: sh.contractSignedOn ?? sh.SignedOn ?? null,
      status: sh.status ?? sh.Status,
      shopName2: sh.shopName ?? sh.ShopName,
    }));
  }, [items]);

  const columns = useMemo(
    () => [
      { key: "tenantName", header: "کرایه‌دار", sortable: true, searchable: true, minWidth: 220, type: "text" },
      {
        key: "marketName",
        header: "مارکت",
        sortable: true,
        width: 160,
        type: "text",
        primaryFilter: true,
        filterValue: (row) => row.marketId,
      },
      {
        key: "floorName",
        header: "طبقه",
        sortable: true,
        width: 140,
        type: "text",
        secondaryFilter: true,
        filterValue: (row) => row.floorId,
        filterParentValue: (row) => row.marketId,
      },
      { key: "shopName", header: "نام دکان", sortable: true, width: 120, type: "text" },
      {
        key: "sharePercent",
        header: "سهم (%)",
        sortable: true,
        align: "right",
        width: 100,
        type: "number",
        render: (v) => (typeof v === "number" ? `${v}%` : "—"),
      },
      {
        key: "myPortionAmount",
        header: "سهم من",
        sortable: true,
        align: "end",
        width: 140,
        type: "number",
        render: (v) => fmtMoney(v),
      },
      {
        key: "dueDayOfMonth",
        header: "موعد (روز)",
        sortable: true,
        align: "center",
        width: 110,
        type: "number",
      },
      {
        key: "status",
        header: "وضعیت",
        sortable: true,
        align: "center",
        width: 120,
        render: (v) => {
          const s = statusBadge(v);
          return (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium ${s.cls}`}>
              {s.text}
            </span>
          );
        },
      },
    ],
    []
  );

  /* ---------------- Balance Table ---------------- */
  const BalanceColumns = useMemo(
    () => [
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
          { value: "cash", label: "نقده حضوری"},
          { value: "bank", label: "ازطریق بانک"},
          { value: "transfer", label: "از طریق حواله"},
        ],
        filterOp: "eq",
      },
      {
        key: "directionLabel",
        header: "نوع",
        sortable: true,
        serverField: "Direction",
        render: (_v, r) => r?.directionLabel || r?.DirectionLabel || "—",
        filterType: "select",
        filterLabel: "نوع جریان",
        filterOptions: [
          { value: "In", label: "دریافت (ورود به حساب)" },
          { value: "Out", label: "پرداخت (خروج از حساب)" },
        ],
        filterOp: "eq",
      },
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
      { key: "referenceNo", header: "رپرانس", sortable: false, serverField: "ReferenceNo", searchable: true },
      {
        key: "createdByUserName",
        header: "ثبت‌ کننده",
        sortable: true,
        serverField: "CreatedByUserName",
        searchable: true,
        filterType: "text",
        filterLabel: "ثبت‌ کننده",
        filterPlaceholder: "جستجو در نام ثبت‌ کننده...",
        filterOp: "contains",
      },
      {
        key: "createdAtUtc",
        header: "تاریخ ثبت",
        sortable: true,
        serverField: "CreatedAtUtc",
        render: (value) => (value ? convertAfDate(value, { monthStyle: "name" }) : "—"),
        filterType: "dateRange",
        filterLabel: "بازه تاریخ ثبت",
        fromPlaceholder: "از تاریخ...",
        toPlaceholder: "تا تاریخ...",
      },
      { key: "notes", header: "یادداشت", sortable: false, visible: true, searchable: true },
    ],
    []
  );

  /* ---------------- Payment handlers ---------------- */
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

  const handleSubmitPayment = async (model) => {
    const entryId = guid();
    const method = resolvePaymentMethod(model?.method);

    if (!resolvedId) {
      console.error("ownerId yok.");
      return;
    }
    if (!Number.isFinite(method) || method <= 0) {
      console.error("روش پرداخت نامعتبر است.");
      return;
    }

    const amount =
      model?.amount == null || String(model.amount).trim() === ""
        ? null
        : Number(String(model.amount).replace(/[, ]/g, ""));

    if (!amount || amount <= 0) {
      console.error("مبلغ نامعتبر است.");
      return;
    }

    const fpTemplate = model?.fingerprintTemplateBase64 || null;
    const fpBitmap = model?.fingerprintBitmapPngBase64 || null;
    const hasAnyFp = !!fpTemplate || !!fpBitmap;

    if (hasAnyFp && (!fpTemplate || !fpBitmap)) {
      console.error("اگر اثرانگشت ارسال می‌شود، هم تصویر و هم قالب الزامی است.");
      return;
    }

    const apiDto = {
      entryId,
      method,
      ownerId: resolvedId,
      amount,
      reference: (model?.reference ?? "").trim() || null,
      description: (model?.description ?? "").trim() || null,
      fingerprintTemplateBase64: fpTemplate,
      fingerprintBitmapPngBase64: fpBitmap,
      currency: Currency.Afn,
      outflowType: OutflowType.FranchiseOwnerPayout,
    };

    const r = await dispatch(createPaymentOutflow({ dto: apiDto }));
    if (createPaymentOutflow.rejected.match(r)) {
      console.error("ثبت ناموفق بود:", r.payload);
      return;
    }

    setPaymentOpen(false);
    refreshProfile();
  };

  /* ---------------- Render ---------------- */
  return (
    <div className="owner-profile" dir="rtl">
      {/* hidden inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={onPickedImageFile}
      />
      <input
        ref={pdfInputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={onPickedPdfFile}
      />

      {/* crop modal */}
      <ImageCropModal
        open={cropOpen}
        src={cropSrc}
        title={cropTitle}
        onClose={() => {
          setCropOpen(false);
          pendingMediaRef.current = null;
        }}
        onCropped={saveCroppedAsMedia}
      />

      {/* fingerprint modal */}
      <FingerModal
        open={fingerOpen}
        mode="create"
        verbose={false}
        autoCloseOnSuccess={true}
        successCloseDelay={900}
        onClose={() => (fingerBusy ? null : setFingerOpen(false))}
        onCompleted={onFingerprintCompleted}
      />

      {/* HEADER */}
      <div className="owner-header">
        <div className="left-cluster">
          <div className="avatar" style={{ "--avatar-size": open ? "88px" : "44px" }}>
            {avatarSrc ? <img src={avatarSrc} alt="Avatar" className="avatar-img" /> : <div className="avatar-placeholder" />}
          </div>
          <div className="title-block">
            <div className="name">{displayName}</div>
            <div className="father">{fatherName ? `فرزند ${fatherName}` : "—"}</div>
          </div>
        </div>

        <div className="right-cluster">
          <div className="balance">
            <div className="amount">{balanceFmt}</div>
            <div className="caption">باقیه موجود</div>
          </div>

          <Button className="btn-add-shop" onClick={() => navigate(`/shop-assign/${resolvedId}`)}>
            دکان جدید
          </Button>

          <Button
            size="lg"
            icon={open ? ChevronsUp : ChevronsDown}
            ariaLabel={open ? "بستن" : "باز کردن"}
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
            <InfoRow label="نام">
              {(profile?.DisplayName || profile?.displayName || "—") +
                (profile?.FatherName || profile?.fatherName ? ` فرزند ${profile?.FatherName || profile?.fatherName}` : "")}
            </InfoRow>
            <InfoRow label="شماره های تماس">
              {[profile?.PhonePrimary || profile?.phonePrimary, profile?.PhoneSecondary || profile?.phoneSecondary]
                .filter(Boolean)
                .join(" / ") || "—"}
            </InfoRow>
            <InfoRow label="نمبر تذکره">{profile?.NationalId || profile?.nationalId || "—"}</InfoRow>
            <InfoRow label="جنسیت">{genderText}</InfoRow>
          </div>

          <div className="col">
            <InfoRow label="ولایت">{profile?.Province || profile?.province || "—"}</InfoRow>
            <InfoRow label="ولسوالی">{profile?.District || profile?.district || "—"}</InfoRow>
            <InfoRow label="آدرس دقیق">{profile?.AddressLine || profile?.addressLine || "—"}</InfoRow>
            <InfoRow label="توضیحات">{profile?.Description || profile?.description || "—"}</InfoRow>
          </div>
        </div>

        {/* MEDIA GRID */}
<div className="tenantMediaGrid">
  {mediaCards.map((c) => {
    const raw = profile?.[c.key] ?? profile?.[c.key.charAt(0).toLowerCase() + c.key.slice(1)];
    const url = raw ? withBust(normalizeMediaPath(raw), mediaRev) : null;
    const canImg = url && isProbablyImage(url);

    return (
      <div className="tenantMediaCard" key={c.key}>
        <div className="tenantMediaBox">
          {c.isPdf ? (
            <div className="tenantMediaPh">PDF</div>
          ) : canImg ? (
            <img src={url} alt={c.title} loading="lazy" />
          ) : (
            <div className="tenantMediaPh">—</div>
          )}
        </div>

        <div className="tenantMediaFooter">
          <div className="tenantMediaTitle">{c.title}</div>

          <div className="tenantMediaActions">
            {c.isFinger ? (
              <Button
                size="sm"
                iconOnly
                icon={Fingerprint}
                disabled={fingerBusy}
                onClick={() => setFingerOpen(true)}
                primaryColor="var(--role-secondary-bg)"
              />
            ) : (
              <Button
                size="sm"
                iconOnly
                icon={Edit}
                onClick={() => openPickerFor(c.kind, c.title, c.isPdf)}
                primaryColor="var(--role-secondary-bg)"
              />
            )}

            <Button
              size="sm"
              icon={Download}
              iconOnly
              disabled={!url}
              onClick={() => url && downloadMedia(url, c.title)}
              primaryColor="var(--role-primary-bg)"
            />
          </div>
        </div>
      </div>
    );
  })}
</div>


        {/* SHOPS TABLE */}
        <section className="owner-contracts mt-6">
          <CustomTable
            columns={columns}
            data={tableRows}
            loading={shopsStatus === "loading"}
            stickyFirstCol
            initialDensity="compact"
            initialPageSize={25}
            toolbarTitle={null}
            emptyMessage={shopsError ? `خطا: ${shopsError}` : "هیچ ریکاردی یافت نشد."}
            rowKey={(r) => String(r.id)}
          />
        </section>
      </div>

      {profileMeta?.status === "loading" && <div className="loading">در حال بارگیری…</div>}
      {profileMeta?.error && <div className="error">خطا: {profileMeta.error}</div>}

      {summary && (
        <div className={`balanceHeader ${summary.balance < 0 ? "neg" : "pos"}`}>
          <div className="bhLeft">
            <div className="bhTitle">خلاصه مالی</div>
            <div className="bhSub">بر اساس فیلترهای فعلی</div>
          </div>

          <div className="bhRight">
            <div className="bhCard in">
              <div className="bhLabel">مجموع (ورود به حساب)</div>
              <div className="bhValue">{summary.totalIn}</div>
            </div>

            <div className="bhCard out">
              <div className="bhLabel">مجموع (خروج از حساب)</div>
              <div className="bhValue">{summary.totalOut}</div>
            </div>

            <div className="bhCard balance">
              <div className="bhLabel">باقی‌مانده</div>
              <div className="bhValue bhBalanceValue">{summary.balance}</div>
            </div>
          </div>
        </div>
      )}

      {/* BALANCE TABLE */}
      <section>
        <CustomTableV2
          columns={BalanceColumns}
          toolbarTitle="جزئیات بیلانس صاحب امتیاز"
          transport="legacy"
          initialPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          maxBodyHeight={520}
          showAddButton={true}
          addButtonLabel="پرداخت جدید"
          onAddClick={handleAddPayment}
          showSearchBar={false}
          selectable
          onSelectedClick={handleSelectedReport}
          fetcher={async (q) => {
            const action = await dispatch(fetchFranchiseBalanceEntryDetails({ queryOptions: q, ownerId: resolvedId }));
            if (action.error) throw new Error(action.payload || action.error.message || "خطا");

            const data = action.payload?.res?.data ?? action.payload?.res;
            if (data?.summary) setSummary(data.summary);
            return data?.page ?? data;
          }}
        />
      </section>

      {/* Payment Modal */}
      {paymentOpen && (
        <PaymentModal
          open={paymentOpen}
          value={paymentModel}
          maxPayable={balanceRaw}
          currencyLabel="؋"
          onChange={setPaymentModel}
          onClose={() => setPaymentOpen(false)}
          onSubmit={handleSubmitPayment}
          title="پرداخت سهم صاحب امتیاز"
          hint={`پرداخت از حساب ${displayName} ${fatherName} | موجودی: ${balanceRaw ?? 0} ؋`}
        />
      )}

      {/* Report Modal */}
      <ServerReportModal open={reportOpen} onClose={() => setReportOpen(false)} variant="franchiseOwnerBalance" rows={reportRows} />
    </div>
  );
}

/* ---------------- UI helpers ---------------- */
function InfoRow({ label, children }) {
  return (
    <div className="info-row">
      <div className="info-label">{label}</div>
      <div className="info-value">{children}</div>
    </div>
  );
}
