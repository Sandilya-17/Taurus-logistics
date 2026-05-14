// src/pages/Issue.jsx – Issue items with multi-item bulk support + trip linkage
import { useState, useEffect, useCallback } from 'react';
import api, { fmtGHS } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

const EMPTY_ROW = () => ({
  _key:        Math.random().toString(36).slice(2),
  item_id:     '',
  location_id: '',
  quantity:    '',
  remark:      '',
  avail:       null,
  unitPrice:   0,
  totalVal:    0,
  stockErr:    false,
  loadingAvail: false,
});

export default function IssuePage() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'ADMIN';

  const [items,     setItems]     = useState([]);
  const [locations, setLocations] = useState([]);
  const [trucks,    setTrucks]    = useState([]);
  const [trips,     setTrips]     = useState([]);
  const [history,   setHistory]   = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [editRec,   setEditRec]   = useState(null);

  // Shared header fields
  const [issueDate,  setIssueDate]  = useState('');
  const [issueType,  setIssueType]  = useState('TRUCK');
  const [truckId,    setTruckId]    = useState('');
  const [tripId,     setTripId]     = useState('');
  const [sharedLoc,  setSharedLoc]  = useState('');

  // Item rows
  const [rows, setRows] = useState([EMPTY_ROW()]);

  // Edit mode fields
  const [editDate,   setEditDate]   = useState('');
  const [editRemark, setEditRemark] = useState('');

  const loadData = useCallback(() => {
    api.get('/inventory/items/?page_size=2000').then(r  => setItems(r.data.results    || r.data));
    api.get('/inventory/locations/').then(r             => setLocations(r.data.results || r.data));
    api.get('/trucks/?status=ACTIVE').then(r            => setTrucks(r.data.results   || r.data));
    api.get('/trips/?status=EN_ROUTE').then(r           => setTrips(r.data.results    || r.data));
    api.get('/inventory/issues/?page_size=200').then(r  => setHistory(r.data.results  || r.data));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const truckTrips = truckId
    ? trips.filter(t => String(t.truck) === String(truckId))
    : trips;

  const fetchAvail = useCallback(async (key, itemId, locationId) => {
    if (!itemId) {
      setRows(prev => prev.map(r => r._key === key
        ? { ...r, avail: null, unitPrice: 0, totalVal: 0, stockErr: false }
        : r));
      return;
    }
    setRows(prev => prev.map(r => r._key === key ? { ...r, loadingAvail: true } : r));
    try {
      const params = { item: itemId };
      if (locationId) params.location = locationId;
      const [stockRes, ledgerRes] = await Promise.all([
        api.get('/inventory/available-stock/', { params }),
        api.get('/inventory/ledger/', { params: { item: itemId, transaction_type: 'PURCHASE' } }),
      ]);
      const avail = stockRes.data.available_qty;
      const ledgerRows = ledgerRes.data.results || ledgerRes.data;
      const unitPrice = ledgerRows.length > 0 ? parseFloat(ledgerRows[0].unit_price) || 0 : 0;
      setRows(prev => prev.map(r => {
        if (r._key !== key) return r;
        const qty = parseFloat(r.quantity) || 0;
        return { ...r, avail, unitPrice, totalVal: qty * unitPrice, stockErr: qty > parseFloat(avail), loadingAvail: false };
      }));
    } catch {
      setRows(prev => prev.map(r => r._key === key ? { ...r, avail: null, loadingAvail: false } : r));
    }
  }, []);

  const updateRow = (key, field, value) => {
    setRows(prev => prev.map(r => {
      if (r._key !== key) return r;
      const updated = { ...r, [field]: value };
      if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        updated.totalVal = qty * r.unitPrice;
        updated.stockErr = r.avail !== null && qty > parseFloat(r.avail);
      }
      return updated;
    }));
    if (field === 'item_id') {
      const row = rows.find(r => r._key === key);
      fetchAvail(key, value, row?.location_id || sharedLoc || '');
    }
    if (field === 'location_id') {
      const row = rows.find(r => r._key === key);
      fetchAvail(key, row?.item_id || '', value);
    }
  };

  useEffect(() => {
    rows.forEach(r => {
      if (r.item_id && !r.location_id) {
        fetchAvail(r._key, r.item_id, sharedLoc);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedLoc]);

  const addRow    = () => setRows(prev => [...prev, EMPTY_ROW()]);
  const removeRow = (key) => setRows(prev => prev.length === 1 ? prev : prev.filter(r => r._key !== key));

  const resetForm = () => {
    setRows([EMPTY_ROW()]);
    setIssueDate(''); setIssueType('TRUCK'); setTruckId(''); setTripId(''); setSharedLoc('');
  };

  const onSubmit = async () => {
    if (!issueDate) { toast.error('Please select an issue date.'); return; }
    if (rows.some(r => r.stockErr)) { toast.error('One or more rows have insufficient stock.'); return; }
    const validRows = rows.filter(r => r.item_id && (r.location_id || sharedLoc) && parseFloat(r.quantity) > 0);
    if (validRows.length === 0) { toast.error('Add at least one item with quantity > 0.'); return; }

    setSaving(true);
    try {
      const res = await api.post('/inventory/bulk-issue/', {
        items: validRows.map(r => ({
          item_id:     r.item_id,
          location_id: r.location_id || sharedLoc,
          quantity:    parseFloat(r.quantity),
          remark:      r.remark,
        })),
        truck_id:   truckId   || null,
        trip_id:    tripId    || null,
        issue_type: issueType,
        issue_date: issueDate,
      });
      const { created_count, error_count, errors } = res.data;
      if (error_count === 0) {
        toast.success(`✅ ${created_count} item(s) issued.${tripId ? ' Trip spare parts cost updated.' : ''}`);
      } else {
        toast.success(`⚠️ ${created_count} issued, ${error_count} failed.`);
        errors.forEach(e => toast.error(`Item ${e.row?.item_id}: ${e.error}`));
      }
      resetForm();
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to record issue.');
    } finally { setSaving(false); }
  };

  const startEdit = (i) => {
    setEditRec(i);
    setEditDate(i.issue_date || '');
    setEditRemark(i.remark || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitEdit = async () => {
    setSaving(true);
    try {
      await api.patch(`/inventory/issues/${editRec.id}/`, { remark: editRemark, issue_date: editDate });
      toast.success('Issue updated.');
      setEditRec(null);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update.');
    } finally { setSaving(false); }
  };

  const deleteIssue = async (id) => {
    if (!window.confirm('Delete this issue? The stock ledger debit will be reversed.')) return;
    try {
      await api.delete(`/inventory/issues/${id}/`);
      toast.success('Issue deleted. Stock ledger reversed.');
      loadData();
    } catch { toast.error('Failed to delete issue.'); }
  };

  const grandTotal = rows.reduce((s, r) => s + (r.totalVal || 0), 0);
  const readyCount = rows.filter(r => r.item_id && parseFloat(r.quantity) > 0).length;

  return (
    <div>
      {editRec && (
        <div className="alert alert-warn mb16" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>✏️ Editing issue <strong>ISS-{editRec.id}</strong> — only date and remark are editable.</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setEditRec(null)}>✕ Cancel Edit</button>
        </div>
      )}

      <div className="g2">
        {/* ── Form ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-ic">{editRec ? '✏️' : '📤'}</span>
            {editRec ? 'Edit Issue Record' : 'Issue Items from Stock'}
          </div>

          {editRec ? (
            <div>
              <div className="fgrid">
                <div className="fg">
                  <label>Issue Date *</label>
                  <input type="date" value={editDate} onChange={e => setEditDate(e.target.value)} />
                </div>
                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <div className="alert" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                    📦 <strong style={{ color: 'var(--text)' }}>{editRec.item_name}</strong> · Qty: {editRec.quantity} · Type: {editRec.issue_type}
                    {editRec.truck_number && ` · Truck: ${editRec.truck_number}`}
                    {editRec.trip_waybill && ` · Trip: ${editRec.trip_waybill}`}
                  </div>
                </div>
                <div className="fg" style={{ gridColumn: 'span 3' }}>
                  <label>Remark</label>
                  <input type="text" value={editRemark} onChange={e => setEditRemark(e.target.value)} placeholder="Purpose / job reference" />
                </div>
              </div>
              <div className="flex gap8 mt16">
                <button className="btn btn-amber" onClick={submitEdit} disabled={saving}>
                  {saving ? '⏳ Saving…' : '✓ Update Issue'}
                </button>
                <button className="btn btn-ghost" onClick={() => setEditRec(null)}>Cancel</button>
              </div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div className="sec-div">Issue Header</div>
              <div className="fgrid" style={{ marginBottom: 12 }}>
                <div className="fg">
                  <label>Issue Date *</label>
                  <input type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)} />
                </div>
                <div className="fg">
                  <label>Issue Type *</label>
                  <select value={issueType} onChange={e => setIssueType(e.target.value)}>
                    <option value="TRUCK">TRUCK</option>
                    <option value="WORKSHOP">WORKSHOP</option>
                    <option value="BREAKDOWN">BREAKDOWN</option>
                  </select>
                </div>
                {issueType === 'TRUCK' && (
                  <div className="fg">
                    <label>Truck</label>
                    <select value={truckId} onChange={e => { setTruckId(e.target.value); setTripId(''); }}>
                      <option value="">— Select Truck —</option>
                      {trucks.map(t => (
                        <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="fg">
                  <label>Link to Trip <span style={{ fontSize: 10, color: 'var(--muted)' }}>(auto-updates trip cost)</span></label>
                  <select value={tripId} onChange={e => setTripId(e.target.value)}>
                    <option value="">— None —</option>
                    {truckTrips.map(t => (
                      <option key={t.id} value={t.id}>{t.waybill_no} – {t.origin} → {t.destination}</option>
                    ))}
                  </select>
                </div>
                <div className="fg">
                  <label>Default Location <span style={{ fontSize: 10, color: 'var(--muted)' }}>(shared for all rows)</span></label>
                  <select value={sharedLoc} onChange={e => setSharedLoc(e.target.value)}>
                    <option value="">— Select Default —</option>
                    {locations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Item rows */}
              <div className="sec-div" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>📋 Items to Issue</span>
                <button type="button" className="btn btn-sm"
                  style={{ background: 'var(--navy,#1e3a5f)', color: '#fff', fontSize: 11 }}
                  onClick={addRow}>
                  + Add Row
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface)', borderBottom: '2px solid var(--border)' }}>
                      <th style={{ padding: '8px', textAlign: 'left', width: 28, color: 'var(--muted)' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'left', minWidth: 190 }}>Item *</th>
                      <th style={{ padding: '8px', textAlign: 'left', minWidth: 140 }}>Location</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: 100 }}>Available</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: 95 }}>Unit Price</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: 90 }}>Qty *</th>
                      <th style={{ padding: '8px', textAlign: 'right', width: 100 }}>Total (GH₵)</th>
                      <th style={{ padding: '8px', textAlign: 'left', minWidth: 120 }}>Remark</th>
                      <th style={{ padding: '8px', width: 30 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, idx) => (
                      <tr key={row._key} style={{
                        background: row.stockErr ? 'rgba(220,38,38,0.04)' : idx % 2 === 0 ? undefined : 'rgba(0,0,0,0.015)',
                        borderBottom: '1px solid var(--border)',
                      }}>
                        <td style={{ padding: '5px 8px', color: 'var(--muted)', fontSize: 11 }}>{idx + 1}</td>
                        <td style={{ padding: '4px 5px' }}>
                          <select value={row.item_id}
                            onChange={e => updateRow(row._key, 'item_id', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '5px 6px' }}>
                            <option value="">— Select Item —</option>
                            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '4px 5px' }}>
                          <select value={row.location_id}
                            onChange={e => updateRow(row._key, 'location_id', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '5px 6px' }}>
                            <option value="">{sharedLoc ? '(shared default)' : '— Select —'}</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right' }}>
                          {row.loadingAvail
                            ? <span style={{ color: 'var(--muted)', fontSize: 11 }}>…</span>
                            : row.avail === null
                              ? <span style={{ color: '#cbd5e1', fontSize: 11 }}>—</span>
                              : <span style={{ color: parseFloat(row.avail) > 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                                  {parseFloat(row.avail).toFixed(3)}
                                </span>
                          }
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', color: 'var(--muted)' }}>
                          {row.unitPrice > 0 ? fmtGHS(row.unitPrice) : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '4px 5px' }}>
                          <input type="number" step="0.001" min="0.001" placeholder="0"
                            value={row.quantity}
                            onChange={e => updateRow(row._key, 'quantity', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '5px 6px', textAlign: 'right',
                              borderColor: row.stockErr ? 'var(--red)' : undefined }} />
                        </td>
                        <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>
                          {row.totalVal > 0
                            ? <span style={{ color: row.stockErr ? 'var(--red)' : 'var(--text)' }}>{fmtGHS(row.totalVal)}</span>
                            : <span style={{ color: '#cbd5e1' }}>—</span>}
                        </td>
                        <td style={{ padding: '4px 5px' }}>
                          <input type="text" placeholder="Optional…"
                            value={row.remark}
                            onChange={e => updateRow(row._key, 'remark', e.target.value)}
                            style={{ width: '100%', fontSize: 12, padding: '5px 6px' }} />
                        </td>
                        <td style={{ padding: '4px 6px', textAlign: 'center' }}>
                          <button type="button" onClick={() => removeRow(row._key)}
                            style={{ background: 'none', border: 'none', cursor: rows.length === 1 ? 'not-allowed' : 'pointer',
                              color: rows.length === 1 ? '#cbd5e1' : 'var(--red)', fontSize: 15, padding: '2px 4px' }}
                            disabled={rows.length === 1} title="Remove row">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {rows.length > 1 && (
                    <tfoot>
                      <tr style={{ background: 'var(--surface)', fontWeight: 700, borderTop: '2px solid var(--border)' }}>
                        <td colSpan={6} style={{ padding: '8px 12px', fontSize: 12, color: 'var(--muted)' }}>
                          {readyCount} item(s) ready to issue
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmtGHS(grandTotal)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>

              {rows.some(r => r.stockErr) && (
                <div className="excess-warn" style={{ marginTop: 8 }}>
                  ⛔ One or more rows have insufficient stock. Please reduce quantities or remove those rows.
                </div>
              )}

              <div className="flex gap8 mt16">
                <button type="button" className="btn btn-amber" onClick={onSubmit} disabled={saving}>
                  {saving ? '⏳ Processing…' : `↗ Issue ${readyCount > 0 ? readyCount : ''} Item(s)`}
                </button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Clear All</button>
              </div>
            </div>
          )}
        </div>

        {/* ── Issue History ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span>Recent Issues</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Item</th><th>Type</th><th>Truck</th><th>Trip</th>
                  <th>Qty</th><th>Value (GH₵)</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No issues yet</td></tr>
                )}
                {history.map(i => (
                  <tr key={i.id} style={{ background: editRec?.id === i.id ? 'rgba(245,158,11,0.06)' : undefined }}>
                    <td>{new Date(i.issue_date).toLocaleDateString('en-GB')}</td>
                    <td>{i.item_name}</td>
                    <td><span className={`badge ${i.issue_type === 'TRUCK' ? 'b-blue' : 'b-amber'}`}>{i.issue_type}</span></td>
                    <td className="mono">{i.truck_number || '—'}</td>
                    <td className="mono">{i.trip_waybill || '—'}</td>
                    <td>{i.quantity}</td>
                    <td className="ced">{parseFloat(i.final_amount).toFixed(2)}</td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(i)} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteIssue(i.id)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
