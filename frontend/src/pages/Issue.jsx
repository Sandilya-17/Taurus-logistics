// src/pages/Issue.jsx – Multi-item issue with FIFO costing & truck/trip linkage
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

const newLine = () => ({
  _key:          Math.random().toString(36).slice(2),
  item_id:       '',
  location_id:   '',
  quantity:      '',
  other_purpose: '',   // used when issue_type === 'OTHER'
  avail:         null,
  fifoBatches:   [],   // FIFO batch breakdown
  unitPrice:     0,    // weighted-average FIFO price
  lineTotal:     0,
  stockErr:      false,
  checking:      false,
});

/** Compute FIFO weighted-average price for qty from batch list */
function fifoPrice(batches, qty) {
  let need = qty;
  let wsum = 0;
  for (const b of batches) {
    if (need <= 0) break;
    const take = Math.min(b.remaining, need);
    wsum += take * b.unit_price;
    need -= take;
  }
  return qty > 0 ? wsum / qty : 0;
}

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
  const [lines,     setLines]     = useState([newLine()]);

  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { issue_date: '', issue_type: 'TRUCK', truck_id: '', trip_id: '', remark: '' }
  });

  const watchType  = watch('issue_type');
  const watchTruck = watch('truck_id');

  const loadData = () => {
    api.get('/inventory/items/?page_size=500').then(r  => setItems(r.data.results    || r.data));
    api.get('/inventory/locations/').then(r            => setLocations(r.data.results || r.data));
    api.get('/trucks/?status=ACTIVE').then(r           => setTrucks(r.data.results   || r.data));
    api.get('/trips/?status=EN_ROUTE').then(r          => setTrips(r.data.results    || r.data));
    api.get('/inventory/issues/?page_size=200').then(r => setHistory(r.data.results  || r.data));
  };

  useEffect(() => { loadData(); }, []);

  const truckTrips = watchTruck
    ? trips.filter(t => String(t.truck) === String(watchTruck))
    : trips;

  /** Fetch FIFO batch breakdown for a line; recompute price from qty */
  const checkStock = async (idx, itemId, locationId, qty) => {
    if (!itemId || !locationId) {
      setLines(prev => prev.map((l, i) => i !== idx ? l
        : { ...l, avail: null, fifoBatches: [], unitPrice: 0, lineTotal: 0, stockErr: false, checking: false }));
      return;
    }
    setLines(prev => prev.map((l, i) => i !== idx ? l : { ...l, checking: true }));
    try {
      const res = await api.get('/inventory/fifo-breakdown/', {
        params: { item: itemId, location: locationId }
      });
      const { total_available, batches } = res.data;
      const avail = parseFloat(total_available || 0);

      setLines(prev => prev.map((l, i) => {
        if (i !== idx) return l;
        const lineQty  = parseFloat(qty !== undefined ? qty : l.quantity) || 0;
        const up       = fifoPrice(batches, Math.min(lineQty, avail));
        return {
          ...l,
          avail,
          fifoBatches: batches,
          unitPrice:   up,
          lineTotal:   lineQty * up,
          stockErr:    lineQty > avail,
          checking:    false,
        };
      }));
    } catch {
      setLines(prev => prev.map((l, i) => i !== idx ? l : { ...l, avail: null, checking: false }));
    }
  };

  const updateLine = (idx, field, value) => {
    setLines(prev => {
      const next = prev.map((l, i) => i !== idx ? l : { ...l, [field]: value });
      const line = next[idx];

      if (field === 'quantity') {
        const qty = parseFloat(value) || 0;
        const up  = fifoPrice(line.fifoBatches, Math.min(qty, line.avail || 0));
        next[idx] = {
          ...line,
          unitPrice: up,
          lineTotal: qty * up,
          stockErr:  line.avail !== null && qty > line.avail,
        };
        return next;
      }
      if (field === 'item_id' || field === 'location_id') {
        setTimeout(() => checkStock(idx, next[idx].item_id, next[idx].location_id), 0);
      }
      return next;
    });
  };

  const addLine    = () => setLines(p => [...p, newLine()]);
  const removeLine = (idx) => setLines(p => p.length > 1 ? p.filter((_, i) => i !== idx) : p);

  const onSubmit = async (data) => {
    if (editRec) {
      setSaving(true);
      try {
        await api.patch(`/inventory/issues/${editRec.id}/`, { remark: data.remark, issue_date: data.issue_date });
        toast.success('Issue updated.');
        cancelEdit(); loadData();
      } catch (e) { toast.error(e.response?.data?.error || 'Failed to update.'); }
      finally { setSaving(false); }
      return;
    }
    if (!data.issue_date) { toast.error('Select an issue date.'); return; }
    const valid = lines.filter(l => l.item_id && l.location_id && parseFloat(l.quantity) > 0);
    if (!valid.length) { toast.error('Fill in at least one complete item row.'); return; }
    if (valid.some(l => l.stockErr)) { toast.error('Fix stock errors before issuing.'); return; }
    if (data.issue_type === 'OTHER' && valid.some(l => !l.other_purpose?.trim())) {
      toast.error('Fill in a Purpose/Reason for every item when using "OTHER" type.'); return;
    }
    setSaving(true);
    try {
      await Promise.all(valid.map(line => api.post('/inventory/issues/', {
        item_id:     line.item_id,
        location_id: line.location_id,
        quantity:    parseFloat(line.quantity),
        issue_type:  data.issue_type,
        truck_id:    data.truck_id || null,
        trip_id:     data.trip_id  || null,
        issue_date:  data.issue_date,
        remark:      data.issue_type === 'OTHER'
                       ? (line.other_purpose?.trim() || data.remark)
                       : data.remark,
      })));
      toast.success(`✅ ${valid.length} item${valid.length > 1 ? 's' : ''} issued (FIFO costing applied).${data.trip_id ? ' Trip cost updated.' : ''}`);
      reset({ issue_date: '', issue_type: 'TRUCK', truck_id: '', trip_id: '', remark: '' });
      setLines([newLine()]);
      loadData();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to record issue.'); }
    finally { setSaving(false); }
  };

  const startEdit = (rec) => {
    setEditRec(rec);
    setValue('issue_date', rec.issue_date || '');
    setValue('remark',     rec.remark     || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditRec(null);
    reset({ issue_date: '', issue_type: 'TRUCK', truck_id: '', trip_id: '', remark: '' });
    setLines([newLine()]);
  };

  const deleteIssue = async (id) => {
    if (!window.confirm('Delete this issue? Stock ledger will be reversed.')) return;
    try { await api.delete(`/inventory/issues/${id}/`); toast.success('Issue deleted. Stock reversed.'); loadData(); }
    catch { toast.error('Failed to delete issue.'); }
  };

  const grandTotal  = lines.reduce((s, l) => s + (l.lineTotal || 0), 0);
  const anyStockErr = lines.some(l => l.stockErr);
  const readyLines  = lines.filter(l => l.item_id && l.location_id && parseFloat(l.quantity) > 0);

  /** Small FIFO badge showing batch breakdown for a line */
  const FifoBadge = ({ line }) => {
    if (!line.fifoBatches?.length || !parseFloat(line.quantity)) return null;
    const qty = parseFloat(line.quantity) || 0;
    let need = qty;
    const consumed = [];
    for (const b of line.fifoBatches) {
      if (need <= 0) break;
      const take = Math.min(b.remaining, need);
      consumed.push({ take, unit_price: b.unit_price });
      need -= take;
    }
    if (consumed.length === 0) return null;
    return (
      <div style={{
        fontSize: 10, color: 'var(--muted)', marginTop: 4, padding: '4px 8px',
        background: 'rgba(100,180,100,0.07)', borderRadius: 6,
        display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center',
      }}>
        <span style={{ fontWeight: 700, color: 'var(--green)', marginRight: 2 }}>FIFO:</span>
        {consumed.map((c, i) => (
          <span key={i} style={{
            background: i === 0 ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)',
            color: i === 0 ? 'var(--green)' : 'var(--amber)',
            borderRadius: 4, padding: '1px 6px', fontWeight: 600,
          }}>
            {c.take.toFixed(3)} × {fmtGHS(c.unit_price)}
            {i === 0 && consumed.length > 1 ? ' (old stock)' : i === 0 ? ' (old stock)' : ' (new stock)'}
          </span>
        ))}
        {need > 0 && (
          <span style={{ color: 'var(--red)', fontWeight: 700 }}>
            ⛔ {need.toFixed(3)} units short
          </span>
        )}
      </div>
    );
  };

  const issueBadgeClass = (type) => {
    if (type === 'TRUCK')     return 'b-blue';
    if (type === 'WORKSHOP')  return 'b-amber';
    if (type === 'BREAKDOWN') return 'b-red';
    return 'b-gray';
  };

  return (
    <div>
      <div className="g2" style={{ alignItems: 'start' }}>

        {/* ══════════════════════ FORM ══════════════════════ */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-ic">{editRec ? '✏️' : '📤'}</span>
            {editRec ? 'Edit Issue Record' : 'Issue Items from Stock'}
          </div>

          {/* FIFO info banner */}
          {!editRec && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.2)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 11, color: 'var(--muted)',
            }}>
              <span style={{ fontSize: 15 }}>📦</span>
              <span>
                <strong style={{ color: 'var(--green)' }}>FIFO costing active</strong>
                {' '}— oldest stock (opening/earliest purchase) is consumed first at its original price.
                Once exhausted, current purchase price applies.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Header ── */}
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
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  {watchType === 'TRUCK' && (
                    <div className="fg">
                      <label>Truck</label>
                      <select {...register('truck_id')}>
                        <option value="">— Select Truck (optional) —</option>
                        {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>)}
                      </select>
                    </div>
                  )}
                  {(watchType === 'TRUCK' || watchType === 'BREAKDOWN') && (
                    <div className="fg">
                      <label>Link to Trip <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>(auto-updates trip cost)</span></label>
                      <select {...register('trip_id')}>
                        <option value="">— None / Not Trip-Specific —</option>
                        {truckTrips.map(t => <option key={t.id} value={t.id}>{t.waybill_no} – {t.origin} → {t.destination}</option>)}
                      </select>
                    </div>
                  )}

                </>
              )}

              {editRec && (
                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)' }}>
                    🔒 <strong style={{ color: 'var(--text)' }}>{editRec.item_name}</strong>
                    &nbsp;·&nbsp;Qty: {editRec.quantity} · Type: {editRec.issue_type}
                    {editRec.truck_number && ` · Truck: ${editRec.truck_number}`}
                    {editRec.trip_waybill && ` · Trip: ${editRec.trip_waybill}`}
                    <div style={{ marginTop: 4, fontSize: 11, color: 'var(--amber)' }}>⚠️ Quantity is locked — only date and remark are editable.</div>
                  </div>
                </div>
              )}

              <div className="fg" style={{ gridColumn: 'span 2' }}>
                <label>Remark / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Routine maintenance, breakdown repair…"
                  {...register('remark')}
                />
              </div>
            </div>

            {/* ── Multi-item lines ── */}
            {!editRec && (
              <>
                <div className="sec-div" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Items to Issue</span>
                  <button type="button" onClick={addLine}
                    style={{ background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    + Add Item
                  </button>
                </div>

                {/* Column Headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: watchType === 'OTHER'
                    ? '1.8fr 1.2fr 1.6fr 76px 84px 100px 28px'
                    : '2.4fr 1.4fr 76px 84px 100px 28px',
                  gap: 6, padding: '0 4px 6px',
                  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)', marginBottom: 8,
                }}>
                  <span>Item *</span>
                  <span>Location *</span>
                  {watchType === 'OTHER' && <span style={{ color: 'var(--amber)' }}>Purpose / Reason *</span>}
                  <span style={{ textAlign: 'center' }}>In Stock</span>
                  <span style={{ textAlign: 'center' }}>Qty *</span>
                  <span style={{ textAlign: 'right' }}>Line Value</span>
                  <span></span>
                </div>

                {/* Item Rows */}
                {lines.map((line, idx) => (
                  <div key={line._key} style={{ marginBottom: 10 }}>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: watchType === 'OTHER'
                        ? '1.8fr 1.2fr 1.6fr 76px 84px 100px 28px'
                        : '2.4fr 1.4fr 76px 84px 100px 28px',
                      gap: 6, alignItems: 'center',
                      padding: '8px 10px',
                      background: line.stockErr ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
                      border: `1.5px solid ${line.stockErr ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
                      borderRadius: 8,
                    }}>
                      {/* Item */}
                      <select value={line.item_id} onChange={e => updateLine(idx, 'item_id', e.target.value)}
                        style={{ fontSize: 12, width: '100%' }}>
                        <option value="">— Select Item —</option>
                        {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </select>

                      {/* Location */}
                      <select value={line.location_id} onChange={e => updateLine(idx, 'location_id', e.target.value)}
                        style={{ fontSize: 12, width: '100%' }}>
                        <option value="">— Location —</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>

                      {/* Purpose — only when OTHER */}
                      {watchType === 'OTHER' && (
                        <input
                          type="text"
                          placeholder="e.g. Office use, Donation…"
                          value={line.other_purpose}
                          onChange={e => updateLine(idx, 'other_purpose', e.target.value)}
                          style={{
                            fontSize: 12, width: '100%', padding: '6px 8px', borderRadius: 6,
                            border: `1.5px solid ${!line.other_purpose && line.item_id ? 'var(--amber)' : 'var(--border)'}`,
                            background: 'var(--bg)',
                          }}
                        />
                      )}

                      {/* Available stock */}
                      <div style={{
                        textAlign: 'center', fontSize: 11, fontWeight: 700,
                        padding: '5px 4px', borderRadius: 6,
                        background: line.checking ? 'rgba(100,100,100,0.07)'
                          : line.avail === null ? 'rgba(100,100,100,0.07)'
                          : parseFloat(line.avail) > 0 ? 'rgba(16,185,129,0.1)'
                          : 'rgba(220,38,38,0.1)',
                        color: line.checking ? 'var(--muted)'
                          : line.avail === null ? 'var(--muted)'
                          : parseFloat(line.avail) > 0 ? 'var(--green)'
                          : 'var(--red)',
                      }}>
                        {line.checking ? '…' : line.avail === null ? '—' : parseFloat(line.avail).toFixed(2)}
                      </div>

                      {/* Quantity */}
                      <input type="number" step="0.001" min="0.001" placeholder="0"
                        value={line.quantity}
                        onChange={e => updateLine(idx, 'quantity', e.target.value)}
                        style={{
                          fontSize: 12, textAlign: 'center', width: '100%',
                          padding: '6px 6px', borderRadius: 6,
                          border: `1.5px solid ${line.stockErr ? 'var(--red)' : 'var(--border)'}`,
                          background: 'var(--bg)',
                        }}
                      />

                      {/* Line total (FIFO weighted price) */}
                      <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: line.lineTotal > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {line.lineTotal > 0 ? fmtGHS(line.lineTotal) : '—'}
                        {line.unitPrice > 0 && (
                          <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--muted)' }}>
                            @{fmtGHS(line.unitPrice)}/u
                          </div>
                        )}
                      </div>

                      {/* Remove */}
                      <button type="button" onClick={() => removeLine(idx)} disabled={lines.length === 1}
                        title="Remove line"
                        style={{
                          width: 24, height: 24, borderRadius: 6, padding: 0,
                          border: '1px solid var(--border)',
                          background: lines.length > 1 ? 'rgba(220,38,38,0.08)' : 'transparent',
                          color: lines.length > 1 ? 'var(--red)' : 'var(--muted)',
                          cursor: lines.length > 1 ? 'pointer' : 'default',
                          fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>✕</button>
                    </div>

                    {/* FIFO batch breakdown */}
                    <FifoBadge line={line} />

                    {/* Per-line stock error */}
                    {line.stockErr && (
                      <div style={{ fontSize: 11, color: 'var(--red)', padding: '4px 10px 0' }}>
                        ⛔ Only {parseFloat(line.avail || 0).toFixed(2)} units available — reduce quantity.
                      </div>
                    )}
                  </div>
                ))}

                {/* Summary bar */}
                {readyLines.length > 0 && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 14px', marginTop: 4, borderRadius: 8,
                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                      📦 <strong style={{ color: 'var(--text)' }}>{readyLines.length}</strong> item{readyLines.length !== 1 ? 's' : ''} ready to issue
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--green)' }}>
                      Total: {fmtGHS(grandTotal)}
                    </span>
                  </div>
                )}

                {anyStockErr && (
                  <div className="excess-warn" style={{ marginTop: 8 }}>
                    ⛔ Fix stock errors above before issuing.
                  </div>
                )}
              </>
            )}

            {/* ── Buttons ── */}
            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-amber" disabled={saving || (!editRec && anyStockErr)}>
                {saving ? '⏳ Processing…'
                  : editRec ? '✓ Update Issue'
                  : readyLines.length > 0 ? `↗ Issue ${readyLines.length} Item${readyLines.length !== 1 ? 's' : ''}`
                  : '↗ Issue Item'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                {editRec ? 'Cancel Edit' : 'Clear'}
              </button>
            </div>

          </form>
        </div>

        {/* ══════════════════════ HISTORY ══════════════════════ */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span> Recent Issues</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Item</th><th>Type</th><th>Truck</th><th>Trip</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th style={{ textAlign: 'right' }}>Value (GH₵)</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No issues yet</td></tr>
                )}
                {history.map(rec => (
                  <tr key={rec.id} style={{ background: editRec?.id === rec.id ? 'rgba(245,158,11,0.06)' : undefined }}>
                    <td>{new Date(rec.issue_date).toLocaleDateString('en-GB')}</td>
                    <td style={{ fontWeight: 600 }}>{rec.item_name}</td>
                    <td>
                      <span className={`badge ${issueBadgeClass(rec.issue_type)}`}>
                        {rec.issue_type}
                      </span>
                    </td>
                    <td className="mono">{rec.truck_number || '—'}</td>
                    <td className="mono">{rec.trip_waybill || '—'}</td>
                    <td style={{ textAlign: 'right' }}>{rec.quantity}</td>
                    <td className="ced" style={{ textAlign: 'right' }}>{parseFloat(rec.final_amount).toFixed(2)}</td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(rec)} title="Edit date/remark">✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteIssue(rec.id)} title="Delete & reverse">🗑️</button>
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
