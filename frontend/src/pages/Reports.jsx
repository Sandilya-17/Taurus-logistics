// src/pages/Reports.jsx – Professional Reports Center | Taurus ERP
import { useState, useEffect } from 'react';
import { useBranch, useCurrency } from '../App';
import api from '../utils/api';
import toast from 'react-hot-toast';

const REPORTS = [
  { key: 'truck-summary',       label: 'Truck-wise Summary',     icon: '🚛', color: 'var(--primary)',  colorHex: '#1a56db', desc: 'Revenue, fuel cost, spare parts and net profit per truck', hasTruckFilter: true },
  { key: 'trip-pl',             label: 'Trip P&L Report',        icon: '💹', color: '#0694a2',         colorHex: '#0694a2', desc: 'Per-trip revenue, fuel cost, spare parts and net profit',  hasTruckFilter: true },
  { key: 'revenue-expenditure', label: 'Revenue vs Expenditure', icon: '💰', color: 'var(--green)',     colorHex: '#0e9f6e', desc: 'Full financial P&L — all revenue sources vs all expenditure' },
  { key: 'trips',               label: 'Trip Report',            icon: '🗺️', color: '#0694a2',         colorHex: '#0694a2', desc: 'Trip records with revenue, qty (tons) and delivery data' },
  { key: 'rake-tonnage',        label: 'Rake Tonnage Report',    icon: '🚂', color: '#f0b429',          colorHex: '#f0b429', desc: 'Wagon/rake-wise Coal, Gypsum, Clinker vs Dolomite vs Total Tonnage' },
  { key: 'fuel',                label: 'Fuel Report',            icon: '⛽', color: '#d97706',          colorHex: '#d97706', desc: 'Fuel consumption, costs and excess incidents' },
  { key: 'stock',               label: 'Stock Report',           icon: '📦', color: 'var(--primary)',  colorHex: '#1a56db', desc: 'Full inventory stock levels and valuations' },
  { key: 'spare-parts',         label: 'Spare Parts',            icon: '🔧', color: '#475569',          colorHex: '#475569', desc: 'Purchases and issues of spare parts' },
  { key: 'lubricants',          label: 'Lubricant Report',       icon: '🛢️', color: '#0d9488',         colorHex: '#0d9488', desc: 'Lubricant purchases, issues and consumption' },
  { key: 'tyres',               label: 'Tyre Report',            icon: '🛞', color: '#7c3aed',          colorHex: '#7c3aed', desc: 'Tyre inventory, fitment and wear status' },
  { key: 'invoices',            label: 'Invoice Report',         icon: '🧾', color: '#059669',          colorHex: '#059669', desc: 'Invoice listing with quantities, units, VAT and payment status' },
  { key: 'vat',                 label: 'VAT Report',             icon: '🧮', color: 'var(--red)',       colorHex: '#e02424', desc: 'VAT charged and applicable transactions' },
  { key: 'maintenance',         label: 'Maintenance Report',     icon: '🛠️', color: '#0369a1',         colorHex: '#0369a1', desc: 'Service history and maintenance costs' },
];

