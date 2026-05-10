// src/pages/Trips.jsx – Trips with fuel cost, spare parts cost, net profit display
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

export default function TripsPage() {
  const [trucks,  setTrucks]  = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [trips,   setTrips]   = useState([]);
  const [computed, setComputed] = useState({ qty_difference: 0, trip_revenue: 0, duration: null });
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState('all');
  const [selectedTrip, setSelectedTrip] = useState(null);

  const { register, handleSubmit, watch, reset } = useForm({
    defaultValues: { status: 'PLANNED', rate_per_ton: '' }
  });

  const wLoaded    = watch('loaded_qty');
  const wDelivered = watch('delivered_qty');
  const wRate      = watch('rate_per_ton');
  const wLoadTime  = watch('loading_time');
  const wUnloadTime = watch('unloading_time');
  const wTruck    = watch('truck');

  useEffect(() => {
    api.get('/trucks/?status=ACTIVE').then(r  => setTrucks(r.data.results  || r.data));
    api.get('/drivers/?status=ACTIVE').then(r => setDrivers(r.data.results || r.data));
    loadTrips();
  }, []);

  useEffect(() => {
    const c = calcTrip(wLoaded, wDelivered, wRate);
    const d = calcDuration(wLoadTime, wUnloadTime);
    setComputed({ ...c, duration: d });
  }, [wLoaded, wDelivered, wRate, wLoadTime, wUnloadTime]);

  const loadTrips = () => {
    api.get('/trips/').then(r => setTrips(r.data.results || r.data));
  };

  const deleteTrip = async (id) => {
    if (!window.confirm('Delete this trip? This cannot be undone.')) return;
    try {
      await api.delete(`/trips/${id}/`);
      toast.success('Trip deleted.');
      loadTrips();
      // Signal dashboard to refresh on next visit
      sessionStorage.setItem('dashboard_refresh', Date.now());
    } catch { toast.error('Cannot delete this trip.'); }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await api.post('/trips/', {
        ...data,
        loaded_qty:    parseFloat(data.loaded_qty || 0),
        delivered_qty: data.delivered_qty ? parseFloat(data.delivered_qty) : null,
        rate_per_ton:  parseFloat(data.rate_per_ton || 0),
      });
      toast.success('Trip posted successfully.');
      reset({ status: 'PLANNED' });
      setComputed({ qty_difference: 0, trip_revenue: 0, duration: null });
      loadTrips();
      sessionStorage.setItem('dashboard_refresh', Date.now());
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save trip.');
    } finally {
      setSaving(false);
    }
  };

  const activeTrips    = trips.filter(t => ['EN_ROUTE','DELAYED'].includes(t.status));
  const completedTrips = trips.filter(t => t.status === 'COMPLETED');
  const allTrips       = trips;

  const displayTrips = tab === 'active' ? activeTrips : tab === 'completed' ? completedTrips : allTrips;

  const totalRevenue   = trips.reduce((s,t) => s + parseFloat(t.trip_revenue||0), 0);
  const totalFuelCost  = trips.reduce((s,t) => s + parseFloat(t.fuel_cost||0), 0);
  const totalSpare     = trips.reduce((s,t) => s + parseFloat(t.spare_parts_cost||0), 0);
  const totalNet       = totalRevenue - totalFuelCost - totalSpare;

  return (
    <div>
      {/* KPIs */}
      <div className="g2 mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Active Trips',    val: activeTrips.length,    color: 'var(--blue)'  },
          { label: 'Completed',       val: completedTrips.length, color: 'var(--green)' },
          { label: 'Total Revenue',   val: fmtGHS(totalRevenue),  color: 'var(--amber)' },
          { label: 'Net Profit',      val: fmtGHS(totalNet),      color: totalNet >= 0 ? 'var(--green)' : 'var(--red)' },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 18 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="g2">
        {/* ── New Trip Form ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">🗺️</span>New Trip Entry</div>
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
                      ✓ {tk.truck_number} · {tk.model} · Status: {tk.status}
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
              <div className="fg">
                <label>Status *</label>
                <select {...register('status')}>
                  <option value="PLANNED">PLANNED</option>
                  <option value="EN_ROUTE">EN ROUTE</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="COMPLETED">COMPLETED</option>
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
                    : computed.qty_difference === 0 && parseFloat(wDelivered||0) > 0
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

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--muted)', marginTop: 10 }}>
              💡 Fuel cost and spare parts cost are auto-calculated from fuel logs and spare part issues linked to this trip.
              Revenue and expenditures are auto-posted to Finance when trip is marked <strong>COMPLETED</strong>.
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : '✓ Post Trip'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => { reset({ status: 'PLANNED' }); setComputed({ qty_difference: 0, trip_revenue: 0, duration: null }); }}>
                Clear
              </button>
            </div>
          </form>
        </div>

        {/* ── Trip List ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span>Trips</div>
          <div className="tabs">
            {['active','completed','all'].map(t => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </div>
            ))}
          </div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Waybill</th><th>Truck</th><th>Driver</th><th>Route</th>
                  <th>Material</th><th>Loaded</th><th>Revenue</th>
                  <th>Fuel Cost</th><th>Spare Parts</th><th>Net Profit</th>
                  <th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayTrips.map(t => {
                  const net = parseFloat(t.trip_revenue||0) - parseFloat(t.fuel_cost||0) - parseFloat(t.spare_parts_cost||0);
                  return (
                    <tr key={t.id}>
                      <td className="mono">{t.waybill_no}</td>
                      <td className="mono">{t.truck_number}</td>
                      <td>{t.driver_name}</td>
                      <td style={{ fontSize: 11 }}>{t.origin} → {t.destination}</td>
                      <td>{t.material_type}</td>
                      <td>{t.loaded_qty}T</td>
                      <td className="ced">{fmtGHS(t.trip_revenue)}</td>
                      <td className="ced" style={{ color: 'var(--amber)' }}>{fmtGHS(t.fuel_cost)}</td>
                      <td className="ced" style={{ color: 'var(--amber)' }}>{fmtGHS(t.spare_parts_cost)}</td>
                      <td className="ced" style={{ color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{fmtGHS(net)}</td>
                      <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" title="Details" onClick={() => setSelectedTrip(selectedTrip?.id === t.id ? null : t)}>🔍</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteTrip(t.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {displayTrips.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No trips found</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedTrip && (
            <div style={{ borderTop: '1px solid var(--border)', padding: 16, marginTop: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📊 Trip P&L — {selectedTrip.waybill_no}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[
                  { label: 'Revenue',      val: fmtGHS(selectedTrip.trip_revenue),    color: 'var(--green)' },
                  { label: 'Fuel Cost',    val: fmtGHS(selectedTrip.fuel_cost),       color: 'var(--amber)' },
                  { label: 'Spare Parts',  val: fmtGHS(selectedTrip.spare_parts_cost),color: 'var(--amber)' },
                ].map((k,i) => (
                  <div key={i} style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{k.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: k.color }}>{k.val}</div>
                  </div>
                ))}
              </div>
              {(() => {
                const net = parseFloat(selectedTrip.trip_revenue||0) - parseFloat(selectedTrip.fuel_cost||0) - parseFloat(selectedTrip.spare_parts_cost||0);
                return (
                  <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 8, background: net >= 0 ? 'rgba(14,159,110,0.1)' : 'rgba(224,36,36,0.1)', color: net >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700, fontSize: 15 }}>
                    Net Profit: {fmtGHS(net)}
                  </div>
                );
              })()}
            </div>
          )}

          {tab === 'completed' && completedTrips.length > 0 && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
              {[
                { label: 'Total Revenue',    val: fmtGHS(completedTrips.reduce((s,t)=>s+parseFloat(t.trip_revenue||0),0)),    color: 'var(--green)' },
                { label: 'Total Fuel Cost',  val: fmtGHS(completedTrips.reduce((s,t)=>s+parseFloat(t.fuel_cost||0),0)),       color: 'var(--amber)' },
                { label: 'Total Spare Parts',val: fmtGHS(completedTrips.reduce((s,t)=>s+parseFloat(t.spare_parts_cost||0),0)),color: 'var(--amber)' },
                { label: 'Total Net Profit', val: (() => { const n = completedTrips.reduce((s,t)=>s+parseFloat(t.trip_revenue||0)-parseFloat(t.fuel_cost||0)-parseFloat(t.spare_parts_cost||0),0); return fmtGHS(n); })(), color: 'var(--blue)' },
              ].map((k,i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase' }}>{k.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
