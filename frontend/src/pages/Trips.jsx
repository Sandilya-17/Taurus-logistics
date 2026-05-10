// src/pages/Trips.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { calcTrip, calcDuration, fmtGHS } from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = {
  PLANNED:   'b-gray',
  EN_ROUTE:  'b-navy',
  DELAYED:   'b-amber',
  COMPLETED: 'b-green',
  CANCELLED: 'b-red',
};

// datetime-local input expects "YYYY-MM-DDTHH:MM"
const toDatetimeLocal = (val) => {
  if (!val) return '';
  return val.slice(0, 16);
};

// Fetch ALL pages from a paginated DRF endpoint
const fetchAllPages = async (url) => {
  let results = [];
  let nextUrl = url;
  while (nextUrl) {
    const res  = await api.get(nextUrl);
    const data = res.data;
    if (Array.isArray(data)) {
      results = data;
      break;
    }
    results = results.concat(data.results || []);
    // Strip base URL from next link so axios uses relative path correctly
    nextUrl = data.next
      ? data.next.replace(/^https?:\/\/[^/]+\/api/, '')
      : null;
  }
  return results;
};

export default function TripsPage() {
  const [trucks,      setTrucks]      = useState([]);
  const [drivers,     setDrivers]     = useState([]);
  const [trips,       setTrips]       = useState([]);
  const [computed,    setComputed]    = useState({ qty_difference: 0, trip_revenue: 0, duration: null });
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [tab,         setTab]         = useState('all');
  const [editingTrip, setEditingTrip] = useState(null);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { status: 'PLANNED', rate_per_ton: '' }
  });

  const wLoaded     = watch('loaded_qty');
  const wDelivered  = watch('delivered_qty');
  const wRate       = watch('rate_per_ton');
  const wLoadTime   = watch('loading_time');
  const wUnloadTime = watch('unloading_time');

  useEffect(() => {
    fetchAllPages('/trucks/?status=ACTIVE').then(setTrucks);
    fetchAllPages('/drivers/?status=ACTIVE').then(setDrivers);
    loadTrips();
  }, []);

  // Live auto-calculations
  useEffect(() => {
    const c = calcTrip(wLoaded, wDelivered, wRate);
    const d = calcDuration(wLoadTime, wUnloadTime);
    setComputed({ ...c, duration: d });
  }, [wLoaded, wDelivered, wRate, wLoadTime, wUnloadTime]);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const all = await fetchAllPages('/trips/');
      setTrips(all);
    } catch {
      toast.error('Failed to load trips.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEditingTrip(null);
    reset({ status: 'PLANNED', rate_per_ton: '' });
    setComputed({ qty_difference: 0, trip_revenue: 0, duration: null });
  };

  const startEdit = (trip) => {
    setEditingTrip(trip);
    reset({
      truck:          trip.truck,
      driver:         trip.driver,
      waybill_no:     trip.waybill_no,
      status:         trip.status,
      origin:         trip.origin,
      destination:    trip.destination,
      material_type:  trip.material_type,
      loaded_qty:     trip.loaded_qty,
      delivered_qty:  trip.delivered_qty  ?? '',
      rate_per_ton:   trip.rate_per_ton   ?? '',
      loading_time:   toDatetimeLocal(trip.loading_time),
      unloading_time: toDatetimeLocal(trip.unloading_time),
      remark:         trip.remark ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTrip = async (id) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await api.delete(`/trips/${id}/`);
      toast.success('Trip deleted.');
      if (editingTrip?.id === id) clearForm();
      loadTrips();
    } catch {
      toast.error('Cannot delete this trip.');
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    const payload = {
      ...data,
      loaded_qty:    parseFloat(data.loaded_qty || 0),
      delivered_qty: data.delivered_qty ? parseFloat(data.delivered_qty) : null,
      rate_per_ton:  parseFloat(data.rate_per_ton || 0),
    };
    try {
      if (editingTrip) {
        await api.patch(`/trips/${editingTrip.id}/`, payload);
        toast.success('Trip updated successfully.');
      } else {
        await api.post('/trips/', payload);
        toast.success('Trip posted successfully.');
      }
      const savedStatus = data.status;
      clearForm();
      if (['PLANNED','EN_ROUTE','DELAYED'].includes(savedStatus)) setTab('active');
      else if (savedStatus === 'COMPLETED') setTab('completed');
      else setTab('all');
      loadTrips();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  };

  const activeTrips    = trips.filter(t => ['PLANNED', 'EN_ROUTE', 'DELAYED'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const allTrips       = trips;
  const visibleTrips   = tab === 'active' ? activeTrips : tab === 'completed' ? completedTrips : allTrips;

  const isEditing = !!editingTrip;

  return (
    <div>
      {/* ── KPI Row ── */}
      <div className="g2 mb16">
        {[
          { label: 'Active Trips',  val: activeTrips.length,    color: 'var(--blue)'  },
          { label: 'Completed',     val: completedTrips.length, color: 'var(--green)' },
          { label: 'Total Revenue', val: fmtGHS(trips.reduce((s, t) => s + parseFloat(t.trip_revenue || 0), 0)), color: 'var(--amber)' },
          { label: 'Delayed',       val: trips.filter(t => t.status === 'DELAYED').length, color: 'var(--red)' },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 20 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* ── Trip Form (New / Edit) ── */}
        <div className="card" style={{ borderTop: isEditing ? '3px solid var(--amber)' : undefined }}>
          <div className="card-title">
            <span className="card-title-ic">{isEditing ? '✏️' : '🗺️'}</span>
            {isEditing ? `Editing Trip — ${editingTrip.waybill_no}` : 'New Trip Entry'}
          </div>

          {isEditing && (
            <div style={{
              background: '#fff8e1',
              border: '1px solid var(--amber)',
              borderRadius: 6,
              padding: '8px 12px',
              marginBottom: 12,
              fontSize: 13,
              color: '#7a5c00',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              ⚠️ Editing existing trip. Click <strong>&nbsp;Update Trip&nbsp;</strong> to save or <strong>&nbsp;Cancel&nbsp;</strong> to discard.
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
                <input type="text" placeholder="WB-2026-XXXX" {...register('waybill_no', { required: true })} />
              </div>
              <div className="fg">
                <label>Status *</label>
                <select {...register('status')}>
                  <option value="PLANNED">PLANNED</option>
                  <option value="EN_ROUTE">EN ROUTE</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
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

            <div className="sec-div">Quantity — Auto-Calculated</div>
            <div className="fgrid">
              <div className="fg">
                <label>Loaded Qty (Tons) *</label>
                <input type="number" step="0.001" min="0" placeholder="0.000"
                       {...register('loaded_qty', { required: true })} />
              </div>
              <div className="fg">
                <label>Delivered Qty (Tons)</label>
                <input type="number" step="0.001" min="0" placeholder="0.000"
                       {...register('delivered_qty')} />
              </div>
              <div className="fg">
                <label>Qty Difference — Auto</label>
                <div className="calc-box" style={{
                  color: computed.qty_difference > 0 ? 'var(--red)' : computed.qty_difference < 0 ? 'var(--amber)' : 'var(--green)'
                }}>
                  {computed.qty_difference !== 0
                    ? `${computed.qty_difference > 0 ? '▼ Shortage' : '▲ Overage'}: ${Math.abs(computed.qty_difference).toFixed(3)}T`
                    : computed.qty_difference === 0 && parseFloat(wDelivered || 0) > 0
                      ? '✓ Exact'
                      : '—'}
                </div>
              </div>
            </div>

            <div className="sec-div">Timing — Duration Auto-Calculated</div>
            <div className="fgrid">
              <div className="fg">
                <label>Loading Time *</label>
                <input type="datetime-local" {...register('loading_time', { required: true })} />
              </div>
              <div className="fg">
                <label>Unloading Time</label>
                <input type="datetime-local" {...register('unloading_time')} />
              </div>
              <div className="fg">
                <label>Trip Duration — Auto</label>
                <div className="calc-box">{computed.duration || '—'}</div>
              </div>
            </div>

            <div className="sec-div">Revenue — Auto-Calculated</div>
            <div className="fgrid">
              <div className="fg">
                <label>Rate per Ton (GH₵)</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" {...register('rate_per_ton')} />
              </div>
              <div className="fg">
                <label>Trip Revenue — Auto</label>
                <div className="calc-box" style={{ fontSize: 15 }}>{fmtGHS(computed.trip_revenue)}</div>
              </div>
              <div className="fg">
                <label>Remark</label>
                <input type="text" placeholder="Optional note" {...register('remark')} />
              </div>
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : isEditing ? '✓ Update Trip' : '✓ Post Trip'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={clearForm}>
                {isEditing ? 'Cancel' : 'Clear'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Trip List ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span>Trips</div>
          <div className="tabs">
            {[
              { key: 'active',    label: `Active (${activeTrips.length})`    },
              { key: 'completed', label: `Completed (${completedTrips.length})` },
              { key: 'all',       label: `All (${allTrips.length})`          },
            ].map(t => (
              <div key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--muted)' }}>⏳ Loading trips…</div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Waybill</th>
                    <th>Truck</th>
                    <th>Driver</th>
                    <th>Route</th>
                    <th>Material</th>
                    <th>Loaded</th>
                    <th>Revenue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTrips.map(t => (
                    <tr key={t.id} style={editingTrip?.id === t.id ? { background: '#fff8e1' } : undefined}>
                      <td className="mono">{t.waybill_no}</td>
                      <td className="mono">{t.truck_number}</td>
                      <td>{t.driver_name}</td>
                      <td style={{ fontSize: 11 }}>{t.origin} → {t.destination}</td>
                      <td>{t.material_type}</td>
                      <td>{t.loaded_qty}T</td>
                      <td className="ced">{fmtGHS(t.trip_revenue)}</td>
                      <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                      <td>
                        <div className="flex gap8">
                          <button
                            className="btn btn-xs"
                            style={{ background: 'var(--amber)', color: '#fff' }}
                            onClick={() => startEdit(t)}
                            title="Edit trip"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-xs"
                            onClick={() => deleteTrip(t.id)}
                            title="Delete trip"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {visibleTrips.length === 0 && (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                        No trips found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
