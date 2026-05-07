// src/utils/api.js  – Axios instance with JWT auto-refresh | Taurus ERP
import axios from 'axios';

const BASE = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({ baseURL: BASE, headers: { 'Content-Type': 'application/json' } });

// Attach access token to every request
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('access');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// On 401 → refresh token once, then retry
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) { prom.reject(error); }
    else { prom.resolve(token); }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  r => r,
  async err => {
    const orig = err.config;
    if (err.response?.status === 401 && !orig._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          orig.headers.Authorization = `Bearer ${token}`;
          return api(orig);
        }).catch(e => Promise.reject(e));
      }
      orig._retry = true;
      isRefreshing = true;
      try {
        const refresh = localStorage.getItem('refresh');
        if (!refresh) { localStorage.clear(); window.location.href = '/login'; return Promise.reject(err); }
        const { data } = await axios.post(`${BASE}/auth/refresh/`, { refresh });
        localStorage.setItem('access', data.access);
        orig.headers.Authorization = `Bearer ${data.access}`;
        processQueue(null, data.access);
        return api(orig);
      } catch (e) {
        processQueue(e, null);
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ── Calculation Helpers ──────────────────────────────────────────────────────

export const calcPurchase = (qty, price, vatOn, vatPct) => {
  const base = parseFloat(qty || 0) * parseFloat(price || 0);
  const vat  = vatOn ? base * (parseFloat(vatPct || 0) / 100) : 0;
  return { base_amount: base, vat_amount: vat, final_amount: base + vat };
};

export const calcInvoiceLine = (qty, rate) =>
  parseFloat(qty || 0) * parseFloat(rate || 0);

export const calcInvoiceTotals = (lines, vatOn, vatPct) => {
  const subtotal = lines.reduce((s, l) => s + calcInvoiceLine(l.quantity, l.unit_price), 0);
  const vat      = vatOn ? subtotal * (parseFloat(vatPct || 0) / 100) : 0;
  return { subtotal, vat_amount: vat, total_amount: subtotal + vat };
};

export const calcFuel = (litres, limit, pricePerLitre) => {
  const l   = parseFloat(litres || 0);
  const lim = parseFloat(limit  || 0);
  const ppl = parseFloat(pricePerLitre || 0);
  const excess = lim > 0 ? Math.max(0, l - lim) : 0;
  return { excess_fuel: excess, total_cost: l * ppl, excess_cost: excess * ppl };
};

export const calcTrip = (loadedQty, deliveredQty, ratePerTon) => {
  const loaded    = parseFloat(loadedQty    || 0);
  const delivered = parseFloat(deliveredQty || 0);
  const rate      = parseFloat(ratePerTon   || 0);
  // Revenue based on delivered qty (what was actually delivered)
  const trip_revenue = delivered > 0 ? delivered * rate : loaded * rate;
  return { qty_difference: loaded - delivered, trip_revenue };
};

export const calcDuration = (loadingTime, unloadingTime) => {
  if (!loadingTime || !unloadingTime) return null;
  const diff = new Date(unloadingTime) - new Date(loadingTime);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}h ${m}m`;
};

// ── Profit / Loss helper ─────────────────────────────────────────────────────
export const calcProfitLoss = (revenue, expenditure) => {
  const r = parseFloat(revenue    || 0);
  const e = parseFloat(expenditure || 0);
  const net    = r - e;
  const margin = r > 0 ? ((net / r) * 100) : 0;
  return { net, margin, isProfit: net >= 0 };
};

// ── Formatting Helpers (Ghana locale) ───────────────────────────────────────

/** Format as Ghana Cedis — GH₵ 1,250.00 */
export const fmtGHS = v =>
  `GH₵\u00A0${parseFloat(v || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Format number with commas — 1,250.50 */
export const fmtNum = v =>
  parseFloat(v || 0).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Format date as 04 May 2026 */
export const fmtDate = d => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: 'Africa/Accra'
  });
};

/** Format datetime as 04 May 2026, 11:39 AM (Ghana time) */
export const fmtDateTime = d => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
    timeZone: 'Africa/Accra'
  });
};

/** Today's date as YYYY-MM-DD (Ghana time) */
export const todayGH = () => {
  const now = new Date();
  return now.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }); // en-CA gives YYYY-MM-DD
};
