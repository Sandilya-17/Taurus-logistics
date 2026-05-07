// src/pages/Drivers.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtDate } from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = { ACTIVE: 'b-green', SUSPENDED: 'b-amber', RESIGNED: 'b-red' };

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [trucks,  setTrucks]  = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [editing, setEditing] = useState(null);
  const [tab,     setTab]     = useState('list');
  const [search,  setSearch]  = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/drivers/').then(r => setDrivers(r.data.results || r.data)).catch(() => {});
    api.get('/trucks/?status=ACTIVE').then(r => setTrucks(r.data.results || r.data)).catch(() => {});
  };

  const startEdit = (d) => { setEditing(d.id); reset({ ...d, assigned_truck: d.assigned_truck || '' }); setTab('form'); };
  const deleteDriver = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await api.delete(`/drivers/${id}/`);
      toast.success('Driver deleted.');
      load();
    } catch { toast.error('Cannot delete — driver may have linked records.'); }
  };

  const cancelForm = () => { reset({}); setEditing(null); setTab('list'); };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, assigned_truck: data.assigned_truck || null };
      if (editing) {
        await api.patch(`/drivers/${editing}/`, payload);
        toast.success('Driver updated.');
      } else {
        await api.post('/drivers/', payload);
        toast.success('Driver added.');
      }
      reset({}); setEditing(null); setTab('list'); load();
    } catch (e) {
      const msg = e.response?.data;
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const today = new Date().toISOString().split('T')[0];
  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.licence_number?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );

  const active    = drivers.filter(d => d.status === 'ACTIVE').length;
  const suspended = drivers.filter(d => d.status === 'SUSPENDED').length;
  const expired   = drivers.filter(d => d.licence_expiry_date && d.licence_expiry_date < today).length;

  return (
    <div>
      <div className="kpi-grid mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Drivers',    val: drivers.length, color: 'var(--blue)'  },
          { label: 'Active',           val: active,         color: 'var(--green)' },
          { label: 'Suspended',        val: suspended,      color: 'var(--amber)' },
          { label: 'Licence Expired',  val: expired,        color: 'var(--red)'   },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: 22 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">👤</span> Driver Management
          </div>
          <div className="flex gap8">
            <input type="text" placeholder="Search drivers…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 10px', fontSize: 12 }} />
            <button className="btn btn-primary btn-sm" onClick={() => { reset({}); setEditing(null); setTab(tab === 'form' ? 'list' : 'form'); }}>
              {tab === 'form' ? '← Back to List' : '+ Add Driver'}
            </button>
          </div>
        </div>

        {tab === 'list' ? (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th><th>Phone</th><th>Ghana Card</th>
                  <th>Licence #</th><th>Class</th><th>Licence Expiry</th>
                  <th>Assigned Truck</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const expired = d.licence_expiry_date && d.licence_expiry_date < today;
                  return (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>{d.name}</td>
                      <td className="mono">{d.phone}</td>
                      <td className="mono" style={{ fontSize: 11 }}>{d.ghana_card_no}</td>
                      <td className="mono">{d.licence_number}</td>
                      <td><span className="badge b-blue">{d.licence_class}</span></td>
                      <td>
                        <span className={expired ? 'badge b-red' : 'badge b-green'} style={{ fontSize: 11 }}>
                          {fmtDate(d.licence_expiry_date)}{expired ? ' ⚠️' : ''}
                        </span>
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>{d.assigned_truck_number || '—'}</td>
                      <td><span className={`badge ${STATUS_BADGE[d.status]}`}>{d.status}</span></td>
                      <td><div className="flex gap4"><button className="btn btn-ghost btn-xs" onClick={() => startEdit(d)}>✏️ Edit</button><button className="btn btn-danger btn-xs" onClick={() => deleteDriver(d.id)}>🗑️</button></div></td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No drivers found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="sec-div">Personal Information</div>
            <div className="fgrid">
              <div className="fg">
                <label>Full Name *</label>
                <input type="text" placeholder="e.g. Kwame Asante" {...register('name', { required: true })} />
                {errors.name && <span style={{ color: 'var(--red)', fontSize: 11 }}>Required</span>}
              </div>
              <div className="fg">
                <label>Phone *</label>
                <input type="tel" placeholder="0244XXXXXX" {...register('phone', { required: true })} />
              </div>
              <div className="fg">
                <label>Ghana Card No. *</label>
                <input type="text" placeholder="GHA-XXXXXXXXX-X" {...register('ghana_card_no', { required: true })} />
              </div>
              <div className="fg">
                <label>Date of Birth</label>
                <input type="date" {...register('date_of_birth')} />
              </div>
              <div className="fg" style={{ gridColumn: 'span 2' }}>
                <label>Address</label>
                <textarea rows={2} {...register('address')} />
              </div>
            </div>

            <div className="sec-div">Licence Details</div>
            <div className="fgrid">
              <div className="fg">
                <label>Licence Number *</label>
                <input type="text" {...register('licence_number', { required: true })} />
              </div>
              <div className="fg">
                <label>Licence Class</label>
                <select {...register('licence_class')}>
                  {['A','B','C','D','E'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Issue Date</label>
                <input type="date" {...register('licence_issue_date')} />
              </div>
              <div className="fg">
                <label>Expiry Date *</label>
                <input type="date" {...register('licence_expiry_date', { required: true })} />
              </div>
            </div>

            <div className="sec-div">Assignment & Status</div>
            <div className="fgrid">
              <div className="fg">
                <label>Assign to Truck</label>
                <select {...register('assigned_truck')}>
                  <option value="">— Unassigned —</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Status</label>
                <select {...register('status')}>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="RESIGNED">RESIGNED</option>
                </select>
              </div>
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : editing ? '✓ Update Driver' : '+ Add Driver'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
