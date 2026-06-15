// src/pages/Dashboard.jsx – Enterprise Dashboard
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api, { fmtGHS } from '../utils/api';
import { useBranch } from '../App';

const StatCard = ({ label, value, color, sub, icon, pct }) => (
  <div className="kpi" style={{ color }}>
    <div className="kpi-label">{label}</div>
    <div className="kpi-val" style={{ color, fontSize: value && String(value).length > 8 ? 16 : 22 }}>{value ?? '—'}</div>
    {sub  && <div className="kpi-sub">{sub}</div>}
    {pct != null && (
      <div className="kpi-track">
        <div className="kpi-fill" style={{ width: `${Math.min(pct,100)}%`, background: color }} />
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const [kpis,    setKpis]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const branchCtx = useBranch();
  const branchQS  = branchCtx?.branchQS || {};

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    api.get('/reports/dashboard/', { params: branchQS })
      .then(r => {
        if (r.data?.detail) {
          setError(r.data.detail);
        } else {
          setKpis(r.data);
          setError(null);
        }
      })
      .catch(e => setError(e.response?.data?.detail || e.message || 'Dashboard data failed to load.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchCtx?.activeBranchId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const fleet  = kpis?.fleet         || {};
  const month  = kpis?.this_month    || {};
  const alerts = kpis?.expiry_alerts || [];
  const truckBreakdown = kpis?.truck_breakdown || [];

  const rev  = parseFloat(month.revenue     || 0);
  const exp  = parseFloat(month.expenditure || 0);
  const margin = rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0;

  const tripsCount = month.trips != null ? month.trips : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button className="btn btn-ghost" onClick={fetchDashboard} disabled={loading}
          style={{ fontSize: 12, padding: '5px 12px' }}>
          {loading ? '⏳ Loading…' : '🔄 Refresh'}
        </button>
      </div>
      {error && (
        <div className="alert alert-warn mb16" style={{ borderRadius: 10, fontWeight: 500, color: 'var(--red)', background: '#fff5f5', borderColor: 'var(--red)' }}>
          ⚠️&nbsp; <strong>Dashboard error:</strong> {error}
        </div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>Loading dashboard…</div>
      )}
      {alerts.length > 0 && (
        <div className="alert alert-warn mb16" style={{ borderRadius: 10, fontWeight: 500 }}>
          ⚠️&nbsp; <strong>{alerts.length} document{alerts.length > 1 ?
