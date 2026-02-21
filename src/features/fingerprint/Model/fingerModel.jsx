import React, { useMemo, useRef, useState, useCallback, useEffect } from "react";
import "../styles/fingerModel.css";
import Button from "../../../shared/components/Button";
import { X, BadgeCheck } from "lucide-react";
import SVG_FINGERPRINT from "../../../assets/icons/finger0.svg?raw";
import { fingerprintService } from "../services/fingerprintService";

// servislerde template–template eşleştirme adına ne varsa yakala
const pickTemplateMatcher = (svc) =>
  svc?.matchTemplates || svc?.compareTemplates || svc?.compare || null;

/* ---------------- Kademeli Parmak İzi ---------------- */
function ProgressiveFingerprint({ svgString, scanCount = 0, size = 180 }) {
  const PALETTE = useMemo(() => ["var(--role-primary-bg)"], []);
  const { paths, viewBox } = useMemo(() => {
    if (typeof window === "undefined") return { paths: [], viewBox: "0 0 64 64" };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const vb = doc.documentElement.getAttribute("viewBox") || "0 0 64 64";
      const nodePaths = Array.from(doc.querySelectorAll("path"));
      const dList = nodePaths.map((p) => p.getAttribute("d")).filter(Boolean);
      return { paths: dList, viewBox: vb };
    } catch {
      return { paths: [], viewBox: "0 0 64 64" };
    }
  }, [svgString]);

  const shuffledIdx = useMemo(() => {
    const idx = Array.from({ length: paths.length }, (_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    return idx;
  }, [paths.length]);

  const batches = useMemo(() => {
    const n = paths.length;
    const s1 = Math.ceil(n / 3);
    const s2 = Math.ceil((2 * n) / 3);
    return [
      new Set(shuffledIdx.slice(0, s1)),
      new Set(shuffledIdx.slice(s1, s2)),
      new Set(shuffledIdx.slice(s2)),
    ];
  }, [paths.length, shuffledIdx]);

  const coloredSet = useMemo(() => {
    const s = new Set();
    if (scanCount >= 1) batches[0].forEach((i) => s.add(i));
    if (scanCount >= 2) batches[1].forEach((i) => s.add(i));
    if (scanCount >= 3) batches[2].forEach((i) => s.add(i));
    return s;
  }, [batches, scanCount]);

  const colorCacheRef = useRef({});
  const pickColor = (i) => {
    if (!colorCacheRef.current[i]) colorCacheRef.current[i] = PALETTE[0];
    return colorCacheRef.current[i];
  };

  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" aria-label="اثرِ انگشت (مرحله‌ای)">
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          style={{
            fill: coloredSet.has(i) ? pickColor(i) : "var(--role-neutral-soft-border)",
            transition: "fill 220ms ease",
          }}
        />
      ))}
    </svg>
  );
}

