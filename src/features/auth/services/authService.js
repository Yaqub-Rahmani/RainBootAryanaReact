
import { api, setTokens, clearTokens, getTokens } from '../../../shared/services/apiClient';

/** ---- Helpers ---- **/

// 1) Token'ı response'tan al ve kaydet
function saveTokenFromResponse(data) {
  const token = data?.accessToken || data?.token || data?.jwt || null;
  if (token) setTokens({ accessToken: token });
  return token;
}

// 2) Esnek user çıkarımı (farklı backend response şekilleri için)
function extractUserFlexible(data) {
  if (!data || typeof data !== 'object') return null;

  // Yaygın: { user: {...} }
  if (data.user) return data.user;

  // { data: { user: {...} } }  |  { result: { user: {...} } }
  if (data.data?.user) return data.data.user;
  if (data.result?.user) return data.result.user;

  // Kök seviyede user alanları direkt gelebilir
  const looksLikeUser =
    ('email' in data) || ('firstName' in data) || ('lastName' in data) || ('id' in data);

  // Dönüş hem token hem user alanlarını aynı kökte içeriyorsa ayıralım
  const alsoHasTokenField = ('accessToken' in data) || ('token' in data) || ('jwt' in data);

  if (looksLikeUser && !alsoHasTokenField) {
    return {
      id: data.id ?? null,
      email: data.email ?? null,
      firstName: data.firstName ?? data.given_name ?? null,
      lastName: data.lastName ?? data.family_name ?? null,
      ...data,
    };
  }

  // looksLikeUser && alsoHasTokenField ise doğrudan user alanlarını süzüp döndürelim
  if (looksLikeUser && alsoHasTokenField) {
    const { id, email, firstName, lastName, given_name, family_name, ...rest } = data;
    return {
      id: id ?? null,
      email: email ?? null,
      firstName: firstName ?? given_name ?? null,
      lastName: lastName ?? family_name ?? null,
      ...rest,
    };
  }

  return null;
}

// 3) JWT'den kullanıcı çıkarmak (opsiyonel)
let cachedJwtDecode = null;
async function getJwtDecode() {
  if (cachedJwtDecode) return cachedJwtDecode;
  try {
    const mod = await import('jwt-decode');
    cachedJwtDecode = mod?.jwtDecode || null;
  } catch {
    cachedJwtDecode = null;
  }
  return cachedJwtDecode;
}
async function userFromJwt(token) {
  if (!token) return null;
  const jwtDecode = await getJwtDecode();
  if (!jwtDecode) return null;

  try {
    const p = jwtDecode(token);

    // ---- ID tespiti (geniş kapsama) ----
    const id =
      p.sub ||
      p.nameid ||
      p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      p.sid ||
      p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/sid'] ||
      p.userId || p.userid || p.uid ||
      p.id || null;

    // ---- Email & Ad tespiti (senin claim’lerine göre) ----
    const email =
      p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
      p.email || p.unique_name || null;

    const fullName =
      p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
      p.name || null;

    let firstName = null, lastName = null;
    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts[0] ?? null;
      lastName  = parts.length > 1 ? parts.slice(1).join(' ') : null;
    }

    const rolesRaw = p.role ??
      p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'];
    const roles = rolesRaw
      ? (Array.isArray(rolesRaw) ? rolesRaw : [rolesRaw])
      : [];

    return { id: id ?? null, email, firstName, lastName, roles, claims: p };
  } catch {
    return null;
  }
}
/** ---- Public API ---- **/
export const authApi = {
  async login({ email, password }) {
    const data = await api.post('/api/Auth/login', { email, password });

    // 1) Token'ı kaydet
    const token = saveTokenFromResponse(data);

    // 2) Response içinden user çek
    let user = extractUserFlexible(data);

    // 3) /me varsa dene
    if (!user) {
      try {
        user = await api.get('/api/Auth/me');
      } catch {
        /* yoksa/hata ise geç */
      }
    }

    // 4) JWT'den çöz (opsiyonel)
    if (!user) {
      user = await userFromJwt(token);
    }

    return user || null;
  },

  async register({ firstName, lastName, email, password }) {
    const data = await api.post('/api/Auth/register', { firstName, lastName, email, password });

    const token = saveTokenFromResponse(data);

    let user = extractUserFlexible(data);
    if (!user) {
      try {
        user = await api.get('/api/Auth/me');
      } catch {}
    }
    if (!user) {
      user = await userFromJwt(token);
    }

    return user || null;
  },

  async me() {
    // Backend'in varsa kullanılır; yoksa bu çağrıyı kullanma
    return api.get('/api/Auth/me');
  },

  logout() {
    clearTokens();
  },

  hasToken() {
    return !!getTokens()?.accessToken;
  },
};
