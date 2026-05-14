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

// ── Date formatter ───────────────────────────────────────────
export const fmtDate = (val) => {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return val; }
};

// ── Today's date string (YYYY-MM-DD) ────────────────────────
export const todayGH = () => new Date().toISOString().split('T')[0];

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
  const l = parseFloat(litres) || 0;
  const lim = parseFloat(limit)  || 0;
  const p = parseFloat(price)  || 0;
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

// ── Duration helper (HH:MM strings → "X hrs Y mins") ────────
export const calcDuration = (start, end) => {
  if (!start || !end) return '';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  let mins = (eh * 60 + em) - (sh * 60 + sm);
  if (mins < 0) mins += 24 * 60;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export default api;
