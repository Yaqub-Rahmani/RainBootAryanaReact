// src/shared/components/FilePicker/FilePicker.jsx
import React, { useEffect, useRef } from "react";
import Button from "../../components/Button";
import { Paperclip, Trash2 } from "lucide-react";

/* --- helpers (geliştirilmiş kabul kontrolü, aynı UI) --- */
const KB = 1024;
const MB = 1024 * KB;

const parseAccept = (accept) =>
  String(accept || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const matchesAccept = (file, acceptList) => {
  if (!acceptList.length || acceptList.includes("*")) return true;
  const name = file.name?.toLowerCase?.() || "";
  const type = file.type?.toLowerCase?.() || "";
  const ext = name.includes(".") ? `.${name.split(".").pop()}` : "";
  return acceptList.some((p) => {
    if (p.startsWith(".")) return ext === p;       // .pdf
    if (p.endsWith("/*")) return type.startsWith(p.slice(0, -1)); // image/*
    return type === p;                              // application/pdf
  });
};

const validateFile = (f, { accept, maxFileSizeMB }) => {
  if (!f) return { ok: true };
  if (maxFileSizeMB && f.size > maxFileSizeMB * MB) {
    return { ok: false, msg: `حداکثر حجم فایل ${maxFileSizeMB} مگابایت است.` };
  }
  const allow = parseAccept(accept);
  if (!matchesAccept(f, allow)) {
    return { ok: false, msg: `انواع مجاز: ${accept || "*"}` };
  }
  return { ok: true };
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${(bytes / KB).toFixed(1)} KB`;
};

const maskedLabel = (file) => {
  if (!file) return "";
  const dot = file.name.lastIndexOf(".");
  const ext = dot === -1 ? "" : file.name.slice(dot).toUpperCase();
  return `***${ext || ""}`; // ***.PDF
};

export default function FilePicker({
  value,
  onChange,
  accept = ".pdf,.jpg,.jpeg,.png",
  maxFileSizeMB = 10,
  error,
}) {
  const dropRef = useRef(null);

  const maybeSetFile = (f) => {
    const res = validateFile(f, { accept, maxFileSizeMB });
    if (!res.ok) return onChange?.(null, res.msg);
    onChange?.(f, null);
  };

  useEffect(() => {
    const el = dropRef.current;
    if (!el) return;
    const prevent = (e) => { e.preventDefault(); e.stopPropagation(); };

    const onDragEnter = (e) => { prevent(e); el.classList.add("fsm-drop--hover"); };
    const onDragOver  = (e) => { prevent(e); el.classList.add("fsm-drop--hover"); };
    const onDragLeave = (e) => { prevent(e); el.classList.remove("fsm-drop--hover"); };
    const onDrop      = (e) => {
      prevent(e);
      el.classList.remove("fsm-drop--hover");
      const f = e.dataTransfer?.files?.[0];
      if (f) maybeSetFile(f);
    };

    el.addEventListener("dragenter", onDragEnter);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragenter", onDragEnter);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, []);

  const handleFilePick = (e) => {
    const f = e.target?.files?.[0];
    if (f) maybeSetFile(f);
    e.target.value = ""; // aynı dosyayı tekrar seçebilmek için
  };

  return (
    <div className="fsm-filepicker">
      {!value ? (
        <div
          className="fsm-drop"
          ref={dropRef}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.currentTarget.querySelector("input[type=file]")?.click();
            }
          }}
          aria-label="انتخاب فایل"
          aria-describedby={error ? "err-file" : undefined}
        >
          <label className="fsm-btn fsm-btn--primary fsm-btn--xl">
            <span className="fsm-btn-icon" aria-hidden>
              <Paperclip className="w-4 h-4" />
            </span>
            <span>انتخاب فایل</span>
            <input
              type="file"
              onChange={handleFilePick}
              className="fsm-file-input"
              accept={accept}
            />
          </label>
        </div>
      ) : (
        <div className="fsm-file-selected" aria-live="polite">
          <div className="fsm-file-brief">
            <span className="fsm-file-mask">{maskedLabel(value)}</span>
            <span className="fsm-file-sep">—</span>
            <span className="fsm-file-size">{formatBytes(value.size)}</span>
          </div>

          <div className="fsm-file-actions">
            <label className="fsm-btn fsm-btn--primary fsm-btn--xl">
              <span className="fsm-btn-icon" aria-hidden>📎</span>
              <span>تغییر فایل</span>
              <input
                type="file"
                onChange={handleFilePick}
                className="fsm-file-input"
                accept={accept}
              />
            </label>

            {/* Kendi Button bileşenini KULLANARAK stil bütünlüğü korunur */}
            <Button
              type="button"
              iconOnly
              icon={Trash2}
              className="fsm-btn fsm-btn--danger fsm-btn--md"
              onClick={() => onChange?.(null, null)}
              aria-label="حذف فایل"
              title="حذف فایل"
            />
          </div>
        </div>
      )}

      {error && <div className="fsm-error" id="err-file" role="alert">{error}</div>}
    </div>
  );
}
