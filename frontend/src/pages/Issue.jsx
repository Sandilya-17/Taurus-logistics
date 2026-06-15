// src/pages/Issue.jsx – Multi-item issue with FIFO costing & truck/trip linkage
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useBranch, useCurrency } from '../App';
import api from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

const OTHER_ITEM = '__OTHER__';

const newLine = () => ({
  _key:            Math.random().toString(36).slice(2),
  item_id:         '',
  location_id:     '',
  quantity:        '',
  other_item_name: '',   // typed when item_id === OTHER_ITEM
  avail:           null,
  fifoBatches:     [],
  unitPrice:       0,
  lineTotal:       0,
  stockErr:        false,
  checking:        false,
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
  const branchCtx = useBranch();
  const branchQS  = branchCtx?.branchQS || {};
  const { fmt, symbol } = useCurrency();
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

  useEffect(() => { loadData(); }, [loadData, branchCtx?.activeBranchId]);

  const loadData = useCallback(() => {
    api.get('/inventory/items/?page_size=500', { params: branchQS }).then(r  => setItems(r.data.results    || r.data));
    api.get('/inventory/locations/').then(r            => setLocations(r.data.results || r.data));
    api.get('/trucks/?status=ACTIVE', { params: branchQS }).then(r           => setTrucks(r.data.results   || r.data));
    api.get('/trips/?status=EN_ROUTE', { params: branchQS }).then(r          => setTrips(r.data.results    || r.data));
    api.get('/inventory/issues/?page_size=200', { params: branchQS }).then(r => setHistory(r.data.results  || r.data));
  }, [branchCtx?.activeBranchId]);


  const truckTrips = watchTruck
    ? trips.filter(t => String(t.truck) === String(watchTruck))
    : trips;

  /** Fetch FIFO batch breakdown; skip for OTHER items (no ledger) */
  const checkStock = async (idx, itemId, locationId) => {
    if (!itemId || !locationId || itemId === OTHER_ITEM) {
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
        const lineQty = parseFloat(l.quantity) || 0;
        const up      = fifoPrice(batches, Math.min(lineQty, avail));
        return { ...l, avail, fifoBatches: batches, unitPrice: up, lineTotal: lineQty * up, stockErr: lineQty > avail, checking: false };
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
        if (line.item_id === OTHER_ITEM) {
          // OTHER items: no stock check, no FIFO price
          next[idx] = { ...line, lineTotal: 0, stockErr: false };
        } else {
          const up = fifoPrice(line.fifoBatches, Math.min(qty, line.avail || 0));
          next[idx] = { ...line, unitPrice: up, lineTotal: qty * up, stockErr: line.avail !== null && qty > line.avail };
        }
        return next;
      }
      if (field === 'item_id') {
        // Reset stock info when item changes
        next[idx] = { ...next[idx], avail: null, fifoBatches: [], unitPrice: 0, lineTotal: 0, stockErr: false };
        if (value !== OTHER_ITEM) {
          setTimeout(() => checkStock(idx, value, next[idx].location_id), 0);
        }
      }
      if (field === 'location_id') {
        if (next[idx].item_id && next[idx].item_id !== OTHER_ITEM) {
          setTimeout(() => checkStock(idx, next[idx].item_id, value), 0);
        }
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
    const valid = lines.filter(l => {
      if (l.item_id === OTHER_ITEM) return l.other_item_name?.trim() && l.location_id && parseFloat(l.quantity) > 0;
      return l.item_id && l.location_id && parseFloat(l.quantity) > 0;
    });
    if (!valid.length) { toast.error('Fill in at least one complete item row.'); return; }
    if (valid.some(l => l.item_id !== OTHER_ITEM && l.stockErr)) { toast.error('Fix stock errors before issuing.'); return; }

    setSaving(true);
    try {
      // Split lines: regular items go to API; OTHER items have no stock record and cannot be issued
      const regularLines = valid.filter(l => l.item_id !== OTHER_ITEM);
      const otherLines   = valid.filter(l => l.item_id === OTHER_ITEM);

      if (regularLines.length === 0 && otherLines.length > 0) {
        toast.error('OTHER items have no inventory record and cannot be issued from stock. Please select a specific item.');
        setSaving(false);
        return;
      }

      const results = await Promise.allSettled(regularLines.map(line => {
        const payload = {
          item_id:     line.item_id,
          location_id: line.location_id,
          quantity:    parseFloat(line.quantity),
          issue_type:  data.issue_type,
          truck_id:    data.truck_id || null,
          trip_id:     data.trip_id  || null,
          issue_date:  data.issue_date,
          remark:      data.remark || '',
        };
        return api.post('/inventory/issues/', payload);
      }));

      const failures  = results.filter(r => r.status === 'rejected');
      const successes = results.filter(r => r.status === 'fulfilled');

      if (successes.length > 0) {
        const otherMsg = otherLines.length > 0 ? ` (${otherLines.length} OTHER item(s) skipped – no stock record)` : '';
        toast.success(`✅ ${successes.length} item${successes.length !== 1 ? 's' : ''} issued successfully.${data.trip_id ? ' Trip cost updated.' : ''}${otherMsg}`);
        reset({ issue_date: '', issue_type: 'TRUCK', truck_id: '', trip_id: '', remark: '' });
        setLines([newLine()]);
        loadData();
      }
      if (failures.length > 0) {
        const errMsg = failures[0].reason?.response?.data?.error || failures[0].reason?.message || 'Failed to record issue.';
        toast.error(`❌ ${failures.length} item(s) failed: ${errMsg}`);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || e.message || 'Failed to record issue.');
    }
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
  const anyStockErr = lines.some(l => l.item_id !== OTHER_ITEM && l.stockErr);
  const readyLines  = lines.filter(l => {
    if (l.item_id === OTHER_ITEM) return l.other_item_name?.trim() && l.location_id && parseFloat(l.quantity) > 0;
    return l.item_id && l.location_id && parseFloat(l.quantity) > 0;
  });

  /** FIFO badge below each normal item row */
  const FifoBadge = ({ line }) => {
    if (line.item_id === OTHER_ITEM || !line.fifoBatches?.length || !parseFloat(line.quantity)) return null;
    const qty = parseFloat(line.quantity) || 0;
    let need = qty;
    const consumed = [];
    for (const b of line.fifoBatches) {
      if (need <= 0) break;
      const take = Math.min(b.remaining, need);
      consumed.push({ take, unit_price: b.unit_price });
      need -= take;
    }
    if (!consumed.length) return null;
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
            {c.take.toFixed(3)} × {fmt(c.unit_price)}
            {i === 0 ? ' (old stock)' : ' (new stock)'}
          </span>
        ))}
        {need > 0 && <span style={{ color: 'var(--red)', fontWeight: 700 }}>⛔ {need.toFixed(3)} units short</span>}
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
                  <div className="fg" style={{ gridColumn: 'span 2' }}>
                    <label>Issue Type *</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
                      {['TRUCK','WORKSHOP','BREAKDOWN','OTHER'].map(t => (
                        <label key={t} style={{
                          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                          padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                          border: `2px solid ${watchType === t
                            ? t === 'TRUCK' ? 'var(--primary)'
                            : t === 'WORKSHOP' ? 'var(--amber)'
                            : t === 'BREAKDOWN' ? 'var(--red)'
                            : '#8b5cf6'
                            : 'var(--border)'}`,
                          background: watchType === t
                            ? t === 'TRUCK' ? 'rgba(59,130,246,0.12)'
                            : t === 'WORKSHOP' ? 'rgba(245,158,11,0.12)'
                            : t === 'BREAKDOWN' ? 'rgba(220,38,38,0.12)'
                            : 'rgba(139,92,246,0.12)'
                            : 'var(--surface)',
                          color: watchType === t
                            ? t === 'TRUCK' ? 'var(--primary)'
                            : t === 'WORKSHOP' ? 'var(--amber)'
                            : t === 'BREAKDOWN' ? 'var(--red)'
                            : '#8b5cf6'
                            : 'var(--muted)',
                        }}>
                          <input type="radio" value={t} {...register('issue_type')} style={{ display: 'none' }} />
                          {t === 'TRUCK' ? '🚛' : t === 'WORKSHOP' ? '🔧' : t === 'BREAKDOWN' ? '⚠️' : '📋'} {t}
                        </label>
                      ))}
                    </div>
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
                <input type="text" placeholder="e.g. Routine maintenance, breakdown repair…" {...register('remark')} />
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
                  display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 76px 84px 100px 28px',
                  gap: 6, padding: '0 4px 6px',
                  fontSize: 10, fontWeight: 700, color: 'var(--muted)',
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  borderBottom: '1px solid var(--border)', marginBottom: 8,
                }}>
                  <span>Item *</span>
                  <span>Location *</span>
                  <span style={{ textAlign: 'center' }}>In Stock</span>
                  <span style={{ textAlign: 'center' }}>Qty *</span>
                  <span style={{ textAlign: 'right' }}>Line Value</span>
                  <span></span>
                </div>

                {/* Item Rows */}
                {lines.map((line, idx) => (
                  <div key={line._key} style={{ marginBottom: 10 }}>
                    <div style={{
                      display: 'grid', gridTemplateColumns: '2.4fr 1.4fr 76px 84px 100px 28px',
                      gap: 6, alignItems: 'center',
                      padding: '8px 10px',
                      background: line.stockErr ? 'rgba(220,38,38,0.04)' : 'var(--surface)',
                      border: `1.5px solid ${line.stockErr ? 'rgba(220,38,38,0.4)' : 'var(--border)'}`,
                      borderRadius: 8,
                    }}>

                      {/* Item dropdown — with OTHER at bottom */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <select
                          value={line.item_id}
                          onChange={e => updateLine(idx, 'item_id', e.target.value)}
                          style={{ fontSize: 12, width: '100%' }}
                        >
                          <option value="">— Select Item —</option>
                          {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                          <option disabled>──────────────</option>
                          <option value={OTHER_ITEM}>📋 Other (specify below)</option>
                        </select>

                        {/* Text box appears below dropdown when OTHER is selected */}
                        {line.item_id === OTHER_ITEM && (
                          <input
                            type="text"
                            placeholder="Type item name…"
                            value={line.other_item_name}
                            onChange={e => updateLine(idx, 'other_item_name', e.target.value)}
                            autoFocus
                            style={{
                              fontSize: 12, padding: '6px 8px', borderRadius: 6, width: '100%',
                              border: '1.5px solid #8b5cf6',
                              background: 'rgba(139,92,246,0.07)',
                              color: 'var(--text)',
                            }}
                          />
                        )}
                      </div>

                      {/* Location */}
                      <select value={line.location_id} onChange={e => updateLine(idx, 'location_id', e.target.value)}
                        style={{ fontSize: 12, width: '100%' }}>
                        <option value="">— Location —</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>

                      {/* Available stock */}
                      <div style={{
                        textAlign: 'center', fontSize: 11, fontWeight: 700,
                        padding: '5px 4px', borderRadius: 6,
                        background: line.item_id === OTHER_ITEM ? 'rgba(139,92,246,0.08)'
                          : line.checking ? 'rgba(100,100,100,0.07)'
                          : line.avail === null ? 'rgba(100,100,100,0.07)'
                          : parseFloat(line.avail) > 0 ? 'rgba(16,185,129,0.1)'
                          : 'rgba(220,38,38,0.1)',
                        color: line.item_id === OTHER_ITEM ? '#8b5cf6'
                          : line.checking ? 'var(--muted)'
                          : line.avail === null ? 'var(--muted)'
                          : parseFloat(line.avail) > 0 ? 'var(--green)'
                          : 'var(--red)',
                      }}>
                        {line.item_id === OTHER_ITEM ? 'N/A'
                          : line.checking ? '…'
                          : line.avail === null ? '—'
                          : parseFloat(line.avail).toFixed(2)}
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

                      {/* Line total */}
                      <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: line.lineTotal > 0 ? 'var(--text)' : 'var(--muted)' }}>
                        {line.item_id === OTHER_ITEM
                          ? <span style={{ color: '#8b5cf6', fontSize: 10 }}>no ledger</span>
                          : line.lineTotal > 0 ? fmt(line.lineTotal) : '—'}
                        {line.unitPrice > 0 && line.item_id !== OTHER_ITEM && (
                          <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--muted)' }}>
                            @{fmt(line.unitPrice)}/u
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
                      Total: {fmt(grandTotal)}
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
                  <th style={{ textAlign: 'right' }}>Value ({symbol})</th>
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
