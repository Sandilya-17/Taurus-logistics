// src/utils/api.js – Axios instance with JWT auth + auto-refresh
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request: attach access token ────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Response: auto-refresh on 401 ───────────────────────────
let refreshing = null;

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = axios
          .post(`${BASE}/auth/refresh/`, { refresh: localStorage.getItem('refresh') })
          .then(r => {
            localStorage.setItem('access', r.data.access);
            return r.data.access;
          })
          .catch(() => {
            localStorage.clear();
            window.location.href = '/login';
            return Promise.reject(err);
          })
          .finally(() => { refreshing = null; });
      }
      try {
        const newToken = await refreshing;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch {
        return Promise.reject(err);
      }
    }
    return Promise.reject(err);
  }
);

// ── Currency formatter ───────────────────────────────────────
export const fmtGHS = (val) => {
  const n = parseFloat(val);
  if (isNaN(n)) return 'GH₵ 0.00';
  return 'GH₵ ' + n.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export default api;
