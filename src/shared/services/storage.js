export const storage = {
  getJSON(key, fallback=null) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  setJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  get(key, fallback=null) {
    const v = localStorage.getItem(key);
    return v ?? fallback;
  },
  set(key, value) { localStorage.setItem(key, value); },
};
