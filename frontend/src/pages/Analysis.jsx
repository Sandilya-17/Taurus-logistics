// src/pages/Analysis.jsx – Monthly Analysis: income vs expense by area | Taurus ERP
import { useState, useEffect } from 'react';
import { useBranch, useCurrency } from '../App';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend,
} from 'recharts';
import PieChartCard from '../components/PieChartCard';

const PALETTE = [
  '#1a56db', '#0e9f6e', '#d97706', '#e02424', '#7c3aed',
  '#0694a2', '#db2777', '#475569', '#059669', '#0369a1',
  '#ca8a04', '#9333ea',
];

const withColors = (items) =>
  (items || []).map((it, i) => ({
    label: it.label,
    value: it.amount,
    color: PALETTE[i % PALETTE.length],
  }));

function monthsAgoISO(n) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return d.toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
}

export default function AnalysisPage() {
  const branchCtx = useBranch();
  const { fmt: fmtCur } = useCurrency();
  const branchQS = branchCtx?.branchQS || {};
  const branchKey = JSON.stringify(branchQS);

  const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Accra' });
  const [dateFrom, setDateFrom] = useState(monthsAgoISO(11)); // last 12 months by default
  const [dateTo, setDateTo] = useState(todayStr);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState('');

  const doFetch = async ({ silent = false } = {}) => {
    setLoading(true);
    if (!silent) setData(null);
    try {
      const resp = await api.get('/reports/analysis/', {
        params: { ...branchQS, date_from: dateFrom, date_to: dateTo, export: 'json' },
      });
      setData(resp.data);
      if (!silent && !resp.data?.monthly?.length) {
        toast('No data found for the selected period.', { icon: 'ℹ️' });
      }
    } catch (e) {
      if (!silent) toast.error(e.response?.data?.detail || 'Analysis generation failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    doFetch();
  }, [branchKey]);

  // Other pages dispatch this after create/update/delete — silently refresh.
  useEffect(() => {
    const handler = () => { if (data) doFetch({ silent: true }); };
    window.addEventListener('taurus:dashboard:refresh', handler);
    return () => window.removeEventListener('taurus:dashboard:refresh', handler);
  }, [data, dateFrom, dateTo, branchKey]);

  const doDownload = async (fmt) => {
    setDownloading(fmt);
    try {
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const resp = await api.get('/reports/analysis/', {
        params: { ...branchQS, date_from: dateFrom, date_to: dateTo, export: fmt },
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `taurus_analysis_${dateFrom}_to_${dateTo}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Analysis exported as ${fmt.toUpperCase()}.`);
    } catch (e) {
      toast.error('Export failed. Please try again.');
    } finally {
      setDownloading('');
    }
  };

  const monthly = data?.monthly || [];
  const incomeSlices = withColors(data?.income_by_area_total);
  const expenseSlices = withColors(data?.expense_by_area_total);

  return (
    <div>
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
          <button className="btn btn-primary" onClick={() => doFetch()} disabled={loading} style={{ marginTop: 0 }}>
            {loading ? '⏳ Generating…' : '📊 Generate Analysis'}
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
          <div className="kpi" style={{ border: '1px solid var(--border)' }}>
            <div className="kpi-label">Total Income</div>
            <div className="kpi-val" style={{ fontSize: 16, color: 'var(--green)' }}>{fmtCur(data.summary['Total Income'])}</div>
          </div>
          <div className="kpi" style={{ border: '1px solid var(--border)' }}>
            <div className="kpi-label">Total Expense</div>
            <div className="kpi-val" style={{ fontSize: 16, color: 'var(--amber, #d97706)' }}>{fmtCur(data.summary['Total Expense'])}</div>
          </div>
          <div className="kpi" style={{ border: '1px solid var(--border)' }}>
            <div className="kpi-label">Net</div>
            <div className="kpi-val" style={{ fontSize: 16, color: data.summary['Net'] >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {fmtCur(data.summary['Net'])}
            </div>
          </div>
        </div>
      )}

      {/* Monthly income vs expense bar chart */}
      {monthly.length > 0 && (
        <div className="card mb16">
          <div className="card-title">📅 Monthly Income vs Expense</div>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, n) => [fmtCur(v), n]}
                  contentStyle={{ background: 'var(--bg-card,#fff)', border: '1px solid var(--border,#e5e7eb)', borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" name="Income" fill="#0e9f6e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Expense" fill="#e02424" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Income / Expense by area — pie charts */}
      {(incomeSlices.length > 0 || expenseSlices.length > 0) && (
        <div className="mb16" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 16 }}>
          <PieChartCard
            title="Income by Area"
            icon="💰"
            data={incomeSlices}
            fmt={fmtCur}
            emptyText="No income recorded for this period"
          />
          <PieChartCard
            title="Expense by Area"
            icon="🧾"
            data={expenseSlices}
            fmt={fmtCur}
            emptyText="No expense recorded for this period"
          />
        </div>
      )}

      {/* Month-wise table */}
      {monthly.length > 0 && (
        <div className="card">
          <div className="card-title">
            📋 Month-wise Breakdown
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)', fontWeight: 400 }}>
              {dateFrom} → {dateTo}
            </span>
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Income</th>
                  <th style={{ textAlign: 'right' }}>Expense</th>
                  <th style={{ textAlign: 'right' }}>Net</th>
                </tr>
              </thead>
              <tbody>
                {monthly.map((m) => (
                  <tr key={m.month}>
                    <td>{m.label}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--green)' }}>{fmtCur(m.income)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', color: 'var(--amber, #d97706)' }}>{fmtCur(m.expense)}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: m.net >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtCur(m.net)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!data && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📊</div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Analysis</div>
          <div style={{ fontSize: 12 }}>Monthly income and expense, broken down by area</div>
          <div style={{ marginTop: 16, fontSize: 12 }}>Select a date range and click <strong>Generate Analysis</strong></div>
        </div>
      )}
    </div>
  );
}
