// src/pages/Dashboard.jsx – Enterprise Dashboard
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api, { fmtGHS } from '../utils/api';

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

  useEffect(() => {
    api.get('/reports/dashboard/')
      .then(r => setKpis(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fleet  = kpis?.fleet         || {};
  const month  = kpis?.this_month    || {};
  const alerts = kpis?.expiry_alerts || [];

  const rev  = parseFloat(month.revenue     || 0);
  const exp  = parseFloat(month.expenditure || 0);
  const margin = rev > 0 ? Math.round(((rev - exp) / rev) * 100) : 0;

  return (
    <div>
      {alerts.length > 0 && (
        <div className="alert alert-warn mb16" style={{ borderRadius: 10, fontWeight: 500 }}>
          ⚠️&nbsp; <strong>{alerts.length} document{alerts.length > 1 ? 's' : ''} expiring soon:</strong>&nbsp;
          {alerts.slice(0, 3).map(a => `${a.truck_number} – ${a.name} (${a.days_remaining}d)`).join(' · ')}
          {alerts.length > 3 && ` and ${alerts.length - 3} more…`}
        </div>
      )}

      {/* ── KPI Row ── */}
      <div className="kpi-grid">
        <StatCard label="Active Trucks"      value={fleet.active_trucks}  color="var(--blue)"  sub={`🚛 ${fleet.ongoing_trips ?? 0} currently on trip`} pct={80} />
        <StatCard label="Active Drivers"     value={fleet.active_drivers} color="var(--sky)"   pct={75} />
        <StatCard label="Trips This Month"   value={month.trips}          color="#7c3aed"       pct={60} />
        <StatCard label="Monthly Revenue"    value={month.revenue  ? fmtGHS(month.revenue)  : null} color="var(--green)" pct={70} />
        <StatCard label="Monthly Expenditure"value={month.expenditure ? fmtGHS(month.expenditure) : null} color="var(--red)" pct={50} />
        <StatCard label="Fuel Usage"         value={month.fuel_litres != null ? `${month.fuel_litres.toLocaleString()} L` : null} color="var(--blue)" sub={`${month.fuel_excess_events ?? 0} excess events`} />
        <StatCard label="Total Stock Value"  value={kpis?.stock_value != null ? fmtGHS(kpis.stock_value) : null} color="var(--teal)" pct={55} />
      </div>

      {/* ── Margin Strip ── */}
      {rev > 0 && (
        <div className="stat-strip mb16">
          {[
            { label: 'Revenue',     val: fmtGHS(rev),       color: 'var(--green)' },
            { label: 'Expenditure', val: fmtGHS(exp),       color: 'var(--red)'   },
            { label: 'Surplus',     val: fmtGHS(rev - exp), color: rev > exp ? 'var(--green)' : 'var(--red)' },
            { label: 'Margin',      val: `${margin}%`,       color: margin > 20 ? 'var(--green)' : margin > 0 ? 'var(--amber)' : 'var(--red)' },
          ].map((s, i) => (
            <div key={i} className="stat-strip-item">
              <div className="stat-strip-label">{s.label}</div>
              <div className="stat-strip-val" style={{ color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      )}

      <div className="g2">
        {/* ── Expiry Alerts ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">🚨</span>Expiry Alerts</div>
          {alerts.length === 0 ? (
            <div className="alert alert-success" style={{ margin: 0 }}>✓ No expiry alerts. All documents are current.</div>
          ) : (
            <div className="timeline">
              {alerts.map((a, i) => (
                <div className="tl-item" key={i}>
                  <div className={`tl-dot ${a.level === 'DANGER' ? 'danger' : 'warn'}`} />
                  <div className="tl-title">{a.truck_number} – {a.name}</div>
                  <div className="tl-sub">
                    Expires {new Date(a.date).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })} ·&nbsp;
                    <span style={{ color: a.level === 'DANGER' ? 'var(--red)' : 'var(--amber)', fontWeight: 600 }}>
                      {a.days_remaining} days remaining
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Month at a Glance — no Net Profit ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📊</span>Month at a Glance</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { label: 'Revenue',     val: rev,  color: 'var(--green)', pct: rev  > 0 ? 70 : 0 },
              { label: 'Expenditure', val: exp,  color: 'var(--red)',   pct: exp  > 0 ? 50 : 0 },
            ].map((r, i) => (
              <div key={i}>
                <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>{r.label}</span>
                  <span style={{ fontWeight: 700, color: r.color }}>{r.val > 0 ? fmtGHS(r.val) : '—'}</span>
                </div>
                <div className="prog-bar">
                  <div className="prog-fill" style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

            {[
              { label: 'Trips Completed', val: month.trips ?? '—' },
              { label: 'Fuel Consumed',   val: month.fuel_litres ? `${month.fuel_litres.toLocaleString()} L` : '—' },
              { label: 'Fuel Excess Events', val: month.fuel_excess_events ?? '0' },
              { label: 'Stock Items',     val: kpis?.stock_items ?? '—' },
            ].map((row, i) => (
              <div key={i} className="flex justify-between" style={{ fontSize: 12.5 }}>
                <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                <span style={{ fontWeight: 700 }}>{row.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Quick Links ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginTop: 16 }}>
        {[
          { icon: '🚛', label: 'Add Truck',     href: '/trucks'      },
          { icon: '🗺️', label: 'New Trip',      href: '/trips'       },
          { icon: '📥', label: 'Purchase Stock', href: '/purchase'    },
          { icon: '🧾', label: 'New Invoice',    href: '/invoicing'   },
          { icon: '⛽', label: 'Log Fuel',       href: '/fuel'        },
          { icon: '📊', label: 'View Reports',   href: '/reports'     },
        ].map((q, i) => (
          <Link key={i} to={q.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10,
              padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', transition: 'all .15s', fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.background = 'var(--sky-bg)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card)'; }}
            >
              <span style={{ fontSize: 18 }}>{q.icon}</span>{q.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
