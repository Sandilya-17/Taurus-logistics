// src/utils/api.js – Axios instance with JWT auth + auto-refresh + global error handling
import axios from 'axios';
import toast from 'react-hot-toast';

const BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000, // 30-second timeout (enterprise: avoids hanging requests)
});

// ── Request: attach access token ────────────────────────────
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── Response: auto-refresh on 401 + global error toasts ─────
let refreshing = null;

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    // ── 401: Try refresh token ──────────────────────────────
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        refreshing = axios
          .post(`${BASE}/auth/refresh/`, { refresh: localStorage.getItem('refresh') })
          .then(r => {
            localStorage.setItem('access', r.data.access);
            if (r.data.refresh) localStorage.setItem('refresh', r.data.refresh);
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

    // ── 429: Rate limited ────────────────────────────────────
    if (err.response?.status === 429) {
      toast.error('⏱ Too many requests. Please slow down.');
      return Promise.reject(err);
    }

    // ── 500+: Server errors ──────────────────────────────────
    if (err.response?.status >= 500) {
      toast.error('🔴 Server error. Please try again or contact support.');
      return Promise.reject(err);
    }

    // ── Network / timeout errors ─────────────────────────────
    if (!err.response) {
      toast.error('🌐 Network error. Check your connection.');
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

// ── Date formatter ───────────────────────────────────────────
export const fmtDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return val; }
};

// ── DateTime formatter ───────────────────────────────────────
export const fmtDateTime = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
      timeZone: 'Africa/Accra',
    });
  } catch { return val; }
};

// ── Today's date string (YYYY-MM-DD) ────────────────────────
export const todayGH = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });

// ── Purchase calculation helper ──────────────────────────────
export const calcPurchase = (qty, price, vatOn, vatPct) => {
  const q = parseFloat(qty)   || 0;
  const p = parseFloat(price) || 0;
  const base_amount  = q * p;
  const vat_amount   = vatOn ? base_amount * (parseFloat(vatPct) || 0) / 100 : 0;
  const final_amount = base_amount + vat_amount;
  return { base_amount, vat_amount, final_amount };
};

// ── Fuel calculation helper ──────────────────────────────────
export const calcFuel = (litres, limit, price) => {
  const l   = parseFloat(litres) || 0;
  const lim = parseFloat(limit)  || 0;
  const p   = parseFloat(price)  || 0;
  const total_cost  = l * p;
  const excess_fuel = lim > 0 ? Math.max(0, l - lim) : 0;
  const excess_cost = excess_fuel * p;
  return { total_cost, excess_fuel, excess_cost };
};

// ── Trip calculation helper ──────────────────────────────────
export const calcTrip = (loaded, delivered, rate) => {
  const lo = parseFloat(loaded)    || 0;
  const de = parseFloat(delivered) || 0;
  const r  = parseFloat(rate)      || 0;
  const qty_difference = lo - de;
  const trip_revenue   = de * r;
  return { qty_difference, trip_revenue };
};

// ── Duration helper (datetime strings) ──────────────────────
export const calcDuration = (start, end) => {
  if (!start || !end) return '';
  const diff = new Date(end) - new Date(start);
  if (isNaN(diff) || diff < 0) return '';
  const totalMins = Math.floor(diff / 60000);
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

// ── Error message extractor ──────────────────────────────────
export const getErrorMessage = (err, fallback = 'An error occurred.') => {
  return err?.response?.data?.message
    || err?.response?.data?.detail
    || err?.response?.data?.non_field_errors?.[0]
    || err?.message
    || fallback;
};

export default api;
