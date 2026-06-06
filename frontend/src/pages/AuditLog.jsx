// src/pages/AuditLog.jsx – Admin Audit Trail Viewer
import { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { fmtDate } from '../utils/api';

const ACTION_COLORS = {
  CREATE: 'var(--green)',
  UPDATE: 'var(--blue)',
  DELETE: 'var(--red)',
  LOGIN:  'var(--teal, #0d9488)',
  LOGOUT: 'var(--muted)',
  VIEW:   'var(--muted)',
};

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [total,   setTotal]   = useState(0);
  const [search,  setSearch]  = useState('');
  const [action,  setAction]  = useState('');
  const [expanded, setExpanded] = useState(null);

  const PAGE_SIZE = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, page_size: PAGE_SIZE });
      if (search) params.append('search', search);
      if (action) params.append('action', action);
      const { data } = await api.get(`/core/audit/?${params}`);
      setLogs(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch {
      setLogs([]);
    } finally { setLoading(false); }
  }, [page, search, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Search</label>
            <input
              className="form-input"
              placeholder="Email, endpoint, object…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div style={{ minWidth: 140 }}>
            <label className="form-label">Action</label>
            <select className="form-input" value={action} onChange={e => { setAction(e.target.value); setPage(1); }}>
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>
          <button className="btn btn-ghost" onClick={fetchLogs} disabled={loading}>
            {loading ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-title">
          <span className="card-title-ic">🔍</span>
          Audit Trail
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500, marginLeft: 8 }}>
            {total.toLocaleString()} records
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--muted)' }}>Loading audit log…</div>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Module</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>IP Address</th>
                  <th style={{ textAlign: 'center' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No audit records found.</td></tr>
                ) : logs.map((log, i) => (
                  <>
                    <tr key={log.id || i}>
                      <td style={{ fontFamily: 'monospace', fontSize: 11.5, whiteSpace: 'nowrap' }}>
                        {log.created_at ? new Date(log.created_at).toLocaleString('en-GB', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit', second: '2-digit',
                          timeZone: 'Africa/Accra'
                        }) : '—'}
                      </td>
                      <td style={{ fontSize: 12 }}>
                        <div style={{ fontWeight: 600 }}>{log.user_name || '—'}</div>
                        <div style={{ color: 'var(--muted)', fontSize: 10.5 }}>{log.user}</div>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: ACTION_COLORS[log.action] || 'var(--text)',
                          background: (ACTION_COLORS[log.action] || 'var(--text)') + '18',
                          padding: '2px 8px', borderRadius: 20,
                        }}>
                          {log.action}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, textTransform: 'capitalize' }}>{log.model_name || '—'}</td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span title={log.endpoint}>{log.endpoint}</span>
                      </td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700,
                          color: log.response_code >= 400 ? 'var(--red)' : 'var(--green)',
                          background: (log.response_code >= 400 ? 'var(--red)' : 'var(--green)') + '18',
                          padding: '2px 8px', borderRadius: 20,
                        }}>
                          {log.response_code || '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{log.ip_address || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ fontSize: 11, padding: '2px 8px' }}
                            onClick={() => setExpanded(expanded === i ? null : i)}
                          >
                            {expanded === i ? '▲ Hide' : '▼ Show'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === i && (
                      <tr key={`${log.id || i}-detail`} style={{ background: 'var(--surface)' }}>
                        <td colSpan={8} style={{ padding: '8px 16px' }}>
                          <pre style={{
                            margin: 0, fontSize: 11.5, color: 'var(--text)',
                            background: 'var(--bg)', padding: 12, borderRadius: 8,
                            overflow: 'auto', maxHeight: 200,
                          }}>
                            {JSON.stringify(log.changes, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(1)}>« First</button>
            <button className="btn btn-ghost btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
            <span style={{ padding: '5px 12px', fontSize: 13, color: 'var(--muted)' }}>
              Page {page} of {totalPages}
            </span>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
            <button className="btn btn-ghost btn-sm" disabled={page === totalPages} onClick={() => setPage(totalPages)}>Last »</button>
          </div>
        )}
      </div>
    </div>
  );
}
