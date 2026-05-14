// src/pages/Issue.jsx – Issue items with trip linkage; supports multi-item bulk issue
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

// ── Helper: empty issue line ─────────────────────────────────────────────────
const emptyLine = () => ({
  _key:        Date.now() + Math.random(),
  item_id:     '',
  location_id: '',
  quantity:    '',
  avail:       null,
  unitPrice:   0,
  totalVal:    0,
  stockErr:    false,
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

  // ── Multi-item lines ────────────────────────────────────────────────────────
  const [lines, setLines] = useState([emptyLine()]);

  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { issue_type: 'TRUCK', issue_date: '', truck_id: '', trip_id: '', remark: '' }
  });

  const watchedType  = watch('issue_type');
  const watchedTruck = watch('truck_id');

  const loadData = () => {
    api.get('/inventory/items/').then(r       => setItems(r.data.results    || r.data));
    api.get('/inventory/locations/').then(r   => setLocations(r.data.results || r.data));
    api.get('/trucks/?status=ACTIVE').then(r  => setTrucks(r.data.results   || r.data));
    api.get('/trips/?status=EN_ROUTE').then(r => setTrips(r.data.results    || r.data));
    api.get('/inventory/issues/?page_size=200').then(r => setHistory(r.data.results || r.data));
  };

  useEffect(() => { loadData(); }, []);

  const truckTrips = watchedTruck
    ? trips.filter(t => String(t.truck) === String(watchedTruck))
    : trips;

  // ── Stock check for a single line ──────────────────────────────────────────
  const checkStock = useCallback(async (idx, itemId, locationId) => {
    if (!itemId) {
      setLines(prev => prev.map((l, i) => i !== idx ? l : { ...l, avail: null, unitPrice: 0, totalVal: 0, stockErr: false }));
      return;
    }
    try {
      const params = { item: itemId };
      if (locationId) params.location = locationId;
      const r  = await api.get('/inventory/available-stock/', { params });
      const avail = r.data.available_qty;

      // Get latest purchase price
      const lr = await api.get('/inventory/ledger/', { params: { item: itemId, transaction_type: 'PURCHASE' } });
      const rows = lr.data.results || lr.data;
      const unitPrice = rows.length > 0 ? (parseFloat(rows[0].unit_price) || 0) : 0;

      setLines(prev => prev.map((l, i) => {
        if (i !== idx) return l;
        const qty      = parseFloat(l.quantity) || 0;
        const totalVal = qty * unitPrice;
        const stockErr = qty > parseFloat(avail);
        return { ...l, avail, unitPrice, totalVal, stockErr };
      }));
    } catch {
      setLines(prev => prev.map((l, i) => i !== idx ? l : { ...l, avail: null, unitPrice: 0 }));
    }
  }, []);

  // ── Line field change handlers ─────────────────────────────────────────────
  const updateLine = (idx, field, value) => {
    setLines(prev => {
      const next = prev.map((l, i) => i !== idx ? l : { ...l, [field]: value });
      const line = next[idx];

      if (field === 'quantity') {
        const qty      = parseFloat(value) || 0;
        const totalVal = qty * line.unitPrice;
        const stockErr = line.avail !== null && qty > parseFloat(line.avail);
        next[idx] = { ...line, quantity: value, totalVal, stockErr };
      }

      if (field === 'item_id' || field === 'location_id') {
        // re-check stock after state update
        const updatedLine = next[idx];
        setTimeout(() => checkStock(idx, updatedLine.item_id, updatedLine.location_id), 0);
      }

      return next;
    });
  };

  const addLine    = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx) => setLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (editRec) {
      // Edit mode: single-record patch
      setSaving(true);
      try {
        await api.patch(`/inventory/issues/${editRec.id}/`, {
          remark:     data.remark,
          issue_date: data.issue_date,
        });
        toast.success('Issue updated.');
        setEditRec(null);
        reset({ issue_type: 'TRUCK', issue_date: '', truck_id: '', trip_id: '', remark: '' });
        loadData();
      } catch (e) {
        toast.error(e.response?.data?.error || 'Failed to update issue.');
      } finally { setSaving(false); }
      return;
    }

    // Validate lines
    const validLines = lines.filter(l => l.item_id && l.location_id && parseFloat(l.quantity) > 0);
    if (validLines.length === 0) { toast.error('Add at least one item to issue.'); return; }
    const hasStockErr = validLines.some(l => l.stockErr);
    if (hasStockErr) { toast.error('One or more items exceed available stock.'); return; }

    setSaving(true);
    try {
      await Promise.all(validLines.map(line =>
        api.post('/inventory/issues/', {
          item_id:    line.item_id,
          location_id: line.location_id,
          quantity:   parseFloat(line.quantity),
          issue_type: data.issue_type,
          truck_id:   data.truck_id  || null,
          trip_id:    data.trip_id   || null,
          issue_date: data.issue_date,
          remark:     data.remark,
        })
      ));
      toast.success(`${validLines.length} item${validLines.length > 1 ? 's' : ''} issued successfully.${data.trip_id ? ' Trip spare parts cost updated.' : ''}`);
      reset({ issue_type: 'TRUCK', issue_date: '', truck_id: '', trip_id: '', remark: '' });
      setLines([emptyLine()]);
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to record issue.');
    } finally { setSaving(false); }
  };

  const startEdit = (i) => {
    setEditRec(i);
    setValue('issue_date', i.issue_date || '');
    setValue('remark',     i.remark || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteIssue = async (id) => {
    if (!window.confirm('Delete this issue? The stock ledger debit will be reversed.')) return;
    try {
      await api.delete(`/inventory/issues/${id}/`);
      toast.success('Issue deleted. Stock ledger reversed.');
      loadData();
    } catch { toast.error('Failed to delete issue.'); }
  };

  const cancelEdit = () => {
    setEditRec(null);
    reset({ issue_type: 'TRUCK', issue_date: '', truck_id: '', trip_id: '', remark: '' });
    setLines([emptyLine()]);
  };

  const grandTotal = lines.reduce((s, l) => s + (l.totalVal || 0), 0);
  const anyStockErr = lines.some(l => l.stockErr);

  return (
    <div>
      <div className="flex justify-between items-center mb16">
        <p style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {editRec
            ? '✏️ Editing issue — only date and remark are editable (quantity is locked to protect ledger integrity).'
            : 'Add multiple items at once for a truck. Stock is validated live per line.'}
        </p>
      </div>

      <div className="g2">
        {/* ── Issue Form ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-ic">{editRec ? '✏️' : '📤'}</span>
            {editRec ? 'Edit Issue Record' : 'Issue Items from Stock'}
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Header fields (date, type, truck, trip, remark) ── */}
            <div className="sec-div">Issue Details</div>
            <div className="fgrid">
              <div className="fg">
                <label>Issue Date *</label>
                <input type="date" {...register('issue_date', { required: true })} />
              </div>

              {!editRec && (
                <>
                  <div className="fg">
                    <label>Issue Type *</label>
                    <select {...register('issue_type', { required: true })}>
                      <option value="TRUCK">TRUCK</option>
                      <option value="WORKSHOP">WORKSHOP</option>
                      <option value="BREAKDOWN">BREAKDOWN</option>
                    </select>
                  </div>

                  {watchedType === 'TRUCK' && (
                    <div className="fg">
                      <label>Truck</label>
                      <select {...register('truck_id')}>
                        <option value="">— Select Truck —</option>
                        {trucks.map(t => (
                          <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="fg">
                    <label>Link to Trip <span style={{ fontSize: 10, color: 'var(--muted)' }}>(auto-updates trip cost)</span></label>
                    <select {...register('trip_id')}>
                      <option value="">— None / Not Trip-Specific —</option>
                      {truckTrips.map(t => (
                        <option key={t.id} value={t.id}>{t.waybill_no} – {t.origin} → {t.destination}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {editRec && (
                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <div className="alert" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                    📦 <strong style={{ color: 'var(--text)' }}>{editRec.item_name}</strong> · Qty: {editRec.quantity} · Type: {editRec.issue_type}
                    {editRec.truck_number && ` · Truck: ${editRec.truck_number}`}
                    {editRec.trip_waybill && ` · Trip: ${editRec.trip_waybill}`}
                  </div>
                </div>
              )}

              <div className="fg" style={{ gridColumn: 'span 2' }}>
                <label>Remark</label>
                <input type="text" placeholder="Purpose / job reference" {...register('remark')} />
              </div>
            </div>

            {/* ── Multi-item lines (only in new-issue mode) ── */}
            {!editRec && (
              <>
                <div className="sec-div" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Items to Issue ({lines.length})</span>
                  <button type="button" className="btn btn-sm btn-ghost" style={{ fontSize: 11 }} onClick={addLine}>
                    + Add Another Item
                  </button>
                </div>

                {/* Column headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 0.8fr 0.9fr 0.9fr 28px',
                  gap: 6, padding: '4px 0', fontSize: 10.5, fontWeight: 700,
                  color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em'
                }}>
                  <span>Item *</span>
                  <span>Location *</span>
                  <span style={{ textAlign: 'right' }}>Avail</span>
                  <span style={{ textAlign: 'right' }}>Qty *</span>
                  <span style={{ textAlign: 'right' }}>Value</span>
                  <span></span>
                </div>

                {lines.map((line, idx) => (
                  <div key={line._key} style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 0.8fr 0.9fr 0.9fr 28px',
                    gap: 6, marginBottom: 6,
                    background: line.stockErr ? 'rgba(220,38,38,0.04)' : 'transparent',
                    borderRadius: 6, padding: '4px 0',
                  }}>
                    {/* Item */}
                    <select
                      value={line.item_id}
                      onChange={e => updateLine(idx, 'item_id', e.target.value)}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">— Select Item —</option>
                      {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>

                    {/* Location */}
                    <select
                      value={line.location_id}
                      onChange={e => updateLine(idx, 'location_id', e.target.value)}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">— Location —</option>
                      {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>

                    {/* Available */}
                    <div className="calc-box" style={{
                      fontSize: 11, textAlign: 'right',
                      color: line.avail === null ? 'var(--muted)' : parseFloat(line.avail) > 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                      {line.avail === null ? '—' : parseFloat(line.avail).toFixed(2)}
                    </div>

                    {/* Quantity */}
                    <input
                      type="number" step="0.001" min="0.001"
                      placeholder="0"
                      value={line.quantity}
                      onChange={e => updateLine(idx, 'quantity', e.target.value)}
                      style={{
                        fontSize: 12, textAlign: 'right',
                        borderColor: line.stockErr ? 'var(--red)' : undefined
                      }}
                    />

                    {/* Value */}
                    <div className="calc-box" style={{ fontSize: 11, textAlign: 'right' }}>
                      {line.totalVal > 0 ? fmtGHS(line.totalVal) : '—'}
                    </div>

                    {/* Remove */}
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      disabled={lines.length === 1}
                      style={{
                        background: 'none', border: 'none', cursor: lines.length > 1 ? 'pointer' : 'default',
                        color: lines.length > 1 ? 'var(--red)' : 'var(--muted)',
                        fontSize: 15, padding: 0, lineHeight: 1,
                      }}
                      title="Remove line"
                    >✕</button>
                  </div>
                ))}

                {/* Stock error summary */}
                {anyStockErr && (
                  <div className="excess-warn" style={{ marginTop: 4 }}>
                    ⛔ One or more lines exceed available stock. Fix quantities before issuing.
                  </div>
                )}

                {/* Grand total */}
                {grandTotal > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    gap: 8, marginTop: 6, padding: '6px 8px',
                    background: 'var(--surface)', borderRadius: 6, fontSize: 12, fontWeight: 700
                  }}>
                    <span style={{ color: 'var(--muted)' }}>Total Issue Value:</span>
                    <span style={{ color: 'var(--green)', fontSize: 14 }}>{fmtGHS(grandTotal)}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                      ({lines.filter(l => l.item_id && parseFloat(l.quantity) > 0).length} line{lines.filter(l => l.item_id).length !== 1 ? 's' : ''})
                    </span>
                  </div>
                )}
              </>
            )}

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-amber" disabled={saving || (!editRec && anyStockErr)}>
                {saving ? '⏳ Processing…' : editRec ? '✓ Update Issue' : `↗ Issue ${lines.filter(l => l.item_id && parseFloat(l.quantity) > 0).length || ''} Item${lines.filter(l => l.item_id && parseFloat(l.quantity) > 0).length !== 1 ? 's' : ''}`}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                {editRec ? 'Cancel Edit' : 'Clear'}
              </button>
            </div>
          </form>
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
