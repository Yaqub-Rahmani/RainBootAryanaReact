import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams } from "react-router-dom";

import "../styles/TenantProfile.css";

import Button from "../../../shared/components/Button";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import CustomDatePicker from "../../../shared/date/CustomDatePicker";

import { useGlobalLoading } from "../../../shared/loading/GlobalLoadingContext";
import { normalizeMediaPath } from "../../../shared/utils/normalizeMediaPath";
import { convertAfDate } from "../../../shared/date/convertAfDate";
import { getTokens } from "../../../shared/services/apiClient";

import { ImageCropModal } from "../../../shared/imageCrop/ImageCropModal";
import FingerModal from "../../fingerprint/Model/fingerModel";

import { imageService } from "../../images/services/imageService";
import { mediaAssetService } from "../../mediaAsset/services/mediaAssetService";
import { uploadContractAndSaveMedia } from "../../files/slices/filesSlice";

import { tenantService } from "../services/tenantService";
import { OwnerType, MediaKind, guid, nowIso } from "../../../shared/person/onboardConstants";

import { ChevronsDown, ChevronsUp, Download, Edit, Fingerprint, X } from "lucide-react";
import DateObject from "react-date-object";

/* ---------------- helpers ---------------- */
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
    case MediaKind.TenantContract:
      return "contracts";
    default:
      return "misc";
  }
};

async function safeSetPrimary(id) {
  try {
    await mediaAssetService.setPrimary(id);
  } catch {}
}

const withBust = (url, v) => {
  if (!url) return url;
  const sep = url.includes("?") ? "&" : "?";
  return `${url}${sep}v=${encodeURIComponent(String(v ?? ""))}`;
};

const monthsDari = [
  "حمل",
  "ثور",
  "جوزا",
  "سرطان",
  "اسد",
  "سنبله",
  "میزان",
  "عقرب",
  "قوس",
  "جدی",
  "دلو",
  "حوت",
];

const fmtMoney = (v) =>
  v == null ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 0 });

const fmtMoney2 = (v) =>
  v == null
    ? "—"
    : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPeriod = (y, m) => {
  if (!y || !m) return "—";
  const mm = Number(m);
  const mn = mm >= 1 && mm <= 12 ? monthsDari[mm - 1] : String(m);
  return `${y}/${String(m).padStart(2, "0")} (${mn})`;
};

const parseDateObject = (val) => {
  if (!val) return null;
  try {
    if (val instanceof DateObject) return val;
    return new DateObject(val);
  } catch {
    return null;
  }
};

// profile/row alanları bazen PascalCase bazen camelCase geliyor
const getVal = (obj, ...keys) => {
  const o = obj || {};
  for (const k of keys) {
    if (!k) continue;
    const direct = o?.[k];
    if (direct !== undefined && direct !== null && String(direct) !== "") return direct;
    const lowerFirst = k.length ? k[0].toLowerCase() + k.slice(1) : k;
    const alt = o?.[lowerFirst];
    if (alt !== undefined && alt !== null && String(alt) !== "") return alt;
  }
  return null;
};

const genderLabel = (v) => {
  const s = String(v ?? "").toLowerCase();
  if (!s) return "—";
  if (s === "male" || s === "m" || s === "1") return "مرد";
  if (s === "female" || s === "f" || s === "2") return "زن";
  return String(v);
};

