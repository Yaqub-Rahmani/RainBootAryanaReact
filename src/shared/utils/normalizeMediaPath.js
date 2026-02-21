import { getMediaBase } from "./mediaBase";

/**
 * Amaç:
 *  - Mutlak (https/file/data/blob) URL’lere dokunma
 *  - "storage/..." gibi göreli yolları tek merkezden gelen base ile birleştir
 *  - Base belirleme sorumluluğu getMediaBase()’te
 */
export function normalizeMediaPath(path) {
  if (!path || typeof path !== 'string') return null;

  const trimmed = path.trim();
  if (!trimmed) return null;

  // Mutlak/güvenli şemalar: dokunma
  if (/^(?:https?:)?\/\//i.test(trimmed)) return trimmed; // https:// veya //cdn...
  if (/^(?:data|blob):/i.test(trimmed)) return trimmed;   // data:, blob:

  // Baş/son slash temizlemesi + birleştirme
  const cleanPath = trimmed.replace(/^\/+/, '');
  const base = getMediaBase();

  if (!base) {
    // Geliştirme ortamında açık uyarı; prod’da sessiz kal
    if (import.meta?.env?.DEV) {
      // eslint-disable-next-line no-console
      console.warn(
        '⚠️ [normalizeMediaPath] Uyarı: media base belirlenemedi. ' +
        'Lütfen VITE_MEDIA_BASE_URL (ya da window.__APP_MEDIA_BASE__) tanımlayın.',
        { path: trimmed }
      );
    }
    // En risksiz fallback: relative absolute → /storage/... (aynı origin denemesi)
    return '/' + cleanPath;
  }

  return `${base}/${cleanPath}`;
}
