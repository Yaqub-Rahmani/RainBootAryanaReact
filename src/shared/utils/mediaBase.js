// Tek sorumluluk: Medya kök URL'ini belirlemek ve cache’lemek

let _cachedBase;

/**
 * Belirleme sırası:
 *  1) import.meta.env.VITE_MEDIA_BASE_URL  (önerilen)
 *  2) window.__APP_MEDIA_BASE__            (opsiyonel global, index.html’de set edilebilir)
 *  3) import.meta.env.VITE_API_URL         (API ile aynı origin/CDN kullanılıyorsa)
 *  4) window.location.origin               (en son çare)
 */
export function getMediaBase() {
  if (_cachedBase !== undefined) return _cachedBase;

  const envMedia = (import.meta?.env?.VITE_MEDIA_BASE_URL || '').trim();
  const globalMedia = (typeof window !== 'undefined' ? (window.__APP_MEDIA_BASE__ || '') : '').trim();
  const envApi = (import.meta?.env?.VITE_API_URL || '').trim();

  // Yardımcılar
  const stripTrailing = (s) => s.replace(/\/+$/, '');
  const isNonEmpty = (s) => typeof s === 'string' && s.length > 0;

  let base = '';
  if (isNonEmpty(envMedia)) base = envMedia;
  else if (isNonEmpty(globalMedia)) base = globalMedia;
  else if (isNonEmpty(envApi)) base = envApi;
  else if (typeof window !== 'undefined' && isNonEmpty(window.location.origin)) base = window.location.origin;

  _cachedBase = stripTrailing(base);
  return _cachedBase;
}
