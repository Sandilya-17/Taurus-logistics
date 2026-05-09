// src/pages/Reports.jsx – Professional Reports Center | Taurus ERP
import { useState } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const REPORTS = [
  { key: 'stock',               label: 'Stock Report',           icon: '📦', color: 'var(--primary)',  colorHex: '#1a56db', desc: 'Full inventory stock levels and valuations' },
  { key: 'spare-parts',         label: 'Spare Parts',            icon: '🔧', color: '#475569',          colorHex: '#475569', desc: 'Purchases and issues of spare parts' },
  { key: 'lubricants',          label: 'Lubricant Report',       icon: '🛢️', color: '#0d9488',         colorHex: '#0d9488', desc: 'Lubricant purchases, issues and consumption' },
  { key: 'tyres',               label: 'Tyre Report',            icon: '🛞', color: '#7c3aed',          colorHex: '#7c3aed', desc: 'Tyre inventory, fitment and wear status' },
  { key: 'trips',               label: 'Trip Report',            icon: '🗺️', color: '#0694a2',         colorHex: '#0694a2', desc: 'Trip records with revenue, qty (tons) and delivery data' },
  { key: 'fuel',                label: 'Fuel Report',            icon: '⛽', color: '#d97706',          colorHex: '#d97706', desc: 'Fuel consumption, costs and excess incidents' },
  { key: 'revenue-expenditure', label: 'Revenue vs Expenditure', icon: '💰', color: 'var(--green)',     colorHex: '#0e9f6e', desc: 'Full financial P&L — all revenue sources vs all expenditure' },
  { key: 'invoices',            label: 'Invoice Report',         icon: '🧾', color: '#059669',          colorHex: '#059669', desc: 'Invoice listing with quantities, units, VAT and payment status' },
  { key: 'vat',                 label: 'VAT Report',             icon: '🧮', color: 'var(--red)',       colorHex: '#e02424', desc: 'VAT charged and applicable transactions' },
  { key: 'maintenance',         label: 'Maintenance Report',     icon: '🛠️', color: '#0369a1',         colorHex: '#0369a1', desc: 'Service history and maintenance costs' },
];

const fmtCurrency = (v) => {
  if (typeof v !== 'number') return String(v);
  if (v % 1 !== 0) return `GH₵ ${v.toLocaleString('en-GH', { minimumFractionDigits: 2 })}`;
  return v.toLocaleString();
};

