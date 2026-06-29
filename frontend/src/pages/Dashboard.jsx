// src/pages/Dashboard.jsx – Executive Enterprise Dashboard
import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useBranch, useCurrency } from '../App';

/* ── Inline SVG icons ─────────────────────────────────────── */
const Ic = ({ children, size = 20 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);
const IcTruck    = () => <Ic><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a2 2 0 0 0-.59-1.42L17.5 9H14v8h3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></Ic>;
const IcDriver   = () => <Ic><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></Ic>;
const IcTrip     = () => <Ic><path d="M5 12h14M12 5l7 7-7 7"/></Ic>;
const IcRevenue  = () => <Ic><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></Ic>;
const IcFuel     = () => <Ic><path d="M3 22h12V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1z"/><path d="M15 9h2a2 2 0 0 1 2 2v6a2 2 0 0 0 2 2h0V8l-3-3"/></Ic>;
const IcStock    = () => <Ic><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></Ic>;
const IcExpend   = () => <Ic><path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z"/><path d="M12 6v6l4 2"/></Ic>;
const IcAlert    = () => <Ic><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></Ic>;
const IcCheck    = () => <Ic><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></Ic>;
const IcRefresh  = () => <Ic><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></Ic>;
const IcBar      = () => <Ic><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></Ic>;
const IcLink     = () => <Ic><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></Ic>;

/* ── KPI card component ───────────────────────────────────── */
function KpiCard({ label, value, sub, icon, color, iconBg, pct, trend, trendDir, linkTo }) {
  const card = (
    <div className="kpi-card" style={{ '--kpi-color': color, '--kpi-icon-bg': iconBg }}>
      <div className="kpi-card-icon">{icon}</div>
      <div className="kpi-card-value">{value ?? <span className="skeleton" style={{ display: 'inline-block', width: 80, height: 26 }} />}</div>
      <div className="kpi-card-label">{label}</div>
      {sub  && <div className="kpi-card-sub">{sub}</div>}
      {trend && (
        <div className={`kpi-card-trend ${trendDir || 'up'}`}>
          {trendDir === 'down' ? '▼' : '▲'} {trend}
        </div>
      )}
      {pct != null && (
        <div className="kpi-card-bar">
          <div className="kpi-card-bar-fill" style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
      )}
    </div>
  );
  if (linkTo) return <Link to={linkTo} style={{ textDecoration: 'none', display: 'block' }}>{card}</Link>;
  return card;
}

/* ── Mini bar chart (CSS-only) ────────────────────────────── */
function MiniBarChart({ data, color = 'var(--royal)', height = 48 }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map(d => d.value || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <div
            title={`${d.label}: ${d.value}`}
            style={{
              width: '100%',
              height: `${((d.value || 0) / max) * height}px`,
              minHeight: 2,
              background: color,
              borderRadius: '3px 3px 0 0',
              opacity: i === data.length - 1 ? 1 : 0.5,
              transition: 'height .4s ease',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ── Donut gauge (SVG) ────────────────────────────────────── */
function DonutGauge({ pct, color, size = 64 }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const fill = ((pct || 0) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="var(--border)" strokeWidth="6" />
      <circle
        cx="28" cy="28" r={r}
        fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text)" fontFamily="Inter,sans-serif">
        {pct || 0}%
      </text>
    </svg>
  );
}

/* ── Sparkline (SVG) ──────────────────────────────────────── */
function Sparkline({ values, color = '#2563EB', width = 80, height = 32 }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values, 1);
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Main dashboard ───────────────────────────────────────── */
export default function Dashboard() {
  const [kpis,    setKpis]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const branchCtx = useBranch();
  const { fmt }   = useCurrency();
  const activeBranchId = branchCtx?.activeBranchId;

  const fetchDashboard = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = activeBranchId ? { branch_id: activeBranchId } : {};
    api.get('/reports/dashboard/', { params })
      .then(r => {
        if (r.data?.detail) { setError(r.data.detail); }
        else { setKpis(r.data); setError(null); }
      })
      .catch(e => setError(e.response?.data?.detail || e.message || 'Dashboard failed to load.'))
      .finally(() => setLoading(false));
  }, [activeBranchId]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  // Other pages (Trips, Fuel, Invoicing, etc.) dispatch this event after any
  // create/update/delete so the dashboard KPIs never go stale without a
  // manual refresh or full page reload.
  useEffect(() => {
    const handler = () => fetchDashboard();
    window.addEventListener('taurus:dashboard:refresh', handler);
    return () => window.removeEventListener('taurus:dashboard:refresh', handler);
  }, [fetchDashboard]);

  const fleet  = kpis?.fleet         || {};
  const month  = kpis?.this_month    || {};
  const alerts = kpis?.expiry_alerts || [];
  const truckBreakdown = kpis?.truck_breakdown || [];

  const rev    = parseFloat(month.revenue     || 0);
  const exp    = parseFloat(month.expenditure || 0);
  const surplus = rev - exp;
  const margin = rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0;
  const tripsCount = month.trips != null ? month.trips : 0;
  const fuelLitres = month.fuel_litres != null ? month.fuel_litres : 0;

  // synthetic sparkline data (last 6 months trend visual — normalized placeholder)
  const revSparkValues = rev > 0 ? [0.5, 0.6, 0.45, 0.7, 0.8, 1].map(f => Math.round(rev * f)) : [];

  return (
    <div>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
            Operations Dashboard
          </h1>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            Real-time fleet, revenue &amp; inventory overview
          </div>
        </div>
        <button
          className="btn btn-outline btn-sm"
          onClick={fetchDashboard}
          disabled={loading}
          style={{ gap: 6 }}
        >
          <span style={{ display: 'flex', animation: loading ? 'spin .75s linear infinite' : 'none' }}>
            <IcRefresh />
          </span>
          Refresh
        </button>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div className="alert alert-danger mb16">
          <IcAlert />
          <div><strong>Dashboard error:</strong> {error}</div>
        </div>
      )}

      {/* ── Expiry alerts ── */}
      {alerts.length > 0 && (
        <div className="alert alert-warn mb16" style={{ alignItems: 'flex-start', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
            <IcAlert />
            {alerts.length} document{alerts.length !== 1 ? 's' : ''} expiring soon
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {alerts.slice(0, 6).map((a, i) => (
              <span key={i} className={`badge ${a.level === 'DANGER' ? 'badge-red' : 'badge-amber'}`}>
                {a.truck_number} · {a.name}: {a.days_remaining <= 0 ? 'EXPIRED' : `${a.days_remaining}d`}
              </span>
            ))}
            {alerts.length > 6 && (
              <span className="badge badge-gray">+{alerts.length - 6} more</span>
            )}
          </div>
        </div>
      )}

      {/* ── Executive summary bar ── */}
      {!loading && rev > 0 && (
        <div className="exec-bar mb16" style={{ marginBottom: 20 }}>
          {[
            { label: 'Monthly Revenue',     value: fmt(rev),          sub: 'This month' },
            { label: 'Monthly Expenditure', value: fmt(exp),          sub: 'This month' },
            { label: 'Net Surplus',         value: fmt(surplus),      sub: surplus >= 0 ? '✓ Profitable' : '⚠ Loss' },
            { label: 'Margin',              value: `${margin}%`,      sub: margin > 20 ? 'Healthy' : margin > 0 ? 'Below target' : 'Loss-making' },
          ].map((s, i) => (
            <div key={i} className="exec-bar-item">
              <div className="exec-bar-label">{s.label}</div>
              <div className="exec-bar-value">{s.value}</div>
              <div className="exec-bar-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI grid ── */}
      <div className="kpi-grid" style={{ marginBottom: 20 }}>
        <KpiCard
          label="Active Trucks"
          value={loading ? null : fleet.active_trucks ?? '—'}
          sub={`${fleet.ongoing_trips ?? 0} currently on trip`}
          icon={<IcTruck />}
          color="#2563EB"
          iconBg="rgba(37,99,235,.10)"
          pct={fleet.active_trucks && fleet.active_trucks + (fleet.inactive_trucks || 0) > 0
            ? Math.round((fleet.active_trucks / (fleet.active_trucks + (fleet.inactive_trucks || 0))) * 100)
            : null}
          linkTo="/trucks"
        />
        <KpiCard
          label="Active Drivers"
          value={loading ? null : fleet.active_drivers ?? '—'}
          icon={<IcDriver />}
          color="#06B6D4"
          iconBg="rgba(6,182,212,.10)"
          pct={75}
          linkTo="/drivers"
        />
        <KpiCard
          label="Trips This Month"
          value={loading ? null : tripsCount}
          icon={<IcTrip />}
          color="#8B5CF6"
          iconBg="rgba(139,92,246,.10)"
          pct={60}
          linkTo="/trips"
        />
        <KpiCard
          label="Monthly Revenue"
          value={loading ? null : (rev > 0 ? fmt(rev) : '—')}
          icon={<IcRevenue />}
          color="#10B981"
          iconBg="rgba(16,185,129,.10)"
          pct={70}
          linkTo="/revenue"
        />
        <KpiCard
          label="Monthly Expenditure"
          value={loading ? null : (exp > 0 ? fmt(exp) : '—')}
          icon={<IcExpend />}
          color="#EF4444"
          iconBg="rgba(239,68,68,.10)"
          pct={50}
          linkTo="/expenditure"
        />
        <KpiCard
          label="Fuel Usage"
          value={loading ? null : (fuelLitres > 0 ? `${fuelLitres.toLocaleString()} L` : '—')}
          sub={`${month.fuel_excess_events ?? 0} excess events`}
          icon={<IcFuel />}
          color="#F59E0B"
          iconBg="rgba(245,158,11,.10)"
          linkTo="/fuel"
        />
        <KpiCard
          label="Total Stock Value"
          value={loading ? null : (kpis?.stock_value != null ? fmt(kpis.stock_value) : '—')}
          icon={<IcStock />}
          color="#14B8A6"
          iconBg="rgba(20,184,166,.10)"
          pct={55}
          linkTo="/stock"
        />
      </div>

      {/* ── Two-column detail section ── */}
      <div className="g2" style={{ marginBottom: 20 }}>

        {/* Expiry Alerts */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(239,68,68,.10)', color: 'var(--c-red)' }}>
                <IcAlert />
              </div>
              Expiry Alerts
            </div>
            <Link to="/trucks" style={{ fontSize: 11.5, color: 'var(--royal)', fontWeight: 600, textDecoration: 'none' }}>
              View all →
            </Link>
          </div>
          {alerts.length === 0 ? (
            <div className="alert alert-success" style={{ margin: 0 }}>
              <IcCheck />
              All documents are current — no expiry alerts.
            </div>
          ) : (
            <div className="timeline">
              {alerts.slice(0, 5).map((a, i) => (
                <div className="tl-item" key={i}>
                  <div className={`tl-dot ${a.level === 'DANGER' ? 'danger' : 'warn'}`} />
                  <div className="tl-content">
                    <div className="tl-title">{a.truck_number} — {a.name}</div>
                    <div className="tl-sub">
                      Expires {new Date(a.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ·{' '}
                      <span style={{ color: a.level === 'DANGER' ? 'var(--c-red)' : 'var(--c-amber)', fontWeight: 700 }}>
                        {a.days_remaining <= 0 ? 'EXPIRED' : `${a.days_remaining} days left`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {alerts.length > 5 && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', paddingTop: 8 }}>
                  +{alerts.length - 5} more alerts —{' '}
                  <Link to="/trucks" style={{ color: 'var(--royal)' }}>view all</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Month at a Glance */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">
              <div className="card-title-icon" style={{ background: 'rgba(37,99,235,.10)', color: 'var(--royal)' }}>
                <IcBar />
              </div>
              Month at a Glance
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Revenue',     val: rev, color: 'var(--c-green)', pct: rev > 0 ? 70 : 0, to: '/revenue' },
              { label: 'Expenditure', val: exp, color: 'var(--c-red)',   pct: exp > 0 ? (rev > 0 ? Math.min(Math.round((exp/rev)*100),100) : 50) : 0, to: '/expenditure' },
            ].map((row, i) => (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-3)', fontWeight: 600 }}>{row.label}</span>
                  <span style={{ fontWeight: 800, color: row.color, fontVariantNumeric: 'tabular-nums' }}>
                    {row.val > 0 ? fmt(row.val) : loading ? '—' : '—'}
                  </span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />

            {/* Net surplus */}
            {rev > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: surplus >= 0 ? 'var(--c-green-bg)' : 'var(--c-red-bg)', borderRadius: 10, border: `1px solid ${surplus >= 0 ? '#A7F3D0' : '#FECACA'}` }}>
                <div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: surplus >= 0 ? '#059669' : '#DC2626', marginBottom: 2 }}>Net Surplus</div>
                  <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.03em', color: surplus >= 0 ? '#059669' : '#DC2626', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(Math.abs(surplus))}
                  </div>
                </div>
                <DonutGauge pct={Math.max(0, margin)} color={surplus >= 0 ? '#10B981' : '#EF4444'} />
              </div>
            )}

            {/* Fleet quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {[
                { label: 'Trips',    val: tripsCount, color: '#8B5CF6' },
                { label: 'Fuel (L)', val: fuelLitres > 0 ? fuelLitres.toLocaleString() : '—', color: '#F59E0B' },
                { label: 'Excess',   val: month.fuel_excess_events ?? 0, color: '#EF4444' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center', padding: '10px 6px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Fleet status + Truck breakdown ── */}
      {(fleet.active_trucks || truckBreakdown.length > 0) && (
        <div className="g2">
          {/* Fleet overview */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">
                <div className="card-title-icon" style={{ background: 'rgba(37,99,235,.10)', color: 'var(--royal)' }}>
                  <IcTruck />
                </div>
                Fleet Overview
              </div>
              <Link to="/trucks" className="btn btn-ghost btn-xs">View fleet →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Active',      val: fleet.active_trucks ?? 0,   color: '#10B981', bg: 'var(--c-green-bg)' },
                { label: 'On Trip',     val: fleet.ongoing_trips ?? 0,   color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Inactive',    val: fleet.inactive_trucks ?? 0, color: '#EF4444', bg: 'var(--c-red-bg)' },
                { label: 'All Drivers', val: fleet.active_drivers ?? 0,  color: '#06B6D4', bg: 'var(--c-sky-bg)' },
              ].map((s, i) => (
                <div key={i} style={{ padding: '12px 14px', background: s.bg, borderRadius: 10, border: `1px solid ${s.color}22` }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.val}</div>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Truck breakdown */}
          {truckBreakdown.length > 0 ? (
            <div className="card">
              <div className="card-header">
                <div className="card-title">
                  <div className="card-title-icon" style={{ background: 'rgba(37,99,235,.10)', color: 'var(--royal)' }}>
                    <IcBar />
                  </div>
                  Truck Revenue Breakdown
                </div>
              </div>
              <div>
                {(() => {
                  const maxRev = Math.max(...truckBreakdown.map(t => parseFloat(t.revenue || 0)), 1);
                  return truckBreakdown.slice(0, 7).map((t, i) => {
                    const r = parseFloat(t.revenue || 0);
                    const pct = Math.round((r / maxRev) * 100);
                    return (
                      <div key={i} className="truck-row">
                        <div className="truck-row-num">{t.truck_number || t.truck}</div>
                        <div className="truck-row-bar-wrap">
                          <div style={{ fontSize: 10.5, color: 'var(--text-3)', fontWeight: 600 }}>
                            {t.trips ?? 0} trips
                          </div>
                          <div className="truck-row-bar">
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--royal)', borderRadius: 99, transition: 'width .5s ease', opacity: .75 }} />
                          </div>
                        </div>
                        <div className="truck-row-val">{r > 0 ? fmt(r) : '—'}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          ) : (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="card-header" style={{ marginBottom: 0 }}>
                <div className="card-title">Quick Actions</div>
              </div>
              {[
                { label: 'Record a Trip',   to: '/trips',       color: '#8B5CF6' },
                { label: 'Log Fuel',        to: '/fuel',        color: '#F59E0B' },
                { label: 'Add Invoice',     to: '/invoicing',   color: '#10B981' },
                { label: 'Purchase Items',  to: '/purchase',    color: '#06B6D4' },
              ].map((q, i) => (
                <Link key={i} to={q.to} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  background: 'var(--bg)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                  textDecoration: 'none',
                  color: 'var(--text)',
                  fontSize: 13,
                  fontWeight: 600,
                  transition: 'background var(--t), border-color var(--t)',
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: q.color, flexShrink: 0 }} />
                  {q.label}
                  <span style={{ marginLeft: 'auto', color: 'var(--text-3)', fontSize: 12 }}>→</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
