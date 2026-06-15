// src/pages/Trips.jsx – Two-phase trip workflow
// Phase 1: Create trip (loading details only)
// Phase 2: Edit trip → fill delivered qty + unloading time → auto-COMPLETED
import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useBranch, useCurrency } from '../App';
import api, { calcTrip } from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  PLANNED:   'b-gray',
  EN_ROUTE:  'b-blue',
  DELAYED:   'b-amber',
  COMPLETED: 'b-green',
  CANCELLED: 'b-red',
};

function calcDurationFromISO(start, end) {
  if (!start || !end) return '';
  const s = new Date(start), e = new Date(end);
  let mins = Math.round((e - s) / 60000);
  if (mins <= 0) return '';
  const h = Math.floor(mins / 60), m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── Edit / Complete Trip Modal ───────────────────────────────────────────────
function EditTripModal({ trip, trucks, drivers, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [computed, setComputed] = useState({ qty_difference: 0, trip_revenue: 0, duration: '' });

  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      truck:          trip.truck,
      driver:         trip.driver,
      waybill_no:     trip.waybill_no,
      status:         trip.status,
      origin:         trip.origin,
      destination:    trip.destination,
      material_type:  trip.material_type,
      loaded_qty:     trip.loaded_qty,
      delivered_qty:  trip.delivered_qty || '',
      loading_time:   trip.loading_time   ? trip.loading_time.slice(0,16)   : '',
      unloading_time: trip.unloading_time ? trip.unloading_time.slice(0,16) : '',
      rate_per_ton:   trip.rate_per_ton,
      remark:         trip.remark || '',
    }
  });

  const wLoaded     = watch('loaded_qty');
  const wDelivered  = watch('delivered_qty');
  const wRate       = watch('rate_per_ton');
  const wLoadTime   = watch('loading_time');
  const wUnloadTime = watch('unloading_time');

  useEffect(() => {
    const c = calcTrip(wLoaded, wDelivered, wRate);
    const d = calcDurationFromISO(wLoadTime, wUnloadTime);
    setComputed({ ...c, duration: d });
  }, [wLoaded, wDelivered, wRate, wLoadTime, wUnloadTime]);

  const autoStatus = parseFloat(wDelivered || 0) > 0 && !!wUnloadTime ? 'COMPLETED' : null;

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        loaded_qty:    parseFloat(data.loaded_qty    || 0),
        delivered_qty: data.delivered_qty ? parseFloat(data.delivered_qty) : null,
        rate_per_ton:  parseFloat(data.rate_per_ton  || 0),
        status:        autoStatus || data.status,
      };
      await api.patch(`/trips/${trip.id}/`, payload);
      toast.success(
        autoStatus === 'COMPLETED'
          ? '✅ Trip completed! Revenue posted to Finance.'
          : 'Trip updated.'
      );
      window.dispatchEvent(new CustomEvent('taurus:dashboard:refresh'));
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to update trip.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 16,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, width: '100%', maxWidth: 760,
        maxHeight: '90vh', overflowY: 'auto', padding: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            ✏️ Edit Trip — <span className="mono">{trip.waybill_no}</span>
          </div>
          <button className="btn btn-ghost btn-xs" onClick={onClose}>✕ Close</button>
        </div>

        {autoStatus === 'COMPLETED' && (
          <div style={{
            background: 'rgba(14,159,110,0.12)', border: '1px solid var(--green)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 14,
            color: 'var(--green)', fontWeight: 600, fontSize: 13,
          }}>
            ✅ Trip will be marked <strong>COMPLETED</strong> — Revenue will be auto-posted to Finance.
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="sec-div">Fleet Assignment</div>
          <div className="fgrid">
            <div className="fg">
              <label>Truck *</label>
              <select {...register('truck', { required: true })}>
                <option value="">— Select Truck —</option>
                {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>)}
              </select>
            </div>
            <div className="fg">
              <label>Driver *</label>
              <select {...register('driver', { required: true })}>
                <option value="">— Select Driver —</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id} disabled={!d.can_be_assigned}>
                    {d.name}{!d.can_be_assigned ? ' ⚠️ Expired' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="fg">
              <label>Waybill / LR No. *</label>
              <input type="text" {...register('waybill_no', { required: true })} />
            </div>
            <div className="fg">
              <label>Status</label>
              <div style={{
                padding: '8px 12px', borderRadius: 6, fontWeight: 700, fontSize: 13,
                background: autoStatus === 'COMPLETED' ? 'rgba(14,159,110,0.15)' : 'var(--surface)',
                color: autoStatus === 'COMPLETED' ? 'var(--green)' : 'var(--fg)',
                border: '1px solid var(--border)',
              }}>
                {autoStatus === 'COMPLETED' ? '✅ COMPLETED (auto)' : trip.status}
              </div>
            </div>
          </div>

          <div className="sec-div">Route & Material</div>
          <div className="fgrid">
            <div className="fg">
              <label>Origin *</label>
              <input type="text" {...register('origin', { required: true })} />
            </div>
            <div className="fg">
              <label>Destination *</label>
              <input type="text" {...register('destination', { required: true })} />
            </div>
            <div className="fg">
              <label>Material Type *</label>
              <input type="text" {...register('material_type', { required: true })} />
            </div>
          </div>

          <div className="sec-div">Quantity</div>
          <div className="fgrid">
            <div className="fg">
              <label>Loaded Qty (Tons) *</label>
              <input type="number" step="0.001" min="0" {...register('loaded_qty', { required: true })} />
            </div>
            <div className="fg">
              <label>
                Delivered Qty (Tons)
                <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 4, fontSize: 11 }}>← fill to complete</span>
              </label>
              <input type="number" step="0.001" min="0" placeholder="Fill when delivered" {...register('delivered_qty')} />
            </div>
            <div className="fg">
              <label>Qty Difference</label>
              <div className="calc-box" style={{
                color: computed.qty_difference > 0 ? 'var(--red)' : computed.qty_difference < 0 ? 'var(--amber)' : 'var(--green)'
              }}>
                {computed.qty_difference !== 0
                  ? `${computed.qty_difference > 0 ? '▼ Shortage' : '▲ Overage'}: ${Math.abs(computed.qty_difference).toFixed(3)}T`
                  : parseFloat(wDelivered || 0) > 0 ? '✓ Exact' : '—'}
              </div>
            </div>
          </div>

          <div className="sec-div">Timing</div>
          <div className="fgrid">
            <div className="fg">
              <label>Loading Time *</label>
              <input type="datetime-local" {...register('loading_time', { required: true })} />
            </div>
            <div className="fg">
              <label>
                Unloading Time
                <span style={{ color: 'var(--green)', fontWeight: 700, marginLeft: 4, fontSize: 11 }}>← fill to complete</span>
              </label>
              <input type="datetime-local" {...register('unloading_time')} />
            </div>
            <div className="fg">
              <label>Duration — Auto</label>
              <div className="calc-box">{computed.duration || '—'}</div>
            </div>
          </div>

          <div className="sec-div">Revenue</div>
          <div className="fgrid">
            <div className="fg">
              <label>Rate per Ton ({symbol})</label>
              <input type="number" step="0.01" min="0" {...register('rate_per_ton')} />
            </div>
            <div className="fg">
              <label>Trip Revenue — Auto</label>
              <div className="calc-box" style={{ fontSize: 15, color: 'var(--green)', fontWeight: 700 }}>
                {fmt(computed.trip_revenue)}
              </div>
            </div>
            <div className="fg">
              <label>Remark</label>
              <input type="text" {...register('remark')} />
            </div>
          </div>

          <div className="flex gap8 mt16">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? '⏳ Saving…' : autoStatus === 'COMPLETED' ? '✅ Complete Trip' : '✓ Update Trip'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function TripsPage() {
  const branchCtx = useBranch();
  const branchQS  = branchCtx?.branchQS || {};
  const { fmt, symbol } = useCurrency();
  const [trucks,   setTrucks]   = useState([]);
  const [drivers,  setDrivers]  = useState([]);
  const [trips,    setTrips]    = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [tab,      setTab]      = useState('active');
  const [editTrip, setEditTrip] = useState(null);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { rate_per_ton: '' }
  });

  const wTruck = watch('truck');

  const loadData = useCallback(() => {
    api.get('/trucks/?status=ACTIVE', { params: branchQS }).then(r  => setTrucks(r.data.results  || r.data));
    api.get('/drivers/?status=ACTIVE', { params: branchQS }).then(r => setDrivers(r.data.results || r.data));
    api.get('/trips/', { params: branchQS }).then(r => setTrips(r.data.results || r.data));
  }, []);

  useEffect(() => { loadData(); }, [loadData, branchCtx?.activeBranchId]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await api.post('/trips/', {
        ...data,
        loaded_qty:    parseFloat(data.loaded_qty || 0),
        delivered_qty: null,
        rate_per_ton:  parseFloat(data.rate_per_ton || 0),
        status:        'PLANNED',
      });
      toast.success('Trip created — click ✏️ Edit to complete it after delivery.');
      reset({ rate_per_ton: '' });
      loadData();
      window.dispatchEvent(new CustomEvent('taurus:dashboard:refresh'));
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  };

  const deleteTrip = async (id) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await api.delete(`/trips/${id}/`);
      toast.success('Trip deleted.');
      setTrips(prev => prev.filter(t => t.id !== id));
      window.dispatchEvent(new CustomEvent('taurus:dashboard:refresh'));
    } catch (e) {
      const errData = e.response?.data; const msg = errData?.detail || errData?.error || JSON.stringify(errData) || 'Cannot delete this trip.';
      toast.error(msg);
    }
  };

  const activeTrips    = trips.filter(t => ['PLANNED','EN_ROUTE','DELAYED'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const displayTrips   = tab === 'active' ? activeTrips : tab === 'completed' ? completedTrips : trips;

  const totalRevenue  = trips.reduce((s,t) => s + parseFloat(t.trip_revenue||0), 0);
  const totalFuelCost = trips.reduce((s,t) => s + parseFloat(t.fuel_cost||0), 0);
  const totalSpare    = trips.reduce((s,t) => s + parseFloat(t.spare_parts_cost||0), 0);
  const totalNet      = totalRevenue - totalFuelCost - totalSpare;

  return (
    <div>
      {editTrip && (
        <EditTripModal
          trip={editTrip}
          trucks={trucks}
          drivers={drivers}
          onClose={() => setEditTrip(null)}
          onSaved={() => { setEditTrip(null); loadData(); }}
        />
      )}

      {/* KPIs */}
      <div className="g2 mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Active Trips',  val: activeTrips.length,    color: 'var(--blue)'  },
          { label: 'Completed',     val: completedTrips.length, color: 'var(--green)' },
          { label: 'Total Revenue', val: fmt(totalRevenue),  color: 'var(--amber)' },
          { label: 'Net Profit',    val: fmt(totalNet),      color: totalNet >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 18 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* ── Create Trip (Phase 1) ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">🗺️</span>New Trip Entry</div>

          <div style={{
            background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: 8, padding: '9px 13px', marginBottom: 14, fontSize: 12, color: 'var(--blue)',
          }}>
            <strong>Step 1:</strong> Fill loading details &amp; create.&nbsp;&nbsp;
            <strong>Step 2:</strong> After delivery, click <strong>✏️</strong> to add delivered qty + unloading time → status auto-sets to <strong>COMPLETED</strong>.
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="sec-div">Fleet Assignment</div>
            <div className="fgrid">
              <div className="fg">
                <label>Truck *</label>
                <select {...register('truck', { required: true })}>
                  <option value="">— Select Truck —</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>)}
                </select>
                {wTruck && (() => {
                  const tk = trucks.find(t => String(t.id) === String(wTruck));
                  return tk ? (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>
                      ✓ {tk.truck_number} · {tk.model} · {tk.status}
                    </div>
                  ) : null;
                })()}
              </div>
              <div className="fg">
                <label>Driver *</label>
                <select {...register('driver', { required: true })}>
                  <option value="">— Select Driver —</option>
                  {drivers.map(d => (
                    <option key={d.id} value={d.id} disabled={!d.can_be_assigned}>
                      {d.name}{!d.can_be_assigned ? ' ⚠️ Expired' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Waybill / LR No. *</label>
                <input type="text" placeholder="WB-2026-XXXX" {...register('waybill_no', { required: true })} />
              </div>
            </div>

            <div className="sec-div">Route & Material</div>
            <div className="fgrid">
              <div className="fg">
                <label>Origin *</label>
                <input type="text" placeholder="e.g. Accra" {...register('origin', { required: true })} />
              </div>
              <div className="fg">
                <label>Destination *</label>
                <input type="text" placeholder="e.g. Kumasi" {...register('destination', { required: true })} />
              </div>
              <div className="fg">
                <label>Material Type *</label>
                <input type="text" placeholder="e.g. Aggregate, Sand…" {...register('material_type', { required: true })} />
              </div>
            </div>

            <div className="sec-div">Loading Details</div>
            <div className="fgrid">
              <div className="fg">
                <label>Loaded Qty (Tons) *</label>
                <input type="number" step="0.001" min="0" placeholder="0.000"
                       {...register('loaded_qty', { required: true })} />
              </div>
              <div className="fg">
                <label>Loading Time *</label>
                <input type="datetime-local" {...register('loading_time', { required: true })} />
              </div>
              <div className="fg">
                <label>Rate per Ton ({symbol})</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" {...register('rate_per_ton')} />
              </div>
              <div className="fg">
                <label>Remark</label>
                <input type="text" placeholder="Optional note" {...register('remark')} />
              </div>
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : '🚛 Create Trip'}
              </button>
              <button type="button" className="btn btn-ghost"
                      onClick={() => reset({ rate_per_ton: '' })}>
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* ── Trip List ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span>Trips</div>
          <div className="tabs">
            {[
              { key: 'active',    label: `Active (${activeTrips.length})` },
              { key: 'completed', label: `Completed (${completedTrips.length})` },
              { key: 'all',       label: `All (${trips.length})` },
            ].map(t => (
              <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`}
                   onClick={() => setTab(t.key)}>
                {t.label}
              </div>
            ))}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waybill</th><th>Truck</th><th>Driver</th><th>Route</th>
                  <th>Loaded</th><th>Delivered</th><th>Revenue</th>
                  <th>Fuel Cost</th><th>Spare Parts</th><th>Net Profit</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayTrips.map(t => {
                  const net = parseFloat(t.trip_revenue||0) - parseFloat(t.fuel_cost||0) - parseFloat(t.spare_parts_cost||0);
                  const needsCompletion = ['PLANNED','EN_ROUTE','DELAYED'].includes(t.status);
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.waybill_no}</td>
                      <td className="mono">{t.truck_number}</td>
                      <td>{t.driver_name}</td>
                      <td style={{ fontSize: 11 }}>{t.origin} → {t.destination}</td>
                      <td>{t.loaded_qty}T</td>
                      <td style={{
                        color: t.delivered_qty ? 'inherit' : 'var(--muted)',
                        fontStyle: t.delivered_qty ? 'normal' : 'italic',
                      }}>
                        {t.delivered_qty ? `${t.delivered_qty}T` : 'Pending'}
                      </td>
                      <td className="ced">{fmt(t.trip_revenue)}</td>
                      <td className="ced" style={{ color: 'var(--amber)' }}>{fmt(t.fuel_cost)}</td>
                      <td className="ced" style={{ color: 'var(--amber)' }}>{fmt(t.spare_parts_cost)}</td>
                      <td className="ced" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {fmt(net)}
                      </td>
                      <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                      <td>
                        <div className="flex gap4">
                          <button
                            className="btn btn-ghost btn-xs"
                            title={needsCompletion ? 'Edit / Complete Trip' : 'View / Edit Trip'}
                            onClick={() => setEditTrip(t)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-xs"
                            title="Delete trip"
                            onClick={() => deleteTrip(t.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayTrips.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                      {tab === 'active' ? 'No active trips — create one on the left.' : 'No trips found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Completed trips totals */}
          {tab === 'completed' && completedTrips.length > 0 && (
            <div style={{
              padding: '12px 16px', borderTop: '1px solid var(--border)',
              display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8,
            }}>
              {[
                { label: 'Total Revenue',     val: fmt(completedTrips.reduce((s,t)=>s+parseFloat(t.trip_revenue||0),0)),     color: 'var(--green)' },
                { label: 'Total Fuel Cost',   val: fmt(completedTrips.reduce((s,t)=>s+parseFloat(t.fuel_cost||0),0)),        color: 'var(--amber)' },
                { label: 'Total Spare Parts', val: fmt(completedTrips.reduce((s,t)=>s+parseFloat(t.spare_parts_cost||0),0)), color: 'var(--amber)' },
                { label: 'Total Net Profit',  val: fmt(completedTrips.reduce((s,t)=>s+parseFloat(t.trip_revenue||0)-parseFloat(t.fuel_cost||0)-parseFloat(t.spare_parts_cost||0),0)), color: 'var(--blue)' },
              ].map((k,i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.val}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{
            padding: '10px 14px', borderTop: '1px solid var(--border)',
            fontSize: 11, color: 'var(--muted)', marginTop: 4,
          }}>
            💡 Fuel &amp; spare parts costs auto-populate from logs linked to each trip.
            Revenue &amp; expenditure auto-post to Finance on <strong>COMPLETED</strong>.
          </div>
        </div>
      </div>
    </div>
  );
}