export default function ReportsPage() {
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }));
  const [dateTo,   setDateTo]   = useState(todayStr);
  const [active,   setActive]   = useState('revenue-expenditure');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [downloading, setDownloading] = useState('');

  const current = REPORTS.find(r => r.key === active);

  const doFetch = async () => {
    setLoading(true);
    setData(null);
    try {
      const resp = await api.get(`/reports/${active}/`, {
        params: { date_from: dateFrom, date_to: dateTo, format: 'json' }
      });
      setData(resp.data);
      if (!resp.data?.rows?.length && !resp.data?.summary) {
        toast('No data found for the selected period.', { icon: 'ℹ️' });
      }
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Report generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const doDownload = async (fmt) => {
    setDownloading(fmt);
    try {
      const ext  = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const resp = await api.get(`/reports/${active}/`, {
        params: { date_from: dateFrom, date_to: dateTo, format: fmt },
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: mime });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `taurus_${active.replace(/-/g, '_')}_${dateTo}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${current.label} exported as ${fmt.toUpperCase()}.`);
    } catch (e) {
      const msg = e.response?.status === 404
        ? 'Report endpoint not found. Check backend configuration.'
        : 'Export failed. Please try again.';
      toast.error(msg);
    } finally {
      setDownloading('');
    }
  };

  const fmtCell = (cell) => {
    if (cell === null || cell === undefined || cell === '') return '—';
    if (typeof cell === 'number') {
      return cell % 1 !== 0
        ? cell.toLocaleString('en-GH', { minimumFractionDigits: 2 })
        : cell.toLocaleString();
    }
    return String(cell);
  };

  const isCurrencyHeader = (h) => {
    const k = h?.toLowerCase();
    return k?.includes('amount') || k?.includes('cost') || k?.includes('gh₵') ||
           k?.includes('revenue') || k?.includes('expenditure') || k?.includes('profit') ||
           k?.includes('vat') || k?.includes('total') || k?.includes('wage') ||
           k?.includes('subtotal') || k?.includes('balance');
  };

  const isQtyHeader = (h) => {
    const k = h?.toLowerCase();
    return k?.includes('qty') || k?.includes('quantity') || k?.includes('tons') ||
           k?.includes('units') || k?.includes('litres') || k?.includes('kg');
  };

  // Colour-code cell values in revenue/expenditure report
  const getCellStyle = (header, value, rowIndex) => {
    if (typeof value !== 'number') return {};
    const h = header?.toLowerCase() || '';
    if (h.includes('profit') || h.includes('net')) {
      return { color: value >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 };
    }
    if (h.includes('expenditure') || h.includes('cost')) {
      return { color: value > 0 ? 'var(--red)' : 'inherit' };
    }
    if (h.includes('revenue')) {
      return { color: value > 0 ? 'var(--green)' : 'inherit' };
    }
    return {};
  };

  return (
    <div>
      {/* ── Report Type Selector ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))',
        gap: 10, marginBottom: 20,
      }}>
        {REPORTS.map(r => (
          <div
            key={r.key}
            onClick={() => { setActive(r.key); setData(null); }}
            style={{
              padding: '14px 16px',
              background: active === r.key ? r.color : 'var(--card)',
              border: `1.5px solid ${active === r.key ? r.color : 'var(--border)'}`,
              borderRadius: 12,
              cursor: 'pointer',
              transition: 'all .15s',
              color: active === r.key ? '#fff' : 'var(--text)',
              boxShadow: active === r.key ? `0 4px 16px ${r.colorHex}44` : 'var(--shadow)',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={e => {
              if (active !== r.key) {
                e.currentTarget.style.borderColor = r.color;
                e.currentTarget.style.background  = `${r.colorHex}0d`;
              }
            }}
            onMouseLeave={e => {
              if (active !== r.key) {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.background  = 'var(--card)';
              }
            }}
          >
            {active === r.key && (
              <div style={{
                position: 'absolute', top: 8, right: 8,
                background: 'rgba(255,255,255,.25)', borderRadius: '50%',
                width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 800, color: '#fff',
              }}>✓</div>
            )}
            <div style={{ fontSize: 22, marginBottom: 7 }}>{r.icon}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: 10.5, opacity: active === r.key ? .85 : .55, lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="card mb16">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {/* Selected report indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              background: current?.color,
              color: '#fff', borderRadius: 8, width: 32, height: 32,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              flexShrink: 0,
            }}>{current?.icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{current?.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{current?.desc}</div>
            </div>
          </div>

          <div style={{ flex: 1 }} />

          {/* Date range */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>FROM</label>
              <input
                type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ margin: 0, fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>TO</label>
              <input
                type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ width: 'auto', padding: '7px 10px', fontSize: 12 }}
              />
            </div>
          </div>

          {/* Quick date presets */}
          <div style={{ display: 'flex', gap: 4 }}>
            {[
              { label: '7d',  days: 7 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
              { label: 'YTD', days: null },
            ].map(p => (
              <button
                key={p.label}
                className="btn btn-ghost btn-xs"
                onClick={() => {
                  const t = new Date();
                  const from = p.days
                    ? new Date(t - p.days * 86400000)
                    : new Date(t.getFullYear(), 0, 1);
                  setDateFrom(from.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }));
                  setDateTo(t.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }));
                }}
              >{p.label}</button>
            ))}
          </div>

          {/* Actions */}
          <button
            className="btn btn-primary btn-sm" onClick={doFetch} disabled={loading}
            style={{ minWidth: 110 }}
          >
            {loading ? '⏳ Loading…' : '🔍 Generate'}
          </button>
          <button
            className={`export-btn excel${downloading === 'excel' ? ' loading' : ''}`}
            onClick={() => doDownload('excel')}
            disabled={!!downloading}
          >
            {downloading === 'excel' ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 1s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Exporting…</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><polyline points="8 13 12 17 16 13"/><line x1="12" y1="17" x2="12" y2="8"/></svg> Excel</>
            )}
          </button>
          <button
            className={`export-btn pdf${downloading === 'pdf' ? ' loading' : ''}`}
            onClick={() => doDownload('pdf')}
            disabled={!!downloading}
          >
            {downloading === 'pdf' ? (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{animation:'spin 1s linear infinite'}}><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Exporting…</>
            ) : (
              <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg> PDF</>
            )}
          </button>
        </div>

        {/* ── Summary KPIs ── */}
        {data?.summary && Object.keys(data.summary).length > 0 && (
          <div style={{
            display: 'flex', gap: 10, flexWrap: 'wrap',
            marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
          }}>
            {Object.entries(data.summary).map(([k, v]) => {
              const kl = k.toLowerCase();
              const isProfit = kl.includes('profit') || kl.includes('net');
              const isRev    = kl.includes('revenue');
              const isExp    = kl.includes('expenditure') || kl.includes('expense');
              const color = isProfit
                ? (parseFloat(v) >= 0 ? 'var(--green)' : 'var(--red)')
                : isRev ? 'var(--green)'
                : isExp ? 'var(--red)'
                : 'var(--primary)';
              return (
                <div key={k} style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 16px', flex: '1 1 160px', minWidth: 160,
                }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 4, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>{k}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color }}>
                    {fmtCurrency(v)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Revenue by source breakdown (shown for revenue-expenditure report) */}
        {data?.revenue_by_source && (
          <div style={{
            marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
              Revenue by Source
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(data.revenue_by_source).map(([src, val]) => (
                <div key={src} style={{
                  background: 'var(--green-bg)', border: '1px solid #6ee7b7',
                  borderRadius: 8, padding: '8px 12px', fontSize: 12,
                }}>
                  <div style={{ color: 'var(--muted)', fontSize: 10, fontWeight: 600 }}>{src.replace(/_/g, ' ')}</div>
                  <div style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtCurrency(val)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Data Table ── */}
      {data && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <span className="card-title-ic">{current?.icon}</span>
              {current?.label} — {dateFrom} to {dateTo}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span className="badge b-blue">{data.rows?.length ?? 0} records</span>
              <button className={`export-btn excel${downloading==='excel'?' loading':''}`} onClick={() => doDownload('excel')} disabled={!!downloading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={downloading==='excel'?{animation:'spin 1s linear infinite'}:{}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {downloading === 'excel' ? 'Exporting…' : 'Excel'}
              </button>
              <button className={`export-btn pdf${downloading==='pdf'?' loading':''}`} onClick={() => doDownload('pdf')} disabled={!!downloading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={downloading==='pdf'?{animation:'spin 1s linear infinite'}:{}}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {downloading === 'pdf' ? 'Exporting…' : 'PDF'}
              </button>
            </div>
          </div>
          <div className="tbl-wrap" style={{ maxHeight: 520, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  {(data.headers || []).map((h, i) => (
                    <th key={i} style={{ textAlign: isCurrencyHeader(h) || isQtyHeader(h) ? 'right' : 'left' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.rows || []).length === 0 && (
                  <tr>
                    <td colSpan={(data.headers || []).length}>
                      <div className="empty-state">
                        <div className="empty-state-icon">{current?.icon}</div>
                        <div className="empty-state-title">No data for selected period</div>
                        <div className="empty-state-sub">Try adjusting the date range above</div>
                      </div>
                    </td>
                  </tr>
                )}
                {(data.rows || []).map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => {
                      const header = data.headers?.[ci] || '';
                      const cellStyle = getCellStyle(header, cell, ri);
                      return (
                        <td
                          key={ci}
                          className={typeof cell === 'number' && cell % 1 !== 0 ? 'ced' : ''}
                          style={{
                            textAlign: typeof cell === 'number' ? 'right' : 'left',
                            fontWeight: (isCurrencyHeader(header) || isQtyHeader(header)) && typeof cell === 'number' ? 600 : 400,
                            ...cellStyle,
                          }}
                        >
                          {fmtCell(cell)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Fuel Excess Incidents */}
      {data?.excess_incidents?.length > 0 && (
        <div className="card mt16">
          <div className="card-title"><span className="card-title-ic">🔴</span>Fuel Excess Incidents</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Truck</th><th>Limit (L)</th><th>Issued (L)</th><th>Excess (L)</th><th>Remark</th></tr>
              </thead>
              <tbody>
                {data.excess_incidents.map((r, i) => (
                  <tr key={i} className="row-danger">
                    {r.map((cell, ci) => (
                      <td key={ci}>
                        {ci === 4 && parseFloat(cell) > 0
                          ? <span className="badge b-red">+{cell} L</span>
                          : cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty / initial state */}
      {!data && !loading && (
        <div className="card">
          <div className="empty-state" style={{ padding: '60px 24px' }}>
            <div className="empty-state-icon" style={{ fontSize: 48 }}>{current?.icon}</div>
            <div className="empty-state-title" style={{ fontSize: 16 }}>Ready to generate {current?.label}</div>
            <div className="empty-state-sub" style={{ maxWidth: 420, margin: '6px auto 20px' }}>
              Select a date range above and click <strong>Generate</strong> to preview data in the browser,
              or use <strong>Excel / PDF</strong> to download directly without preview.
              {active === 'invoices' && (
                <><br /><br />
                  <span style={{ color: 'var(--primary)', fontSize: 11 }}>
                    📌 Invoice Report shows quantity (tons/units), unit type, subtotal, VAT and payment status per invoice.
                  </span>
                </>
              )}
              {active === 'revenue-expenditure' && (
                <><br /><br />
                  <span style={{ color: 'var(--green)', fontSize: 11 }}>
                    📌 Revenue vs Expenditure now includes all revenue sources: Haulage, Trip Revenue, Truck Rental, Spare Sales, Fuel Rebates, Commissions, Insurance & Other.
                  </span>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-sm" onClick={doFetch} disabled={loading}>
                🔍 Generate Preview
              </button>
              <button className={`export-btn excel${downloading==='excel'?' loading':''}`} onClick={() => doDownload('excel')} disabled={!!downloading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {downloading === 'excel' ? 'Exporting…' : 'Download Excel'}
              </button>
              <button className={`export-btn pdf${downloading==='pdf'?' loading':''}`} onClick={() => doDownload('pdf')} disabled={!!downloading}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                {downloading === 'pdf' ? 'Exporting…' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
