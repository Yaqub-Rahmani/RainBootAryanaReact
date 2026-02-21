import { getTokens } from "../services/apiClient";

const BASE = (import.meta.env.VITE_API_URL || "").replace(/\/+$/, "");

function joinUrl(base, path) {
  if (!base) return path; // Vite proxy
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function readErrorText(res) {
  try {
    const t = await res.text();
    return t || `${res.status} ${res.statusText}`;
  } catch {
    return `${res.status} ${res.statusText}`;
  }
}

export async function fetchPdfBlob(path, { method = "GET", body } = {}) {
  const url = joinUrl(BASE, path);
  const tokens = getTokens();

  const hasBody = method !== "GET" && body !== undefined && body !== null;

  const headers = {
    Accept: "application/pdf",
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    ...(hasBody ? { "Content-Type": "application/json" } : {}),
  };

  const res = await fetch(url, {
    method,
    headers,
    body: hasBody ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const msg = await readErrorText(res);
    throw new Error(msg);
  }

  return await res.blob();
}

export function downloadBlob(blob, filename = "report.pdf") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function openBlobForPrint(blob) {
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    alert("مرورگر اجازهٔ باز کردن پنجرهٔ جدید را نداد.");
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return;
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
