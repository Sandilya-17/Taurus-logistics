// src/pages/Trucks.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtDate } from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = { ACTIVE: 'b-green', INACTIVE: 'b-red' };
const ALL_MODULES = ['trucks','drivers','trips','fuel','purchase','issue','stock','tyres','spares','invoicing','expenditure','revenue','maintenance','reports'];

export default function TrucksPage() {
  const [trucks,  setTrucks]  = useState([]);
  const [alerts,  setAlerts]  = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab,     setTab]     = useState('list');
  const [search,  setSearch]  = useState('');

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
  const wStatus = watch('status');

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/trucks/').then(r => setTrucks(r.data.results || r.data)).catch(() => {});
    api.get('/trucks/alerts/').then(r => setAlerts(r.data)).catch(() => {});
  };

  const startEdit = (truck) => {
    setEditing(truck.id);
    reset({ ...truck });
    setTab('form');
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        year: data.year ? parseInt(data.year) : null,
        current_odometer: parseFloat(data.current_odometer || 0),
      };
      if (editing) {
        await api.patch(`/trucks/${editing}/`, payload);
        toast.success('Truck updated.');
      } else {
        await api.post('/trucks/', payload);
        toast.success('Truck added successfully.');
      }
      reset({}); setEditing(null); setTab('list'); load();
    } catch (e) {
      const msg = e.response?.data;
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const cancelForm = () => { reset({}); setEditing(null); setTab('list'); };

  const deleteTruck = async (id) => {
    if (!window.confirm('Delete this truck? This cannot be undone.')) return;
    try {
      await api.delete(`/trucks/${id}/`);
      toast.success('Truck deleted.');
      load();
    } catch (e) { toast.error('Cannot delete — truck may have linked records.'); }
  };

  const filtered = trucks.filter(t =>
    t.truck_number?.toLowerCase().includes(search.toLowerCase()) ||
    t.model?.toLowerCase().includes(search.toLowerCase()) ||
    t.make?.toLowerCase().includes(search.toLowerCase())
  );

  const active   = trucks.filter(t => t.status === 'ACTIVE').length;
  const inactive = trucks.filter(t => t.status === 'INACTIVE').length;

  return (
    <div>
      {/* KPIs */}
      <div className="kpi-grid mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Fleet',   val: trucks.length,  color: 'var(--blue)'  },
          { label: 'Active',        val: active,         color: 'var(--green)' },
          { label: 'Inactive',      val: inactive,       color: 'var(--red)'   },
          { label: 'Expiry Alerts', val: alerts.length,  color: 'var(--amber)' },
        ].map((k,i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 22 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Expiry Alerts */}
      {alerts.length > 0 && (
        <div className="alert alert-warn mb16" style={{ flexDirection: 'column', gap: 6 }}>
          <strong>⚠️ Expiry Alerts ({alerts.length})</strong>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {alerts.map((a, i) => (
              <span key={i} className={`badge ${a.level === 'DANGER' ? 'b-red' : 'b-amber'}`}>
                {a.truck_number} · {a.name}: {a.days_remaining <= 0 ? 'EXPIRED' : `${a.days_remaining}d`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">🚛</span> Truck Fleet Management
          </div>
          <div className="flex gap8">
            <input
              type="text"
              placeholder="Search trucks…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 10px', fontSize: 12 }}
            />
            <button className="btn btn-primary btn-sm" onClick={() => { reset({}); setEditing(null); setTab(tab === 'form' ? 'list' : 'form'); }}>
              {tab === 'form' ? '← Back to List' : '+ Add Truck'}
            </button>
          </div>
        </div>

        {tab === 'list' ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Truck #</th><th>Model / Make</th><th>Year</th><th>Chassis</th>
                  <th>Status</th><th>Odometer</th><th>Insurance</th><th>DVLA</th><th>VIT Due</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{t.truck_number}</td>
                    <td>{t.model} {t.make && <span style={{ color: 'var(--muted)', fontSize: 11 }}>· {t.make}</span>}</td>
                    <td>{t.year || '—'}</td>
                    <td className="mono" style={{ fontSize: 11 }}>{t.chassis_number || '—'}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                    <td>{parseFloat(t.current_odometer || 0).toLocaleString()} km</td>
                    <td style={{ fontSize: 11 }}>{fmtDate(t.insurance_expiry)}</td>
                    <td style={{ fontSize: 11 }}>{fmtDate(t.dvla_expiry)}</td>
                    <td style={{ fontSize: 11 }}>{fmtDate(t.vit_next_due_date)}</td>
                    <td>
                      <div className="flex gap4">
                        <button className="btn btn-ghost btn-xs" onClick={() => startEdit(t)}>✏️ Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteTruck(t.id)} title="Delete truck">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No trucks found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="sec-div">Basic Information</div>
            <div className="fgrid">
              <div className="fg">
                <label>Truck Number *</label>
                <input type="text" placeholder="GE-1234-24" {...register('truck_number', { required: true })} />
                {errors.truck_number && <span style={{ color: 'var(--red)', fontSize: 11 }}>Required</span>}
              </div>
              <div className="fg">
                <label>Model *</label>
                <input type="text" placeholder="e.g. Actros 2644" {...register('model', { required: true })} />
              </div>
              <div className="fg">
                <label>Make</label>
                <input type="text" placeholder="e.g. Mercedes-Benz" {...register('make')} />
              </div>
              <div className="fg">
                <label>Year</label>
                <input type="number" placeholder="2022" min="1990" max="2030" {...register('year')} />
              </div>
              <div className="fg">
                <label>Chassis Number</label>
                <input type="text" {...register('chassis_number')} />
              </div>
              <div className="fg">
                <label>Status *</label>
                <select {...register('status', { required: true })}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            {wStatus === 'INACTIVE' && (
              <div className="fg mb12">
                <label>Inactive Reason *</label>
                <textarea placeholder="Reason for inactivity…" {...register('inactive_reason', { required: wStatus === 'INACTIVE' })} />
              </div>
            )}

            <div className="sec-div">Expiry Dates & Compliance</div>
            <div className="fgrid">
              <div className="fg">
                <label>Insurance Expiry</label>
                <input type="date" {...register('insurance_expiry')} />
              </div>
              <div className="fg">
                <label>DVLA Expiry</label>
                <input type="date" {...register('dvla_expiry')} />
              </div>
              <div className="fg">
                <label>Fitness Expiry</label>
                <input type="date" {...register('fitness_expiry')} />
              </div>
              <div className="fg">
                <label>Permit Expiry</label>
                <input type="date" {...register('permit_expiry')} />
              </div>
              <div className="fg">
                <label>VIT Last Paid Date</label>
                <input type="date" {...register('vit_last_paid_date')} />
              </div>
              <div className="fg">
                <label>Current Odometer (km)</label>
                <input type="number" step="0.1" min="0" placeholder="0" {...register('current_odometer')} />
              </div>
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : editing ? '✓ Update Truck' : '+ Add Truck'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}