/* ---------------- Modal ---------------- */
export default function FingerModal({
  open,
  onClose,
  mode = "match", // "match" | "matchOrCreate" | "create"
  knownTemplateBase64,
  onCompleted,
  autoCloseOnSuccess = true,
  successCloseDelay = 900, // ms
  verbose = false, // yalnız gerektiğinde mesaj
  disableBackdropClose = false, // ÇALIŞIRKEN kapatma engeli zaten var; ekstra güvenlik için backdrop kapatmayı tamamen iptal et.
  showProgress = true, // match modunda adım göstergesini gizlemek isterseniz false yapın
}) {
  const [scanCount, setScanCount] = useState(0);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | loading | error | success
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  const primaryColor = "var(--role-primary-bg)";
  const dangerColor = "var(--role-danger-bg)";
  const secondaryColor = "var(--role-secondary-bg)";



  // modal içi mesaj günlüğü (sade)
  const [messages, setMessages] = useState([]);

  const autoStartedRef = useRef(false);
  const cancelRef = useRef({ canceled: false });

  // create için 3 kalıcı örnek
  const t1Ref = useRef(null);
  const t2Ref = useRef(null);
  const t3Ref = useRef(null);
  // son bitmap (PNG base64)
  const lastBitmapRef = useRef(null);

  const matcherFn = pickTemplateMatcher(fingerprintService);

  /* --------- Yardımcı: Mesaj ekle (Farsça) --------- */
  const lastMsgRef = useRef("");
  const pushMsg = useCallback(
    (m, { level = "info", force = false } = {}) => {
      const isError = level === "error";
      if (!verbose && !isError && !force) {
        lastMsgRef.current = m; // duplike kontrolü
        return;
      }
      if (lastMsgRef.current === m) return;
      lastMsgRef.current = m;
      setMessages((prev) => [...prev, { id: Date.now() + Math.random(), text: m, level }]);
    },
    [verbose]
  );

  /* --------- Sunucu/cihaz durumu kontrolü --------- */
  const checkServerAndDevice = useCallback(async () => {
    try {
      const s = await fingerprintService.status(); // { deviceOpened, deviceCount, ... }
      if (!s) {
        const msg = "پاسخی از سرور دریافت نشد.";
        pushMsg(msg, { level: "error" });
        setStatus("error");
        setError({ message: msg });
        return { ok: false, reason: "no-response" };
      }
      if (s.deviceOpened && (typeof s.deviceCount === "number" ? s.deviceCount > 0 : true)) {
        if (verbose) pushMsg("دستگاه آماده است.", { level: "info" });
        return { ok: true, status: s };
      }
      const msg = "لطفاً دستگاه اثر انگشت را وصل کنید.";
      pushMsg(msg, { level: "error" });
      setStatus("error");
      setError({ message: msg });
      return { ok: false, reason: "device-not-connected", status: s };
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "ارتباط با سرور برقرار نشد. لطفاً بعداً دوباره تلاش کنید.";
      pushMsg(msg, { level: "error" });
      setStatus("error");
      setError({ message: msg });
      return { ok: false, error: e, reason: "server-unreachable" };
    }
  }, [pushMsg, verbose]);

  // ---- servis çağrıları ----
  const doScanOnce = async () => {
    const res = await fingerprintService.scan({ TimeoutMs: 12000, IncludeImage: true });
    return res;
  };
  const doVerify = async (enrolledTemplateBase64) => {
    const res = await fingerprintService.verify({
      EnrolledTemplateBase64: enrolledTemplateBase64,
      TimeoutMs: 8000,
      IncludeImage: true,
    });
    return res;
  };
  const doIdentify = async () => {
    const res = await fingerprintService.identify({ TimeoutMs: 8000, IncludeImage: true });
    return res;
  };
  const doMatchTemplates = async (a, b) => {
    if (!matcherFn) {
      const m =
        "SDK از مقایسه «الگو با الگو» پشتیبانی نمی‌کند. لطفاً matchTemplates/compareTemplates/compare را در fingerprintService پیاده‌سازی کنید.";
      pushMsg(m, { level: "error" });
      throw new Error(m);
    }
    const res = await matcherFn.call(fingerprintService, { TemplateA: a, TemplateB: b });
    return res;
  };
  const doMergeTemplates = async (templates) => {
    const res = await fingerprintService.mergeTemplates({ TemplatesBase64: templates });
    return res;
  };

  const toPngDataUrl = (b64) =>
    !b64 ? "" : b64.startsWith("data:image/png;base64,") ? b64 : `data:image/png;base64,${b64}`;

  // ---- reset/close ----
  const resetUi = useCallback(() => {
    setScanCount(0);
    setRunning(false);
    setStatus("idle");
    setError(null);
    setDone(false);
    autoStartedRef.current = false;
    cancelRef.current.canceled = false;
    setMessages([]);
    lastMsgRef.current = "";
    t1Ref.current = t2Ref.current = t3Ref.current = null;
    lastBitmapRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    if (running) return; // çalışırken yanlışlıkla kapatmayı engelle
    cancelRef.current.canceled = true;
    resetUi();
    onClose && onClose();
  }, [onClose, resetUi, running]);

  // ESC ile kapatma (çalışmıyorken ve açıkken)
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape" && !running) handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, running, handleClose]);

  // ---- payload oluştur ----
  const makeCommonMeta = (extra = {}) => ({
    timestamp: new Date().toISOString(),
    mode,
    deviceId: extra.deviceId ?? extra?.deviceID ?? null,
    serialNumber: extra.serialNumber ?? null,
    deviceName: extra.deviceName ?? null,
    sdkMessage: extra.message ?? null,
  });

  const emitCompleted = (payload) => {
    onCompleted && onCompleted(payload);
  };

  // ---- CREATE: 3 okut + eşleşme doğrula + merge ----
  const runCreateFlow = useCallback(async () => {
    const s1 = await doScanOnce();
    if (cancelRef.current.canceled) return;
    if (!s1?.templateBase64) throw new Error("امکان دریافت نمونه در مرحله اول وجود نداشت.");
    t1Ref.current = s1.templateBase64;
    setScanCount(1);
    lastBitmapRef.current = s1?.imagePngBase64 || null;

    const s2 = await doScanOnce();
    if (cancelRef.current.canceled) return;
    if (!s2?.templateBase64) throw new Error("امکان دریافت نمونه در مرحله دوم وجود نداشت.");
    const cmp12 = await doMatchTemplates(t1Ref.current, s2.templateBase64);
    if (!cmp12 || typeof cmp12.score !== "number" || cmp12.score <= 0)
      throw new Error("نمونه دوم با نمونه اول مطابقت ندارد.");
    t2Ref.current = s2.templateBase64;
    setScanCount(2);
    lastBitmapRef.current = s2?.imagePngBase64 || lastBitmapRef.current;

    const s3 = await doScanOnce();
    if (cancelRef.current.canceled) return;
    if (!s3?.templateBase64) throw new Error("امکان دریافت نمونه در مرحله سوم وجود نداشت.");
    const cmp13 = await doMatchTemplates(t1Ref.current, s3.templateBase64);
    if (!cmp13 || typeof cmp13.score !== "number" || cmp13.score <= 0)
      throw new Error("نمونه سوم با نمونه اول مطابقت ندارد.");
    t3Ref.current = s3.templateBase64;
    setScanCount(3);
    lastBitmapRef.current = s3?.imagePngBase64 || lastBitmapRef.current;

    const mergeRes = await doMergeTemplates([t1Ref.current, t2Ref.current, t3Ref.current]);

    setDone(true);
    setStatus("success");
    pushMsg("ثبت اثر انگشت با موفقیت انجام شد.", { level: "info", force: true });

    emitCompleted({
      ...makeCommonMeta(s3),
      result: "success",
      action: "create",
      templates: [t1Ref.current, t2Ref.current, t3Ref.current],
      mergedTemplateBase64: mergeRes?.templateBase64 ?? null,
      lastBitmapPngBase64: toPngDataUrl(lastBitmapRef.current || ""),
      compareScores: {
        t1_t2: (typeof cmp12?.score === "number" && cmp12.score) || null,
        t1_t3: (typeof cmp13?.score === "number" && cmp13.score) || null,
      },
      raw: { step1: s1, step2: s2, step3: s3, merge: mergeRes },
      capturedCount: 3,
    });
  }, [pushMsg]);

  // ---- tek aksiyon (mode’a göre) ----
  const handleAction = useCallback(async () => {
    setRunning(true);
    setStatus("loading");
    setError(null);
    setMessages([]);
    lastMsgRef.current = "";

    // sunucu/cihaz kontrolü
    const chk = await checkServerAndDevice();
    if (!chk?.ok) {
      emitCompleted({
        ...makeCommonMeta(),
        result: "error",
        action: mode,
        errorMessage:
          chk?.status && !chk.status.deviceOpened ? "دستگاه متصل نیست." : "ارتباط با سرور برقرار نشد.",
      });
      setRunning(false);
      return;
    }

    try {
      if (mode === "match") {
        if (!knownTemplateBase64) throw new Error("الگوی ثبت‌شده‌ای برای تطبیق یافت نشد.");
        const v = await doVerify(knownTemplateBase64);
        setScanCount(1);
        if (!v || v.score <= 0) throw new Error("تطبیقی یافت نشد.");
        setDone(true);
        setStatus("success");
        pushMsg("تطبیق موفق بود.", { level: "info", force: true });

        // DOĞRU PNG: verify cevabındaki capturedImagePngBase64'i kullan
        lastBitmapRef.current = v?.capturedImagePngBase64 || lastBitmapRef.current;

        emitCompleted({
          ...makeCommonMeta(v),
          result: "success",
          action: "match",
          matched: true,
          score: v.score,
          lastBitmapPngBase64: toPngDataUrl(lastBitmapRef.current || ""),
          raw: { verify: v },
        });
        return;
      }

      if (mode === "matchOrCreate") {
        const id = await doIdentify();
        // matchedUserId -1/undefined değilse eşleşti
        if (
          id &&
          typeof id.matchedUserId !== "undefined" &&
          id.matchedUserId !== null &&
          id.matchedUserId !== -1
        ) {
          setScanCount(1);
          setDone(true);
          setStatus("success");
          pushMsg("کاربر شناسایی شد.", { level: "info", force: true });

          lastBitmapRef.current = id?.capturedImagePngBase64 || lastBitmapRef.current;

          emitCompleted({
            ...makeCommonMeta(id),
            result: "success",
            action: "identify",
            matched: true,
            matchedUserId: id.matchedUserId,
            score: id.score ?? null,
            lastBitmapPngBase64: toPngDataUrl(lastBitmapRef.current || ""),
            raw: { identify: id },
          });
          return;
        }
        // eşleşme yoksa sessizce kayıt akışına geç
        await runCreateFlow();
        return;
      }

      if (mode === "create") {
        await runCreateFlow();
        return;
      }
    } catch (e) {
      if (cancelRef.current.canceled) return;
      const msg = e?.response?.data?.message || e.message || "عملیات ناموفق بود.";
      setStatus("error");
      setError({ message: msg });
      pushMsg(msg, { level: "error" });

      emitCompleted({
        ...makeCommonMeta(),
        result: "error",
        action: mode,
        errorMessage: msg,
      });
    } finally {
      setRunning(false);
    }
  }, [mode, knownTemplateBase64, runCreateFlow, checkServerAndDevice, pushMsg]);

  // otomatik başlat
  useEffect(() => {
    if (!open) {
      cancelRef.current.canceled = true;
      autoStartedRef.current = false;
      return;
    }
    if (!autoStartedRef.current && !running && !done && status !== "loading") {
      autoStartedRef.current = true;
      cancelRef.current.canceled = false;
      (async () => {
        await handleAction();
      })();
    }
  }, [open, mode, done, status, running, handleAction]);

  // başarıda otomatik kapat (hata durumunda asla auto-close yok)
  useEffect(() => {
    if (!open) return;
    if (autoCloseOnSuccess && status === "success") {
      const t = setTimeout(() => {
        handleClose();
      }, Math.max(0, successCloseDelay || 0));
      return () => clearTimeout(t);
    }
  }, [status, autoCloseOnSuccess, successCloseDelay, handleClose, open]);

  const onRetry = () => {
    if (running) return;
    // TAM SIFIRLAMA
    setStatus("idle");
    setError(null);
    setDone(false);
    setScanCount(0);
    setMessages([]);
    lastMsgRef.current = "";
    t1Ref.current = null;
    t2Ref.current = null;
    t3Ref.current = null;
    lastBitmapRef.current = null;
    cancelRef.current.canceled = false;
    autoStartedRef.current = false;
  };

  const onConfirm = () => handleClose();

  if (!open) return null;

  const isDone = done || Math.min(scanCount, 3) >= 3 || status === "success";
  const safeStep = Math.min(scanCount, 3);
  const shouldShowProgress = showProgress && mode !== "match"; // yalnız create / matchOrCreate'da mantıklı

  return (
    <div
      className="fm-backdrop"
      onClick={() => {
        if (disableBackdropClose) return;
        if (!running) handleClose();
      }}
    >
      <div className="fm-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        {!isDone && (
          <div
            className="fm-modal__header"
            style={{
              position: "relative",
              background: "var(--accent)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
              padding: "14px 16px",
              borderTopLeftRadius: "8px",
              borderTopRightRadius: "8px",
              direction: "rtl",
            }}
          >
            <span style={{ flex: 1, textAlign: "center" }}>لطفاً انگشت خود را قرار دهید</span>
            <div style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)" }}>
              <Button
                iconOnly
                ariaLabel="بستن"
                onClick={handleClose}
                icon={X}
                primaryColor={dangerColor}
              />
            </div>
          </div>
        )}

        <div className="fm-modal__icon">
          {!isDone ? (
            <ProgressiveFingerprint svgString={SVG_FINGERPRINT} scanCount={scanCount} size={180} />
          ) : (
            <div style={{ display: "grid", gap: 12, placeItems: "center" }}>
              <BadgeCheck size={150} color="var(--role-success-fg, var(--accent))" />
              <Button size="md" type="button" primaryColor={primaryColor} onClick={onConfirm} disabled={running}>
                تایید
              </Button>
            </div>
          )}
        </div>

        {!isDone && shouldShowProgress && (
          <div className="fm-modal__progress" style={{ direction: "rtl" }}>{`مرحله: ${safeStep}/3`}</div>
        )}

        {/* MESAJ GÜNLÜĞÜ — sade (yalnızca gerekli olduğunda) */}
        {messages.length > 0 && (
          <div
            className="fm-modal__log"
            style={{
              direction: "rtl",
              textAlign: "right",
              maxHeight: 180,
              overflowY: "auto",
              padding: "8px 12px",
              margin: "8px 16px",
              borderRadius: 8,
              background: "var(--role-neutral-bg, #f7f7f7)",
              border: "1px solid var(--role-neutral-soft-border, #e5e7eb)",
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {messages.map((m) => (
              <div key={m.id}>• {m.text}</div>
            ))}
          </div>
        )}

        <div className="fm-modal__footer" style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          {status === "loading" && !isDone && (
            <Button size="md" type="button" primaryColor={secondaryColor} disabled>
              در حال اسکن...
            </Button>
          )}
          {status === "error" && !isDone && (
            <Button size="md" type="button" onClick={onRetry} primaryColor={dangerColor} disabled={running}>
              دوباره تلاش کنید
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}