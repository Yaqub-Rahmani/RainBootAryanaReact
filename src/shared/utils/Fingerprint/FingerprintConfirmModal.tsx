// FingerprintConfirmModal.tsx
import React, { useEffect, useRef, useState } from "react";

type CaptureMsg = {
  templateBase64: string;
  quality?: number;        // 0-100
  deviceSerial?: string;
  // (opsiyonel) köprüden gelebilir:
  // matchScore?: number;  // 0-100 aynı parmak doğrulaması için
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (result: {
    deviceSerial?: string;
    attempts: number;
    avgQuality: number | null;
    templates: { templateBase64: string; quality?: number }[];
  }) => void;
  wsUrl?: string;          // ws://127.0.0.1:1818
  requiredCaptures?: number; // 3
  minQuality?: number;     // 60 gibi
};

export default function FingerprintConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  wsUrl = "ws://127.0.0.1:1818",
  requiredCaptures = 3,
  minQuality = 60,
}: Props) {
  const [count, setCount] = useState(0);
  const [captures, setCaptures] = useState<CaptureMsg[]>([]);
  const [status, setStatus] = useState<"idle" | "connecting" | "ready" | "capturing" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setCount(0);
    setCaptures([]);
    setError(null);
    setStatus("connecting");

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("ready");
      ws.send(JSON.stringify({ type: "start_enroll", data: { attempts: requiredCaptures } }));
    };

    ws.onmessage = (evt) => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg?.type === "fingerprint_captured") {
          const cap: CaptureMsg = msg.data;
          // kalite filtresi (varsa)
          if (typeof cap.quality === "number" && cap.quality < minQuality) {
            // düşük kaliteyi UI'da gösterip sayaca eklemiyoruz
            setError(`Düşük kalite: ${cap.quality}. Lütfen tekrar deneyin.`);
            return;
          }
          setStatus("capturing");
          setCaptures((prev) => {
            const next = [...prev, cap];
            setCount(next.length);
            if (next.length >= requiredCaptures) {
              const avg =
                next.length > 0
                  ? Math.round(
                      next
                        .map((c) => (typeof c.quality === "number" ? c.quality : 0))
                        .reduce((a, b) => a + b, 0) / next.length
                    )
                  : null;

              setStatus("ok");
              onConfirm({
                deviceSerial: next[0]?.deviceSerial,
                attempts: next.length,
                avgQuality: avg,
                templates: next.map((c) => ({ templateBase64: c.templateBase64, quality: c.quality })),
              });
              // modalı parent kapatabilir; yine de WS’i kapatalım:
              try { ws.close(); } catch {}
            }
            return next;
          });
        } else if (msg?.type === "error") {
          setStatus("error");
          setError(msg?.data?.message ?? "Köprüden hata döndü.");
        }
      } catch {
        // biçimsiz mesajı yok say
      }
    };

    ws.onerror = () => {
      setStatus("error");
      setError("Yerel köprüye bağlanılamadı.");
    };

    ws.onclose = () => {
      // no-op
    };

    return () => {
      try { ws.close(); } catch {}
      wsRef.current = null;
    };
  }, [isOpen, wsUrl, requiredCaptures, minQuality, onConfirm]);

  if (!isOpen) return null;

  const progress = Math.min(100, Math.round((count / requiredCaptures) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold mb-1">Parmak İzi Doğrulama</h3>
        <p className="text-sm text-gray-600 mb-4">
          Parmağınızı okuyucuya {requiredCaptures} kez okutun. Modal, yalnızca onay sonucunu döndürecek.
        </p>

        <div className="h-2 w-full bg-gray-200 rounded overflow-hidden">
          <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-2 text-sm">{count}/{requiredCaptures}</div>

        {status === "connecting" && <div className="mt-3 text-sm">Köprüye bağlanılıyor…</div>}
        {status === "ready" && <div className="mt-3 text-sm">Hazır. Parmağınızı okutun…</div>}
        {status === "capturing" && <div className="mt-3 text-sm">Okumaya devam…</div>}
        {status === "ok" && <div className="mt-3 text-sm text-emerald-600">Onaylandı — modal kapatılabilir.</div>}
        {status === "error" && <div className="mt-3 text-sm text-red-600">{error}</div>}
        {!!error && status !== "error" && <div className="mt-2 text-xs text-amber-700">{error}</div>}

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
