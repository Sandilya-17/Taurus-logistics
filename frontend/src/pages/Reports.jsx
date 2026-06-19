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
  { key: 'fuel',                label: 'Fuel Report',            icon: '⛽', color: '#d97706',          colorHex: '#d97706', desc: 'Fuel consumption, costs and excess incidents' },
  { key: 'stock',               label: 'Stock Report',           icon: '📦', color: 'var(--primary)',  colorHex: '#1a56db', desc: 'Full inventory stock levels and valuations' },
  { key: 'spare-parts',         label: 'Spare Parts',            icon: '🔧', color: '#475569',          colorHex: '#475569', desc: 'Purchases and issues of spare parts' },
  { key: 'lubricants',          label: 'Lubricant Report',       icon: '🛢️', color: '#0d9488',         colorHex: '#0d9488', desc: 'Lubricant purchases, issues and consumption' },
  { key: 'tyres',               label: 'Tyre Report',            icon: '🛞', color: '#7c3aed',          colorHex: '#7c3aed', desc: 'Tyre inventory, fitment and wear status' },
  { key: 'invoices',            label: 'Invoice Report',         icon: '🧾', color: '#059669',          colorHex: '#059669', desc: 'Invoice listing with quantities, units, VAT and payment status' },
  { key: 'vat',                 label: 'VAT Report',             icon: '🧮', color: 'var(--red)',       colorHex: '#e02424', desc: 'VAT charged and applicable transactions' },
  { key: 'maintenance',         label: 'Maintenance Report',     icon: '🛠️', color: '#0369a1',         colorHex: '#0369a1', desc: 'Service history and maintenance costs' },
];

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

  useEffect(() => {
    api.get('/trucks/?status=ACTIVE', { params: branchQS }).then(r => {
      const data = r.data;
      setTrucks(Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : []);
    }).catch(() => setTrucks([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(branchQS)]);

  const current = REPORTS.find(r => r.key === active);

  const buildParams = (extra = {}) => {
    const p = { date_from: dateFrom, date_to: dateTo, ...extra };
    if (truckFilter && current?.hasTruckFilter) p.truck = truckFilter;
    return p;
  };

  const doFetch = async () => {
    setLoading(true);
    setData(null);
    try {
      const resp = await api.get(`/reports/${active}/`, {
        params: { ...branchQS, ...buildParams({ export: 'json' }) }
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
    return k?.includes('amount') || k?.includes('cost') || k?.includes('revenue') ||
           k?.includes('expenditure') || k?.includes('profit') || k?.includes('vat') ||
           k?.includes('total') || k?.includes('wage') || k?.includes('subtotal') ||
           k?.includes('balance') || k?.includes('labour') || k?.includes('parts') ||
           k?.includes('value') || k?.includes('invoiced') || k?.includes('price');
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

      {/* Summary cards */}
      {data?.summary && (
        <div className="mb16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px,1fr))', gap: 10 }}>
          {Object.entries(data.summary).map(([k, v]) => (
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
                {typeof v === 'number' ? fmtCurrency(v) : v}
              </div>
            </div>
          ))}
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
