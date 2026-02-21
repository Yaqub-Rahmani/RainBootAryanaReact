// Geliştirmede Vite proxy kullanmak için BASE'i boş bırak.
// Prod'da .env dosyasında VITE_API_URL ver (örn: http://localhost:7335).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// ---- Token Storage (localStorage) ----
const TOKEN_KEY = 'auth_tokens'; // {accessToken, refreshToken, expiresAt}
export function getTokens() {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null; } catch { return null; }
}
export function setTokens(tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); }
export function clearTokens() { localStorage.removeItem(TOKEN_KEY); }

// ---- Simple event bus to notify logout need ----
const listeners = new Set();
export function onAuthEvent(cb){ listeners.add(cb); return () => listeners.delete(cb); }
function emitAuthEvent(type){ listeners.forEach(cb => cb(type)); }

// ---- Helpers ----
function joinUrl(base, path) {
  if (!base) return path; // proxy veya relative kullanım
  if (!path) return base;
  return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
}
function isFormData(body) {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}
function normalizeTokenResponse(data) {
  const accessToken = data?.accessToken || data?.token || data?.jwt || null;
  const refreshToken = data?.refreshToken ?? null;
  const expiresAt   = data?.expiresAt ?? null;
  return { accessToken, refreshToken, expiresAt };
}

// ---- Core request with auto-refresh ----
async function coreFetch(path, options = {}, retry = true) {
  const url = joinUrl(BASE, path);
  const tokens = getTokens();

  const hasBody = options.body !== undefined && options.body !== null;

  const headers = {
    ...(options.headers || {}),
    ...(hasBody && !isFormData(options.body) ? { 'Content-Type': 'application/json' } : {}),
    ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
  };

  const fetchOptions = {
    method: options.method || 'GET',
    body: isFormData(options.body) ? options.body
         : (hasBody && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body),
    headers,
  };

  const res = await fetch(url, fetchOptions);

  // 401 ise ve refresh token varsa bir kez yenilemeyi dene
  const isAuthPath = /\/api\/Auth\/(login|register|refresh)/i.test(path || '');
  if (res.status === 401 && retry && tokens?.refreshToken && !isAuthPath) {
    const ok = await tryRefresh(tokens.refreshToken);
    if (ok) return coreFetch(path, options, false);
    emitAuthEvent('logout');
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType || res.status === 204) return null;

  if (contentType.includes('application/json')) return res.json();
  return res.text();
}

async function tryRefresh(refreshToken) {
  try {
    const url = joinUrl(BASE, '/api/Auth/refresh');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;

    const data = await res.json();
    const prev = getTokens() || {};
    const norm = normalizeTokenResponse(data);
    if (!norm.accessToken) return false;

    setTokens({
      ...prev,
      ...norm,
      refreshToken: norm.refreshToken || prev.refreshToken || null,
    });
    return true;
  } catch {
    return false;
  }
}

// ---- Public API ----
export const api = {
  get: (p, opts = {}) => coreFetch(p, { ...opts, method: 'GET' }),
  post: (p, body, opts = {}) => coreFetch(p, { ...opts, method: 'POST', body }),
  put: (p, body, opts = {}) => coreFetch(p, { ...opts, method: 'PUT', body }),
  del: (p, opts = {}) => coreFetch(p, { ...opts, method: 'DELETE' }),
};

// // Geliştirmede Vite proxy kullanmak için BASE'i boş bırak.
// // Prod'da .env dosyasında VITE_API_URL ver (örn: https://api.example.com).
// const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, ''); // sondaki /'ı temizle

// // ---- Token Storage (localStorage) ----
// const TOKEN_KEY = 'auth_tokens'; // {accessToken, refreshToken, expiresAt}
// export function getTokens() {
//   try { return JSON.parse(localStorage.getItem(TOKEN_KEY)) || null; } catch { return null; }
// }
// export function setTokens(tokens) { localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens)); }
// export function clearTokens() { localStorage.removeItem(TOKEN_KEY); }

// // ---- Simple event bus to notify logout need ----
// const listeners = new Set();
// export function onAuthEvent(cb){ listeners.add(cb); return () => listeners.delete(cb); }
// function emitAuthEvent(type){ listeners.forEach(cb => cb(type)); }

// // ---- Helpers ----
// function joinUrl(base, path) {
//   if (!base) return path; // proxy veya relative kullanım
//   if (!path) return base;
//   return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
// }
// function isFormData(body) {
//   return typeof FormData !== 'undefined' && body instanceof FormData;
// }
// function normalizeTokenResponse(data) {
//   // Backend token alan adı farklı olabilir: token | accessToken | jwt
//   const accessToken = data?.accessToken || data?.token || data?.jwt || null;
//   const refreshToken = data?.refreshToken ?? null;
//   const expiresAt   = data?.expiresAt ?? null;
//   return { accessToken, refreshToken, expiresAt };
// }

// // ---- Core request with auto-refresh ----
// async function coreFetch(path, options = {}, retry = true) {
//   const url = joinUrl(BASE, path);
//   const tokens = getTokens();

//   const headers = {
//     ...(options.headers || {}),
//     // Body FormData değilse JSON için Content-Type ayarla
//     ...(!isFormData(options.body) ? { 'Content-Type': 'application/json' } : {}),
//     ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
//   };

//   const fetchOptions = {
//     method: options.method || 'GET',
//     // JSON body ise stringle
//     body: isFormData(options.body) ? options.body
//          : (options.body && typeof options.body !== 'string' ? JSON.stringify(options.body) : options.body),
//     headers,
//   };

//   const res = await fetch(url, fetchOptions);

//   // 401 ise ve refresh token varsa bir kez yenilemeyi dene
//   const isAuthPath = /\/api\/Auth\/(login|register|refresh)/i.test(path || '');
//   if (res.status === 401 && retry && tokens?.refreshToken && !isAuthPath) {
//     const ok = await tryRefresh(tokens.refreshToken);
//     if (ok) return coreFetch(path, options, false);
//     emitAuthEvent('logout');
//   }

//   if (!res.ok) {
//     const text = await res.text().catch(() => '');
//     throw new Error(`${res.status} ${res.statusText} ${text}`.trim());
//   }

//   // Boş gövde / 204
//   const contentType = res.headers.get('content-type') || '';
//   if (!contentType || res.status === 204) return null;

//   if (contentType.includes('application/json')) return res.json();
//   return res.text(); // JSON değilse metin döndür
// }

// async function tryRefresh(refreshToken) {
//   try {
//     const url = joinUrl(BASE, '/api/Auth/refresh'); // C# tarafına uygun
//     const res = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ refreshToken }),
//     });
//     if (!res.ok) return false;

//     const data = await res.json(); // { accessToken?|token?|jwt?, refreshToken?, expiresAt? }
//     const prev = getTokens() || {};
//     const norm = normalizeTokenResponse(data);
//     if (!norm.accessToken) return false;

//     setTokens({
//       ...prev,
//       ...norm,
//       // refreshToken dönmüyorsa eskisini koru
//       refreshToken: norm.refreshToken || prev.refreshToken || null,
//     });
//     return true;
//   } catch {
//     return false;
//   }
// }

// // ---- Public API ----
// export const api = {
//   get: (p, opts = {}) => coreFetch(p, { ...opts, method: 'GET' }),
//   post: (p, body, opts = {}) => coreFetch(p, { ...opts, method: 'POST', body }),
//   put: (p, body, opts = {}) => coreFetch(p, { ...opts, method: 'PUT', body }),
//   del: (p, opts = {}) => coreFetch(p, { ...opts, method: 'DELETE' }),
// };