// Grouped bar chart for the Rake Tonnage Report (Coal/Gypsum/Clinker vs
// Dolomite vs Total Tonnage, per wagon/rake). Plain inline SVG — no chart
// library dependency — styled to match the source rake-dispatch dashboard.
function RakeTonnageChart({ chart }) {
  if (!chart?.labels?.length) return null;
  const COLORS = ['#4f81bd', '#ed8b36', '#ffc845'];
  const labels = chart.labels;
  const series = chart.series || [];
  const maxVal = Math.max(1, ...series.flatMap(s => s.data));
  const niceMax = Math.ceil(maxVal / 100) * 100 || 100;

  const groupW   = Math.max(70, series.length * 26);
  const barW     = 18;
  const gapY     = 40;   // top padding for value labels
  const chartH   = 300;
  const axisPad  = 50;   // left padding for y-axis labels
  const bottomPad = 70;  // room for rotated x-axis labels
  const width  = axisPad + labels.length * groupW + 20;
  const height = gapY + chartH + bottomPad;
  const steps = 7;

  return (
    <div className="card mb16">
      <div className="card-title">
        <span className="card-title-ic">🚂</span>
        Tonnage by Rake/Wagon
      </div>
      <div style={{ overflowX: 'auto' }}>
        <svg width={width} height={height} style={{ display: 'block', minWidth: '100%' }}>
          {/* gridlines + y-axis labels */}
          {Array.from({ length: steps + 1 }).map((_, i) => {
            const v = Math.round((niceMax / steps) * i);
            const y = gapY + chartH - (v / niceMax) * chartH;
            return (
              <g key={i}>
                <line x1={axisPad} y1={y} x2={width - 10} y2={y} stroke="#e5e7eb" strokeWidth="1" />
                <text x={axisPad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#6b7280">{v.toLocaleString()}</text>
              </g>
            );
          })}
          {/* bars */}
          {labels.map((label, gi) => {
            const gx = axisPad + gi * groupW;
            return (
              <g key={label}>
                {series.map((s, si) => {
                  const val = s.data[gi] || 0;
                  const barH = (val / niceMax) * chartH;
                  const x = gx + si * (barW + 4) + 6;
                  const y = gapY + chartH - barH;
                  return (
                    <g key={si}>
                      <rect x={x} y={y} width={barW} height={barH} fill={COLORS[si % COLORS.length]} rx="1" />
                      {val > 0 && (
                        <text x={x + barW / 2} y={gapY + chartH - 4} textAnchor="start" fontSize="8.5"
                          fill="#1f2937" fontWeight="600"
                          transform={`rotate(-90 ${x + barW / 2} ${gapY + chartH - 4})`}>
                          {val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </text>
                      )}
                    </g>
                  );
                })}
                <text x={gx + groupW / 2} y={gapY + chartH + 14} textAnchor="end" fontSize="10" fill="#374151"
                  transform={`rotate(-40 ${gx + groupW / 2} ${gapY + chartH + 14})`}>
                  {label}
                </text>
              </g>
            );
          })}
          {/* baseline */}
          <line x1={axisPad} y1={gapY + chartH} x2={width - 10} y2={gapY + chartH} stroke="#9ca3af" strokeWidth="1" />
        </svg>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {series.map((s, i) => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--muted)' }}>
            <span style={{ width: 10, height: 10, background: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 2 }} />
            {s.name}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  const branchCtx = useBranch();
  const { fmt: fmtCur, symbol } = useCurrency();

  const fmtCurrency = (v) => {
    if (typeof v !== 'number') return String(v);
    return fmtCur(v);
  };
  const branchQS  = branchCtx?.branchQS || {};
  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' }));
  const [dateTo,   setDateTo]   = useState(todayStr);
  const [active,   setActive]   = useState('truck-summary');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [downloading, setDownloading] = useState('');
  const [trucks,   setTrucks]   = useState([]);
  const [truckFilter, setTruckFilter] = useState('');

  const branchKey = JSON.stringify(branchQS);

  useEffect(() => {
    const qs = branchKey ? JSON.parse(branchKey) : {};
    api.get('/trucks/?status=ACTIVE', { params: qs }).then(r => {
      const respData = r.data;
      setTrucks(Array.isArray(respData) ? respData : Array.isArray(respData?.results) ? respData.results : []);
    }).catch(() => setTrucks([]));
  }, [branchKey]);

  // FIX: a generated report's results were never tied to the branch they
  // were generated under. Switching the branch selector after generating a
  // report left the OLD branch's rows on screen under the NEW branch's
  // header — looking exactly like data had leaked across branches, even
  // though the backend was scoping correctly. Clear any displayed report
  // the moment the branch changes, and only that — the user re-clicks
  // Generate Report, which now always reflects the currently selected branch.
  useEffect(() => {
    setData(null);
  }, [branchKey]);

  const current = REPORTS.find(r => r.key === active);

  const buildParams = (extra = {}) => {
    const p = { date_from: dateFrom, date_to: dateTo, ...extra };
    if (truckFilter && current?.hasTruckFilter) p.truck = truckFilter;
    return p;
  };

  const doFetch = async ({ silent = false } = {}) => {
    setLoading(true);
    if (!silent) setData(null);
    try {
      const resp = await api.get(`/reports/${active}/`, {
        params: { ...branchQS, ...buildParams({ export: 'json' }) }
      });
      setData(resp.data);
      if (!silent && !resp.data?.rows?.length && !resp.data?.summary) {
        toast('No data found for the selected period.', { icon: 'ℹ️' });
      }
    } catch (e) {
      if (!silent) toast.error(e.response?.data?.detail || 'Report generation failed.');
    } finally {
      setLoading(false);
    }
  };

  // Any other page (Trips, Fuel, Invoicing, etc.) dispatches this event after
  // a create/update/delete. If a report is currently on screen, silently
  // re-fetch it so a deleted trip (etc.) disappears from the report without
  // the user needing to click "Generate Report" again.
  useEffect(() => {
    const handler = () => {
      if (data) doFetch({ silent: true });
    };
    window.addEventListener('taurus:dashboard:refresh', handler);
    return () => window.removeEventListener('taurus:dashboard:refresh', handler);
  }, [data, active, dateFrom, dateTo, truckFilter, branchKey]);

  const doDownload = async (fmt) => {
    setDownloading(fmt);
    try {
      const ext  = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const resp = await api.get(`/reports/${active}/`, {
        params: { ...branchQS, ...buildParams({ export: fmt }) },
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

  const fmtCell = (cell, header) => {
    if (cell === null || cell === undefined || cell === '') return '—';
    if (typeof cell === 'number') {
      if (isCurrencyHeader(header)) return fmtCur(cell);
      return cell % 1 !== 0
        ? cell.toLocaleString('en-GH', { minimumFractionDigits: 2 })
        : cell.toLocaleString();
    }
    return String(cell);
  };

  const isCurrencyHeader = (h) => {
    const k = h?.toLowerCase();
    // Anything with an explicit non-money unit (tons, litres) or that is a plain
    // count is NEVER a currency value, no matter what other words are in the label.
    if (/\(t\)|\(l\)|\btons?\b|\blitres?\b/.test(k || '')) return false;
    if (/trips|events|tyres|items|records|fitted|store|condemned/.test(k || '')) return false;
    return k?.includes('amount') || k?.includes('cost') || k?.includes('revenue') ||
           k?.includes('expenditure') || k?.includes('profit') || k?.includes('vat') ||
           k?.includes('total') || k?.includes('wage') || k?.includes('subtotal') ||
           k?.includes('balance') || k?.includes('labour') || k?.includes('parts') ||
           k?.includes('value') || k?.includes('invoiced') || k?.includes('price') ||
           k?.includes('purchased') || k?.includes('issued') || k?.includes('paid') ||
           k?.includes('due');
  };

  const isNegativeCell = (headers, row, colIdx) => {
    const h = headers[colIdx]?.toLowerCase() || '';
    const v = row[colIdx];
    return (h.includes('profit') || h.includes('net')) && typeof v === 'number' && v < 0;
  };

  return (
    <div>
      {/* Report selector */}
      <div className="card mb16">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 8 }}>
          {REPORTS.map(r => (
            <div key={r.key}
              onClick={() => { setActive(r.key); setData(null); }}
              style={{
                cursor: 'pointer', padding: '10px 12px', borderRadius: 8,
                border: `2px solid ${active === r.key ? r.colorHex : 'var(--border)'}`,
                background: active === r.key ? `${r.colorHex}18` : 'var(--surface)',
                transition: 'all 0.15s',
              }}>
              <div style={{ fontSize: 18 }}>{r.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 12, color: active === r.key ? r.colorHex : 'var(--text)', marginTop: 4 }}>{r.label}</div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{r.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb16">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13 }} />
          </div>
          {current?.hasTruckFilter && (
            <div>
              <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Truck (optional)</label>
              <select value={truckFilter} onChange={e => setTruckFilter(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, minWidth: 160 }}>
                <option value="">All Trucks</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={doFetch} disabled={loading} style={{ marginTop: 0 }}>
            {loading ? '⏳ Generating…' : '📊 Generate Report'}
          </button>
          <button className="btn btn-ghost" onClick={() => doDownload('excel')} disabled={!!downloading || !data}>
            {downloading === 'excel' ? '⏳' : '⬇️ Excel'}
          </button>
          <button className="btn btn-ghost" onClick={() => doDownload('pdf')} disabled={!!downloading || !data}>
            {downloading === 'pdf' ? '⏳' : '⬇️ PDF'}
          </button>
        </div>
      </div>

      {/* Rake Tonnage grouped bar chart */}
      {active === 'rake-tonnage' && data?.chart && <RakeTonnageChart chart={data.chart} />}

      {/* Summary cards */}
      {data?.summary && (
        <div className="mb16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
          {Object.entries(data.summary).map(([k, v]) => {
            const isMoney = isCurrencyHeader(k);
            const displayVal = typeof v !== 'number'
              ? v
              : isMoney
                ? fmtCurrency(v)
                : v.toLocaleString('en-GH', v % 1 !== 0 ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : undefined);
            return (
              <div key={k} className="kpi" style={{ border: `1px solid var(--border)` }}>
                <div className="kpi-label">{k.replace(/ *\(GH₵\)| *\(Le\)/g, '')}</div>
                <div className="kpi-val" style={{
                  fontSize: 16,
                  color: k.toLowerCase().includes('net') || k.toLowerCase().includes('profit')
                    ? (v >= 0 ? 'var(--green)' : 'var(--red)')
                    : k.toLowerCase().includes('revenue') ? 'var(--green)'
                    : k.toLowerCase().includes('cost') || k.toLowerCase().includes('expenditure') ? 'var(--amber)'
                    : 'var(--blue)'
                }}>
                  {displayVal}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table */}
      {data?.rows && data?.headers && (
        <div className="card">
          <div className="card-title">
            <span className="card-title-ic">{current?.icon}</span>
            {current?.label}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
              {data.rows.length} record{data.rows.length !== 1 ? 's' : ''} · {dateFrom} → {dateTo}
              {truckFilter && current?.hasTruckFilter && (' · ' + (trucks.find(t => String(t.id) === String(truckFilter))?.truck_number || ''))}
            </span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  {data.headers.map((h, i) => (
                    <th key={i} style={{ textAlign: isCurrencyHeader(h) ? 'right' : 'left' }}>{h.replace(/ *\(GH₵\)| *\(Le\)/g, '')}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.length === 0 && (
                  <tr><td colSpan={data.headers.length} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No data for selected period</td></tr>
                )}
                {data.rows.map((row, ri) => (
                  <tr key={ri}>
                    {row.map((cell, ci) => (
                      <td key={ci} style={{
                        textAlign: isCurrencyHeader(data.headers[ci]) ? 'right' : 'left',
                        fontFamily: isCurrencyHeader(data.headers[ci]) ? 'monospace' : undefined,
                        color: isNegativeCell(data.headers, row, ci) ? 'var(--red)'
                          : data.headers[ci]?.toLowerCase().includes('profit') && typeof cell === 'number' && cell >= 0 ? 'var(--green)'
                          : undefined,
                        fontWeight: isNegativeCell(data.headers, row, ci) || (data.headers[ci]?.toLowerCase().includes('profit') && typeof cell === 'number' && cell >= 0) ? 600 : undefined,
                      }}>
                        {fmtCell(cell, data.headers[ci])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>{current?.icon}</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{current?.label}</div>
          <div style={{ fontSize: 12 }}>{current?.desc}</div>
          <div style={{ marginTop: 16, fontSize: 12 }}>Select a date range and click <strong>Generate Report</strong></div>
        </div>
      )}
    </div>
  );
}