function LargeModal({ open, title, children, onClose, footer }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="tpModalOverlay" onMouseDown={onClose}>
      <div className="tpModal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="tpModalHeader">
          <div className="tpModalTitle">{title}</div>
          <button className="tpModalClose" type="button" onClick={onClose} aria-label="close">
            <X size={18} />
          </button>
        </div>
        <div className="tpModalBody">{children}</div>
        {footer ? <div className="tpModalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}

export default function TenantProfile() {
  const { tenantId } = useParams();
  const resolvedId = tenantId;

  const dispatch = useDispatch();
  const { show, hide } = useGlobalLoading();
  // TenantProfile içinde global loader referanslarını stabilize et (Provider'a dokunmadan)
  const showRef = useRef(show);
  const hideRef = useRef(hide);
  useEffect(() => {
    showRef.current = show;
    hideRef.current = hide;
  }, [show, hide]);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("debts"); // debts | payments | contracts

  const [profile, setProfile] = useState(null);
  const [contracts, setContracts] = useState([]);

  // period summary totals (server’dan)
  const [periodTotals, setPeriodTotals] = useState({
    totalAccrued: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });

  // cache-bust (görsel güncelleme sonrası anında yenilensin)
  const [mediaRev, setMediaRev] = useState(() => Date.now());

  // fingerprint modal
  const [fingerOpen, setFingerOpen] = useState(false);
  const [fingerBusy, setFingerBusy] = useState(false);

  // crop modal
  const [cropOpen, setCropOpen] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [cropTitle, setCropTitle] = useState("");

  // pickers
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const pendingMediaRef = useRef(null); // { kind, title, isPdf }

  // prevent duplicate refreshAll calls (avoid loader thrash)
  const refreshInFlightRef = useRef(null);

  // payments cache (slow endpoint guard)
  const paymentsCacheRef = useRef({ data: null, loading: false, req: 0, forceKey: 0 });
  const [paymentsReloadKey, setPaymentsReloadKey] = useState(0);
  const [paymentsVersion, setPaymentsVersion] = useState(0);

  // Modals
  const [paymentModal, setPaymentModal] = useState({ open: false, row: null });
  const [allocState, setAllocState] = useState({ loading: false, rows: [], error: null });

  const [periodModal, setPeriodModal] = useState({ open: false, row: null });
  const [contractModal, setContractModal] = useState({ open: false, row: null });

  // \"Devamını gör\" text modal
    const [textModal, setTextModal] = useState({
      open: false,
      title: "",
      text: "",
    });


  const baseFolder = useMemo(() => (resolvedId ? `/storage/tenants/${resolvedId}` : ""), [resolvedId]);

  const refreshAll = useCallback(async () => {
    if (!resolvedId) return;

    // If a refresh is already running, reuse it.
    if (refreshInFlightRef.current) return refreshInFlightRef.current;

    const p = (async () => {
      showRef.current?.();
      try {
        const p = await tenantService.getProfile(resolvedId);
        setProfile(p || null);

        const c = await tenantService.getContracts(resolvedId);
        setContracts(Array.isArray(c) ? c : []);

        setMediaRev(Date.now());
      } finally {
        hideRef.current?.();
      }
    })();

    refreshInFlightRef.current = p;
    try {
      await p;
    } finally {
      refreshInFlightRef.current = null;
    }
  }, [resolvedId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const ensurePaymentsLoaded = useCallback(
    async (force = false, forceKey = 0) => {
      if (!resolvedId) return [];

      // aynı reloadKey ile tekrar tekrar force etme
      if (force && forceKey && paymentsCacheRef.current.forceKey !== forceKey) {
        paymentsCacheRef.current.data = null;
        paymentsCacheRef.current.forceKey = forceKey;
      }

      const cache = paymentsCacheRef.current;
      if (!force && Array.isArray(cache.data)) return cache.data;
      if (cache.loading && !force && Array.isArray(cache.data)) return cache.data;

      cache.loading = true;
      cache.req += 1;
      const reqId = cache.req;

      try {
        const rows = await tenantService.getPayments(resolvedId);
        if (paymentsCacheRef.current.req === reqId) {
          paymentsCacheRef.current.data = Array.isArray(rows) ? rows : [];
          setPaymentsVersion((v) => v + 1);
        }
      } catch {
        if (paymentsCacheRef.current.req === reqId) {
          paymentsCacheRef.current.data = [];
          setPaymentsVersion((v) => v + 1);
        }
      } finally {
        if (paymentsCacheRef.current.req === reqId) paymentsCacheRef.current.loading = false;
      }

      return paymentsCacheRef.current.data || [];
    },
    [resolvedId]
  );

  const displayName = getVal(profile, "DisplayName", "displayName") ?? "—";
  const fatherName = getVal(profile, "FatherName", "fatherName") ?? "";


  const addressLine = getVal(profile, "AddressLine", "addressLine") ?? "";
  const addressFull = getVal(profile, "AddressFull", "addressFull") ?? "";

  const openTextModal = useCallback((title, text) => {
    const t = String(text ?? "").trim();
    if (!t) return;
    setTextModal({ open: true, title: title || "", text: t });
  }, []);

  const renderPeek = useCallback(
    (title, value, lines = 2) => {
      const v =
        value == null || String(value).trim() === ""
          ? "—"
          : String(value);

      const long =
        v !== "—" && (v.length > 64 || /[\r\n]/.test(v)); // \n veya \r\n

      return (
        <div className="tpPeek">
          <div className="tpClamp" style={{ "--lines": lines }}>
            {v}
          </div>

          {long ? (
            <button
              type="button"
              className="tpMoreLink"
              onClick={() => openTextModal(title, v)}
            >
              devamını gör
            </button>
          ) : null}
        </div>
      );
    },
    [openTextModal]
  );



  const balanceRaw = getVal(profile, "Balance", "balance") ?? 0;
  const balanceFmt =
    typeof balanceRaw === "number" ? balanceRaw.toLocaleString("en-US", { minimumFractionDigits: 2 }) : balanceRaw ?? "—";

  const mediaCards = useMemo(
    () => [
      { kind: MediaKind.IdFront, key: "IdFrontUrl", title: "روی - تذکره", isPdf: false, isFinger: false },
      { kind: MediaKind.IdBack, key: "IdBackUrl", title: "پشت - تذکره", isPdf: false, isFinger: false },
      { kind: MediaKind.Avatar, key: "AvatarUrl", title: "عکس پروفایل", isPdf: false, isFinger: false },
      { kind: MediaKind.FingerBitmap, key: "FingerBitmapUrl", title: "اثر انگشت", isPdf: false, isFinger: true },
      { kind: MediaKind.TenantContract, key: "ContractUrl", title: "قرارداد کرایه (PDF)", isPdf: true, isFinger: false },
    ],
    []
  );

  const addPrimaryMedia = useCallback(
    async ({ kind, storageUrl, isPrimary = true }) => {
      const dto = {
        id: guid(),
        ownerType: OwnerType.Tenant,
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

  const downloadBlobUrl = useCallback(async (url, title) => {
    if (!url) return;

    const stamp = new Date();
    const y = stamp.getFullYear();
    const m = String(stamp.getMonth() + 1).padStart(2, "0");
    const d = String(stamp.getDate()).padStart(2, "0");
    const hh = String(stamp.getHours()).padStart(2, "0");
    const mm = String(stamp.getMinutes()).padStart(2, "0");
    const suffix = `${y}${m}${d}-${hh}${mm}`;

    try {
      const token = getTokens()?.accessToken;
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      const blob = await res.blob();
      const ext = guessExt(url, blob.type);
      const fileName = sanitizeFileName(`مستاجر ${displayName} ${fatherName} ${title} ${suffix}`) + (ext || "");

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
  }, [displayName, fatherName]);

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

  const saveCroppedAsMedia = useCallback(async (pngDataUrl) => {
    const pending = pendingMediaRef.current;
    if (!resolvedId || !pending?.kind || pending?.isPdf) {
      setCropOpen(false);
      pendingMediaRef.current = null;
      return;
    }

    try {
      const folderUrl = `${baseFolder}/${kindToSubfolder(pending.kind)}`;

      const savedRes = await imageService.saveIfDataUrl({ photoFolderUrl: folderUrl, baseFile: pngDataUrl });
      const relativePath = pickSavedPath(savedRes);
      if (!relativePath) throw new Error("تصویر ذخیره نشد.");

      await addPrimaryMedia({ kind: pending.kind, storageUrl: relativePath, isPrimary: true });

      setCropOpen(false);
      pendingMediaRef.current = null;
      await refreshAll();
    } catch (err) {
      setCropOpen(false);
      pendingMediaRef.current = null;
      alert(String(err?.response?.data ?? err?.message ?? "خطا"));
    }
  }, [addPrimaryMedia, baseFolder, refreshAll, resolvedId]);

  const onPickedPdfFile = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const pending = pendingMediaRef.current;
    if (!resolvedId || !pending?.isPdf || pending.kind !== MediaKind.TenantContract) return;

    try {
      const folderUrl = `${baseFolder}/${kindToSubfolder(MediaKind.TenantContract)}`;

      const r = await dispatch(
        uploadContractAndSaveMedia({
          file,
          ownerId: resolvedId,
          folderUrl,
          ownerType: OwnerType.Tenant,
          kind: MediaKind.TenantContract,
          isPrimary: true,
          createdAt: nowIso(),
        })
      );

      if (uploadContractAndSaveMedia.rejected.match(r)) {
        alert(String(r.payload || "قرارداد آپلود نشد."));
        return;
      }

      pendingMediaRef.current = null;
      await refreshAll();
    } catch (err) {
      alert(String(err?.response?.data ?? err?.message ?? "خطا"));
    }
  }, [baseFolder, dispatch, refreshAll, resolvedId]);

  const onFingerprintCompleted = useCallback(async (payload) => {
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

      if (bitmapPng) {
        const folderUrl = `${baseFolder}/${kindToSubfolder(MediaKind.FingerBitmap)}`;
        const savedRes = await imageService.saveIfDataUrl({ photoFolderUrl: folderUrl, baseFile: bitmapPng });
        const relativePath = pickSavedPath(savedRes);
        if (!relativePath) throw new Error("اثر انگشت ذخیره نشد.");

        relatedMediaAssetId = await addPrimaryMedia({
          kind: MediaKind.FingerBitmap,
          storageUrl: relativePath,
          isPrimary: true,
        });
      }

      await tenantService.upsertFingerprint(resolvedId, { templateBase64: mergedTemplateBase64, relatedMediaAssetId });
      setFingerOpen(false);
      await refreshAll();
    } catch (err) {
      alert(String(err?.response?.data ?? err?.message ?? "خطا در ثبت اثر انگشت"));
    } finally {
      setFingerBusy(false);
    }
  }, [addPrimaryMedia, baseFolder, refreshAll, resolvedId]);

  /* ---------------- avatar + media ---------------- */
  const rawAvatar = profile?.AvatarUrl || profile?.avatarUrl;
  const avatarUrl = rawAvatar ? withBust(normalizeMediaPath(rawAvatar), mediaRev) : null;
  const avatarSrc = avatarUrl && isProbablyImage(avatarUrl) ? avatarUrl : null;

  /* ---------------- Tabs ---------------- */
  const tabs = useMemo(
    () => [
      { key: "debts", label: "بدهی‌ها (دوره)" },
      { key: "payments", label: "پرداخت‌ها" },
      { key: "contracts", label: "قراردادها" },
    ],
    []
  );

  /* ---------------- Period table (server-side) ---------------- */
  const periodColumns = useMemo(
    () => [
      {
        key: "marketName",
        header: "مارکیت",
        sortable: true,
        serverField: "MarketName",
        searchable: true,
        filterType: "text",
        filterLabel: "مارکیت",
        filterPlaceholder: "جستجو...",
      },
      {
        key: "floorName",
        header: "منزل",
        sortable: true,
        serverField: "FloorName",
        searchable: true,
        filterType: "text",
        filterLabel: "منزل",
        filterPlaceholder: "جستجو...",
      },
      {
        key: "unitNumber",
        header: "شماره دوکان",
        sortable: true,
        serverField: "UnitNumber",
        searchable: true,
        filterType: "text",
        filterLabel: "شماره دوکان",
        filterPlaceholder: "جستجو...",
      },
      {
        key: "shopName",
        header: "دوکان",
        sortable: true,
        serverField: "ShopName",
        searchable: true,
        filterType: "text",
        filterLabel: "دوکان",
        filterPlaceholder: "جستجو...",
      },
      {
        // ✅ single period filter (year+month) in filter modal
        key: "period",
        header: "دوره",
        sortable: false,
        filterable: true,
        filterLabel: "دوره",
        filterHint: "سال/ماه را یکجا انتخاب کنید",
        filterOrder: 5,
        render: (_v, r) => fmtPeriod(r?.year ?? r?.Year, r?.month ?? r?.Month),
        renderFilter: (val, _draft, setVal) => (
          <CustomDatePicker
            mode="single"
            placeholder="انتخاب دوره..."
            value={val || null}
            onChange={(v) => setVal(v || null)}
          />
        ),
        buildFilter: (val) => {
          const d = parseDateObject(val);
          if (!d) return null;
          const yy = d?.year;
          const mm = d?.month?.number;
          if (!yy || !mm) return null;
          return [
            { field: "Year", op: "eq", value: yy },
            { field: "Month", op: "eq", value: mm },
          ];
        },
      },
      {
        key: "totalAccrued",
        header: "مجموع بدهی",
        sortable: true,
        serverField: "TotalAccrued",
        align: "end",
        render: (v) => fmtMoney(v),
        filterType: "numberRange",
        filterLabel: "بدهی",
        minPlaceholder: "حداقل",
        maxPlaceholder: "حداکثر",
      },
      {
        key: "totalPaid",
        header: "مجموع پرداخت",
        sortable: true,
        serverField: "TotalPaid",
        align: "end",
        render: (v) => fmtMoney(v),
        filterType: "numberRange",
        filterLabel: "پرداخت",
        minPlaceholder: "حداقل",
        maxPlaceholder: "حداکثر",
      },
      {
        key: "totalOutstanding",
        header: "باقی‌مانده",
        sortable: true,
        serverField: "TotalOutstanding",
        align: "end",
        render: (v) => fmtMoney(v),
        filterType: "numberRange",
        filterLabel: "باقی‌مانده",
        minPlaceholder: "حداقل",
        maxPlaceholder: "حداکثر",
      },
      {
        key: "actions",
        header: "عملیات",
        visible: true,
        render: (_v, r) => (
          <Button
            size="sm"
            variant="soft"
            primaryColor="var(--role-secondary-bg)"
            onClick={() => setPeriodModal({ open: true, row: r })}
          >
            جزییات
          </Button>
        ),
      },
    ],
    []
  );

  /* ---------------- Payments table (client-side + server fetch once) ---------------- */
  const paymentRowsFromServer = useCallback((raw, contractsArr) => {
    const cs = Array.isArray(contractsArr) ? contractsArr : [];
    const byContract = new Map(cs.map((c) => [String(c.contractId ?? c.id ?? ""), c]));
    return (Array.isArray(raw) ? raw : []).map((p) => {
      const cid = String(p.contractId ?? p.ContractId ?? "");
      const c = byContract.get(cid);
      return {
        id: p.id ?? p.Id,
        paidAtUtc: p.paidAtUtc ?? p.PaidAtUtc,
        amountReceived: p.amountReceived ?? p.AmountReceived,
        method: p.method ?? p.Method,
        referenceNo: p.referenceNo ?? p.ReferenceNo,
        notes: p.notes ?? p.Notes,
        isApproved: p.isApproved ?? p.IsApproved,
        targetYear: p.targetYear ?? p.TargetYear,
        targetMonth: p.targetMonth ?? p.TargetMonth,
        contractId: p.contractId ?? p.ContractId,
        shopId: p.shopId ?? p.ShopId,
        marketName: c?.marketName,
        floorName: c?.floorName,
        unitNumber: c?.unitNumber,
        shopName: c?.shopName,
      };
    });
  }, []);

  const paymentColumns = useMemo(
    () => [
      {
        key: "paidAtUtc",
        header: "تاریخ پرداخت",
        sortable: true,
        serverField: "paidAtUtc",
        render: (v) => (v ? convertAfDate(v, { monthStyle: "name" }) : "—"),
      },
      {
        key: "period",
        header: "هدف دوره",
        sortable: false,
        filterable: true,
        filterLabel: "هدف دوره",
        filterOrder: 5,
        render: (_v, r) => fmtPeriod(r?.targetYear, r?.targetMonth),
        renderFilter: (val, _draft, setVal) => (
          <CustomDatePicker
            mode="single"
            placeholder="انتخاب دوره..."
            value={val || null}
            onChange={(v) => setVal(v || null)}
          />
        ),
        buildFilter: (val) => {
          const d = parseDateObject(val);
          if (!d) return null;
          const yy = d?.year;
          const mm = d?.month?.number;
          if (!yy || !mm) return null;
          return [
            { field: "targetYear", op: "eq", value: yy },
            { field: "targetMonth", op: "eq", value: mm },
          ];
        },
      },
      {
        key: "marketName",
        header: "مارکیت",
        sortable: false,
        serverField: "marketName",
        render: (v) => v || "—",
      },
      {
        key: "floorName",
        header: "منزل",
        sortable: false,
        serverField: "floorName",
        render: (v) => v || "—",
      },
      {
        key: "unitNumber",
        header: "دوکان",
        sortable: false,
        serverField: "unitNumber",
        render: (v, r) => r?.unitNumber || r?.shopName || v || "—",
      },
      {
        key: "amountReceived",
        header: "مبلغ",
        sortable: true,
        serverField: "amountReceived",
        align: "end",
        render: (v) => fmtMoney2(v),
      },
      {
        key: "isApproved",
        header: "تایید",
        sortable: true,
        serverField: "isApproved",
        render: (v) => (v ? "✓" : "—"),
      },
      {
        key: "actions",
        header: "عملیات",
        render: (_v, r) => (
          <Button
            size="sm"
            variant="soft"
            primaryColor="var(--role-secondary-bg)"
            onClick={() => openPaymentDetails(r)}
          >
            جزییات
          </Button>
        ),
      },
    ],
    []
  );

  const applyClientPaging = useCallback((allItems, q) => {
    const page = Number(q?.page || 1);
    const pageSize = Number(q?.pageSize || 25);

    // filters: array of strings like "field:op:value"
    const filters = Array.isArray(q?.filters) ? q.filters : [];
    let rows = [...(Array.isArray(allItems) ? allItems : [])];

    const getVal = (row, f) => row?.[f];
    const num = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };
    const epoch = (x) => {
      if (!x) return null;
      try {
        const dt = new Date(x);
        return Number.isFinite(dt.valueOf()) ? dt.valueOf() : null;
      } catch {
        return null;
      }
    };

    // apply filters
    if (filters.length) {
      const fromTo = new Map();
      for (const f of filters) {
        const parts = String(f).split(":");
        if (parts.length < 3) continue;
        const field = parts[0];
        const op = parts[1];
        const value = parts.slice(2).join(":");

        if (op === "from" || op === "to") {
          const key = field;
          const cur = fromTo.get(key) || {};
          cur[op] = value;
          fromTo.set(key, cur);
          continue;
        }

        rows = rows.filter((r) => {
          const rv = getVal(r, field);
          if (op === "eq") return String(rv) === String(value);
          if (op === "contains") return String(rv ?? "").toLowerCase().includes(String(value).toLowerCase());
          if (op === "gte") {
            const a = num(rv);
            const b = num(value);
            if (a == null || b == null) return false;
            return a >= b;
          }
          if (op === "lte") {
            const a = num(rv);
            const b = num(value);
            if (a == null || b == null) return false;
            return a <= b;
          }
          if (op === "in") {
            const set = new Set(String(value).split(",").map((x) => x.trim()).filter(Boolean));
            return set.has(String(rv));
          }
          return true;
        });
      }

      // between (from/to)
      for (const [field, { from, to }] of fromTo.entries()) {
        const fromE = epoch(from);
        const toE = epoch(to);
        if (fromE == null && toE == null) continue;

        rows = rows.filter((r) => {
          const rv = getVal(r, field);
          const e = epoch(rv);
          if (e == null) return false;
          if (fromE != null && e < fromE) return false;
          if (toE != null && e > toE) return false;
          return true;
        });
      }
    }

    // sort: "field:asc"
    const sortStr = String(q?.sort || "");
    if (sortStr.includes(":")) {
      const [field, dir] = sortStr.split(":");
      const mul = dir === "desc" ? -1 : 1;
      rows.sort((a, b) => {
        const av = a?.[field];
        const bv = b?.[field];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        // dates
        const ae = epoch(av);
        const be = epoch(bv);
        if (ae != null && be != null) return (ae - be) * mul;
        // numbers
        const an = num(av);
        const bn = num(bv);
        if (an != null && bn != null) return (an - bn) * mul;
        return String(av).localeCompare(String(bv)) * mul;
      });
    }

    const totalCount = rows.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const start = (page - 1) * pageSize;
    const slice = rows.slice(start, start + pageSize);

    return { items: slice, totalCount, totalPages };
  }, []);

  const paymentsFetcher = useCallback(async (q) => {
    const key = Number(q?.__reloadKey || 0);
    const force = key > 0 && paymentsCacheRef.current.forceKey !== key;
    const raw = await ensurePaymentsLoaded(!!force, key);
    const rows = paymentRowsFromServer(raw, contracts);
    return applyClientPaging(rows, q);
  }, [applyClientPaging, contracts, ensurePaymentsLoaded, paymentRowsFromServer]);

  const contractsColumns = useMemo(
    () => [
      { key: "marketName", header: "مارکیت", serverField: "marketName", render: (v) => v || "—" },
      { key: "floorName", header: "منزل", serverField: "floorName", render: (v) => v || "—" },
      { key: "unitNumber", header: "دوکان", serverField: "unitNumber", render: (v, r) => r?.unitNumber || r?.shopName || v || "—" },
      { key: "startDate", header: "شروع", serverField: "startDate", render: (v) => (v ? convertAfDate(v, { monthStyle: "name" }) : "—") },
      { key: "endDate", header: "پایان", serverField: "endDate", render: (v) => (v ? convertAfDate(v, { monthStyle: "name" }) : "—") },
      { key: "status", header: "حالت", serverField: "status", render: (v) => v || "—" },
      {
        key: "actions",
        header: "عملیات",
        render: (_v, r) => (
          <Button size="sm" variant="soft" primaryColor="var(--role-secondary-bg)" onClick={() => setContractModal({ open: true, row: r })}>
            جزییات
          </Button>
        ),
      },
    ],
    []
  );

  const contractsFetcher = useCallback(async (q) => {
    const rows = (Array.isArray(contracts) ? contracts : []).map((x) => ({
      id: x.contractId,
      contractId: x.contractId,
      marketName: x.marketName,
      floorName: x.floorName,
      unitNumber: x.unitNumber,
      shopName: x.shopName,
      startDate: x.startDate,
      endDate: x.endDate,
      status: x.status,
    }));
    return applyClientPaging(rows, q);
  }, [applyClientPaging, contracts]);

  const openPaymentDetails = useCallback(async (row) => {
    if (!row?.id) return;
    setPaymentModal({ open: true, row });
    setAllocState({ loading: true, rows: [], error: null });
    try {
      const a = await tenantService.getPaymentAllocations(row.id);
      setAllocState({ loading: false, rows: Array.isArray(a) ? a : [], error: null });
    } catch {
      setAllocState({ loading: false, rows: [], error: "خطا در دریافت توزیع پرداخت" });
    }
  }, []);

  const allocationColumns = useMemo(
    () => [
      {
        key: "kind",
        header: "نوع",
        serverField: "kind",
        render: (v) => String(v ?? "—"),
      },
      {
        key: "period",
        header: "دوره",
        serverField: "period",
        render: (_v, r) => fmtPeriod(r?.periodYear ?? r?.PeriodYear, r?.periodMonth ?? r?.PeriodMonth),
      },
      {
        key: "amount",
        header: "مبلغ (AFN)",
        serverField: "amount",
        align: "end",
        render: (v) => fmtMoney2(v),
      },
      {
        key: "usdEquivalent",
        header: "USD",
        serverField: "usdEquivalent",
        align: "end",
        render: (v) => fmtMoney2(v),
      },
      {
        key: "notes",
        header: "یادداشت",
        serverField: "notes",
        render: (v) => v || "—",
      },
    ],
    []
  );

  const allocationsFetcher = useCallback(async (q) => {
    const rows = (Array.isArray(allocState.rows) ? allocState.rows : []).map((x) => ({
      id: x.id ?? x.Id,
      kind: x.kind ?? x.Kind,
      periodYear: x.periodYear ?? x.PeriodYear,
      periodMonth: x.periodMonth ?? x.PeriodMonth,
      amount: x.amount ?? x.Amount,
      usdEquivalent: x.usdEquivalent ?? x.UsdEquivalent,
      notes: x.notes ?? x.Notes,
    }));
    return applyClientPaging(rows, q);
  }, [allocState.rows, applyClientPaging]);

  /* ---------------- Period detail modal content ---------------- */
  const periodPayments = useMemo(() => {
    const row = periodModal.row;
    if (!row) return [];
    const yy = row?.year ?? row?.Year;
    const mm = row?.month ?? row?.Month;
    if (!yy || !mm) return [];
    const raw = paymentsCacheRef.current.data;
    const list = paymentRowsFromServer(raw, contracts);
    return list.filter((p) => Number(p.targetYear) === Number(yy) && Number(p.targetMonth) === Number(mm));
  }, [contracts, paymentRowsFromServer, periodModal.row, paymentsVersion]);

  useEffect(() => {
    // Period modal açıldığında ödemeler henüz yüklenmemişse, sessizce getir
    if (!periodModal.open) return;
    if (Array.isArray(paymentsCacheRef.current.data)) return;
    ensurePaymentsLoaded(false);
  }, [ensurePaymentsLoaded, periodModal.open]);

  /* ---------------- Render ---------------- */
  return (
    <div className={`tenant-profile ${open ? "isOpen" : ""}`} dir="rtl">
      {/* hidden inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onPickedImageFile} />
      <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: "none" }} onChange={onPickedPdfFile} />

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
      <div className="tenantHeader">
        <div className="tenantHeaderLeft">
          <div className="tenantAvatar">
            {avatarSrc ? <img src={avatarSrc} alt="avatar" /> : <div className="tenantAvatarPh" />}
          </div>

          <div className="tenantTitle">
            <div className="tenantName">{displayName}</div>
            <div className="tenantFather">{fatherName ? `فرزند ${fatherName}` : "—"}</div>
          </div>
        </div>

        <div className="tenantHeaderRight">
          <div className="tenantBalanceBox">
            <div className="tenantBalanceValue">{balanceFmt}</div>
            <div className="tenantBalanceLabel">باقی‌مانده بدهی</div>
          </div>

          <Button
            size="lg"
            iconOnly
            icon={open ? ChevronsUp : ChevronsDown}
            onClick={() => setOpen((v) => !v)}
            primaryColor="var(--role-secondary-bg)"
          />
        </div>
      </div>

      {/* COLLAPSE */}
      <div className={`tenantCollapse ${open ? "open" : ""}`}>
<div className="tenantInfoGrid">
  <div className="col">
    <InfoRow label="نام">{displayName}</InfoRow>
    <InfoRow label="نام پدر">{fatherName || "—"}</InfoRow>

    <InfoRow label="شماره های تماس">
      {[
        getVal(profile, "PhonePrimary", "phonePrimary"),
        getVal(profile, "PhoneSecondary", "phoneSecondary"),
      ]
        .filter(Boolean)
        .join(" / ") || "—"}
    </InfoRow>

    <InfoRow label="نمبر تذکره">
      {getVal(profile, "NationalId", "nationalId") ?? "—"}
    </InfoRow>
        {/* Ek alanlar (örnekte yoktu ama senin listende var) */}
    <InfoRow label="جنسیت">
      {genderLabel(getVal(profile, "Gender", "gender"))}
    </InfoRow>
  </div>

  <div className="col">
    <InfoRow label="ولایت">{getVal(profile, "Province", "province") ?? "—"}</InfoRow>

    {/* örnekte "ولسوالی" var; senin kodunda District/ناحیه kullanılmış */}
    <InfoRow label="ولسوالی">{getVal(profile, "District", "district") ?? "—"}</InfoRow>

    <InfoRow label="آدرس">
      {renderPeek("آدرس", (addressLine || addressFull || "—"), 2)}
    </InfoRow>

    <InfoRow label="آدرس کامل">
      {renderPeek("آدرس کامل", (addressFull || addressLine || "—"), 3)}
    </InfoRow>

    <InfoRow label="وضعیت">
      {getVal(profile, "IsActive", "isActive") ? "فعال" : "غیرفعال"}
    </InfoRow>
  </div>
</div>


        {/* MEDIA */}
        <div className="tenantMediaGrid">
          {mediaCards.map((c) => {
            const raw = profile?.[c.key] ?? profile?.[c.key[0].toLowerCase() + c.key.slice(1)];
            const url = raw ? withBust(normalizeMediaPath(raw), mediaRev) : null;
            const canPreviewImg = url && !c.isPdf && isProbablyImage(url);

            return (
              <div key={c.key} className="tenantMediaCard">
                <div className="tenantMediaBox">
                  {c.isPdf ? (
                    <div className="tenantMediaPh">PDF</div>
                  ) : canPreviewImg ? (
                    <img src={url} alt={c.title} />
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
                      onClick={() => url && downloadBlobUrl(url, c.title)}
                      primaryColor="var(--role-primary-bg)"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs (DashboardPage style) */}
      <div className="tpTabs">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`tpTab ${tab === t.key ? "is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="tpTabBody">

      {/* Debts */}
      {tab === "debts" && (
        <section className="tenantSection">
          <div className="tenantSectionHeader">
            <div className="tenantSectionTitle">خلاصه دوره‌ها (بدهی / پرداخت)</div>

            <div className="tenantTotals">
              <div className="tCard">
                <div className="tLabel">مجموع بدهی</div>
                <div className="tValue">{fmtMoney(periodTotals.totalAccrued || 0)}</div>
              </div>
              <div className="tCard">
                <div className="tLabel">مجموع پرداخت</div>
                <div className="tValue">{fmtMoney(periodTotals.totalPaid || 0)}</div>
              </div>
              <div className="tCard">
                <div className="tLabel">باقی‌مانده</div>
                <div className="tValue">{fmtMoney(periodTotals.totalOutstanding || 0)}</div>
              </div>
            </div>
          </div>

          <CustomTableV2
            columns={periodColumns}
            toolbarTitle="لیست دوره‌ها"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={560}
            showSearchBar={false}
            showAddButton={false}
            fetcher={async (q) => {
              const data = await tenantService.getPeriodSummaries(resolvedId, q);
              if (data?.totalAccrued != null || data?.TotalAccrued != null) {
                setPeriodTotals({
                  totalAccrued: data?.totalAccrued ?? data?.TotalAccrued ?? 0,
                  totalPaid: data?.totalPaid ?? data?.TotalPaid ?? 0,
                  totalOutstanding: data?.totalOutstanding ?? data?.TotalOutstanding ?? 0,
                });
              }
              return data?.page ?? data;
            }}
          />
        </section>
      )}

      {/* Payments */}
      {tab === "payments" && (
        <section className="tenantSection">
          <div className="tenantSectionHeader">
            <div className="tenantSectionTitle">پرداخت‌ها</div>

            <div className="tenantSectionActions">
              <Button
                size="md"
                variant="soft"
                primaryColor="var(--role-secondary-bg)"
                onClick={() => setPaymentsReloadKey((x) => x + 1)}
              >
                بازخوانی
              </Button>
            </div>
          </div>

          <CustomTableV2
            key={`payments-${paymentsReloadKey}`}
            columns={paymentColumns}
            toolbarTitle="لیست پرداخت‌ها"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={560}
            showSearchBar={false}
            showAddButton={false}
            showRefreshButton={false}
            extraParams={{ __reloadKey: paymentsReloadKey }}
            fetcher={paymentsFetcher}
          />
        </section>
      )}

      {/* Contracts */}
      {tab === "contracts" && (
        <section className="tenantSection">
          <div className="tenantSectionHeader">
            <div className="tenantSectionTitle">قراردادها</div>
          </div>

          <CustomTableV2
            columns={contractsColumns}
            toolbarTitle="لیست قراردادها"
            transport="legacy"
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            maxBodyHeight={560}
            showSearchBar={false}
            showAddButton={false}
            fetcher={contractsFetcher}
          />
        </section>
      )}

      </div>

      {/* Payment Details Modal */}
      <LargeModal
        open={paymentModal.open}
        title="جزییات پرداخت"
        onClose={() => {
          setPaymentModal({ open: false, row: null });
          setAllocState({ loading: false, rows: [], error: null });
        }}
        footer={
          <Button size="md" variant="soft" primaryColor="var(--role-secondary-bg)" onClick={() => {
            setPaymentModal({ open: false, row: null });
            setAllocState({ loading: false, rows: [], error: null });
          }}>
            بستن
          </Button>
        }
      >
        {paymentModal.row ? (
          <div className="tpModalGrid">
            <div className="tpKV">
              <div className="tpK">تاریخ</div>
              <div className="tpV">{paymentModal.row.paidAtUtc ? convertAfDate(paymentModal.row.paidAtUtc, { monthStyle: "name" }) : "—"}</div>
            </div>
            <div className="tpKV">
              <div className="tpK">مبلغ</div>
              <div className="tpV">{fmtMoney2(paymentModal.row.amountReceived)}</div>
            </div>
            <div className="tpKV">
              <div className="tpK">هدف دوره</div>
              <div className="tpV">{fmtPeriod(paymentModal.row.targetYear, paymentModal.row.targetMonth)}</div>
            </div>
            <div className="tpKV">
              <div className="tpK">قرارداد</div>
              <div className="tpV">{paymentModal.row.marketName ? `${paymentModal.row.marketName} - ${paymentModal.row.floorName || "—"}` : "—"}</div>
            </div>

            <div className="tpModalSubTitle">توزیع پرداخت (Allocation)</div>

            <CustomTableV2
              columns={allocationColumns}
              toolbarTitle=""
              transport="legacy"
              initialPageSize={10}
              pageSizeOptions={[10, 25, 50]}
              maxBodyHeight={360}
              showSearchBar={false}
              showAddButton={false}
              showRefreshButton={false}
              loading={allocState.loading}
              fetcher={allocationsFetcher}
            />

            {allocState.error ? (
              <div className="tpEmpty">{allocState.error}</div>
            ) : !allocState.loading && !allocState.rows?.length ? (
              <div className="tpEmpty">برای این پرداخت توزیعی ثبت نشده است.</div>
            ) : null}
          </div>
        ) : (
          <div className="tpEmpty">هیچ معلوماتی برای نمایش نیست.</div>
        )}
      </LargeModal>

      {/* Period Details Modal */}
      <LargeModal
        open={periodModal.open}
        title="جزییات دوره"
        onClose={() => setPeriodModal({ open: false, row: null })}
        footer={
          <Button size="md" variant="soft" primaryColor="var(--role-secondary-bg)" onClick={() => setPeriodModal({ open: false, row: null })}>
            بستن
          </Button>
        }
      >
        {periodModal.row ? (
          <div>
            <div className="tpModalGrid">
              <div className="tpKV">
                <div className="tpK">دوره</div>
                <div className="tpV">{fmtPeriod(periodModal.row?.year ?? periodModal.row?.Year, periodModal.row?.month ?? periodModal.row?.Month)}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">مجموع بدهی</div>
                <div className="tpV">{fmtMoney(periodModal.row?.totalAccrued ?? periodModal.row?.TotalAccrued)}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">مجموع پرداخت</div>
                <div className="tpV">{fmtMoney(periodModal.row?.totalPaid ?? periodModal.row?.TotalPaid)}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">باقی‌مانده</div>
                <div className="tpV">{fmtMoney(periodModal.row?.totalOutstanding ?? periodModal.row?.TotalOutstanding)}</div>
              </div>
            </div>

            <div className="tpModalSubTitle">پرداخت‌های مربوط به این دوره</div>
            {Array.isArray(paymentsCacheRef.current.data) ? (
              periodPayments.length ? (
                <div className="tpPeriodPayments">
                  {periodPayments.map((p) => (
                    <div key={String(p.id)} className="tpPayItem">
                      <div className="tpPayMain">
                        <div className="tpPayTitle">{p.paidAtUtc ? convertAfDate(p.paidAtUtc, { monthStyle: "name" }) : "—"}</div>
                        <div className="tpPayMeta">{fmtMoney2(p.amountReceived)} AFN</div>
                      </div>
                      <Button size="sm" variant="soft" primaryColor="var(--role-secondary-bg)" onClick={() => openPaymentDetails(p)}>
                        جزییات
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="tpEmpty">برای این دوره پرداختی ثبت نشده است.</div>
              )
            ) : (
              <div className="tpEmpty">در حال دریافت پرداخت‌ها…</div>
            )}
          </div>
        ) : (
          <div className="tpEmpty">هیچ معلوماتی برای نمایش نیست.</div>
        )}
      </LargeModal>

      {/* Contract Details Modal */}
      <LargeModal
        open={contractModal.open}
        title="جزییات قرارداد"
        onClose={() => setContractModal({ open: false, row: null })}
        footer={
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="md" variant="soft" primaryColor="var(--role-secondary-bg)" onClick={() => setContractModal({ open: false, row: null })}>
              بستن
            </Button>
          </div>
        }
      >
        {contractModal.row ? (
          <div>
            <div className="tpModalGrid">
              <div className="tpKV">
                <div className="tpK">مارکیت</div>
                <div className="tpV">{contractModal.row.marketName || "—"}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">منزل</div>
                <div className="tpV">{contractModal.row.floorName || "—"}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">دوکان</div>
                <div className="tpV">{contractModal.row.unitNumber || contractModal.row.shopName || "—"}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">شروع</div>
                <div className="tpV">{contractModal.row.startDate ? convertAfDate(contractModal.row.startDate, { monthStyle: "name" }) : "—"}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">پایان</div>
                <div className="tpV">{contractModal.row.endDate ? convertAfDate(contractModal.row.endDate, { monthStyle: "name" }) : "—"}</div>
              </div>
              <div className="tpKV">
                <div className="tpK">حالت</div>
                <div className="tpV">{contractModal.row.status || "—"}</div>
              </div>
            </div>

            <div className="tpModalActionsRow">
              <Button
                size="md"
                variant="soft"
                primaryColor="var(--role-primary-bg)"
                disabled={!profile?.ContractUrl}
                onClick={() => profile?.ContractUrl && downloadBlobUrl(withBust(normalizeMediaPath(profile.ContractUrl), mediaRev), "سند قرارداد")}
              >
                دانلود فایل قرارداد
              </Button>
            </div>
          </div>
        ) : (
          <div className="tpEmpty">هیچ معلوماتی برای نمایش نیست.</div>
        )}
      </LargeModal>

      {/* "Devamını gör" Modal */}
      <LargeModal
        open={textModal.open}
        title={textModal.title || "Detay"}
        onClose={() => setTextModal({ open: false, title: "", text: "" })}
        footer={
          <Button
            size="md"
            variant="soft"
            primaryColor="var(--role-secondary-bg)"
            onClick={() => setTextModal({ open: false, title: "", text: "" })}
          >
            بستن
          </Button>
        }
      >
        <div className="tpTextModal">{textModal.text || "—"}</div>
      </LargeModal>

    </div>
  );
}

function InfoRow({ label, children }) {
  return (
    <div className="tenantInfoRow">
      <div className="tenantInfoLabel">{label}</div>
      <div className="tenantInfoValue">{children}</div>
    </div>
  );
}
