// src/pages/Tyres.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS, fmtDate } from '../utils/api';
import toast from 'react-hot-toast';

const STATUS_BADGE = { STORE: 'b-blue', FITTED: 'b-green', WORKSHOP: 'b-amber', CONDEMNED: 'b-red' };

export default function TyresPage() {
  const [tyres,   setTyres]   = useState([]);
  const [trucks,  setTrucks]  = useState([]);
  const [saving,  setSaving]  = useState(false);
  const [tab,     setTab]     = useState('list');
  const [editing, setEditing] = useState(null);
  const [search,  setSearch]  = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { register, handleSubmit, reset } = useForm({ defaultValues: { status: 'STORE' } });

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/tyres/').then(r => setTyres(r.data.results || r.data)).catch(() => {});
    api.get('/trucks/?status=ACTIVE').then(r => setTrucks(r.data.results || r.data)).catch(() => {});
  };

  const startEdit = (t) => { setEditing(t.id); reset({ ...t }); setTab('form'); };
  const cancelForm = () => { reset({ status: 'STORE' }); setEditing(null); setTab('list'); };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, unit_cost: parseFloat(data.unit_cost || 0) };
      if (editing) {
        await api.patch(`/tyres/${editing}/`, payload);
        toast.success('Tyre updated.');
      } else {
        await api.post('/tyres/', payload);
        toast.success('Tyre added.');
      }
      cancelForm(); load();
    } catch (e) {
      toast.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed.');
    } finally { setSaving(false); }
  };

  const deleteTyre = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tyre?')) return;
    try {
      await api.delete(`/tyres/${id}/`);
      toast.success('Tyre deleted.');
      load();
    } catch (e) {
      toast.error('Cannot delete tyre. It may be currently assigned to a truck.');
    }
  };

  const filtered = tyres.filter(t => {
    const matchSearch = t.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
                        t.brand?.toLowerCase().includes(search.toLowerCase()) ||
                        t.size?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || t.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const inStore    = tyres.filter(t => t.status === 'STORE').length;
  const fitted     = tyres.filter(t => t.status === 'FITTED').length;
  const workshop   = tyres.filter(t => t.status === 'WORKSHOP').length;
  const condemned  = tyres.filter(t => t.status === 'CONDEMNED').length;
  const totalValue = tyres.filter(t => t.status !== 'CONDEMNED').reduce((s, t) => s + parseFloat(t.unit_cost || 0), 0);

  return (
    <div>
      <div className="kpi-grid mb16" style={{ gridTemplateColumns: 'repeat(6,1fr)' }}>
        {[
          { label: 'Total Tyres',  val: tyres.length, color: 'var(--blue)'  },
          { label: 'In Store',     val: inStore,      color: 'var(--green)' },
          { label: 'Fitted',       val: fitted,       color: 'var(--sky)'   },
          { label: 'Workshop',     val: workshop,     color: '#b45309'      },
          { label: 'Condemned',    val: condemned,    color: 'var(--red)'   },
          { label: 'Total Value',  val: fmtGHS(totalValue), color: 'var(--green)', isValue: true },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: k.isValue ? 16 : 22 }}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">🛞</span> Tyre Management
          </div>
          <div className="flex gap8">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)' }}>
              <option value="">All Statuses</option>
              <option value="STORE">In Store</option>
              <option value="FITTED">Fitted</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="CONDEMNED">Condemned</option>
            </select>
            <input type="text" placeholder="Search tyres…" value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: 180, padding: '7px 10px', fontSize: 12 }} />
            <button className="btn btn-primary btn-sm" onClick={() => { cancelForm(); setTab(tab === 'form' ? 'list' : 'form'); }}>
              {tab === 'form' ? '← Back to List' : '+ Add Tyre'}
            </button>
          </div>
        </div>

        {tab === 'form' ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="fgrid">
              <div className="fg">
                <label>Serial Number *</label>
                <input type="text" placeholder="TYR-001" {...register('serial_number', { required: true })} />
              </div>
              <div className="fg">
                <label>Brand *</label>
                <input type="text" placeholder="Michelin, Bridgestone…" {...register('brand', { required: true })} />
              </div>
              <div className="fg">
                <label>Model</label>
                <input type="text" placeholder="XDE2" {...register('model')} />
              </div>
              <div className="fg">
                <label>Size *</label>
                <input type="text" placeholder="11R22.5" {...register('size', { required: true })} />
              </div>
              <div className="fg">
                <label>Unit Cost (GH₵) *</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" {...register('unit_cost', { required: true })} />
              </div>
              <div className="fg">
                <label>Status</label>
                <select {...register('status')}>
                  <option value="STORE">IN STORE</option>
                  <option value="FITTED">FITTED</option>
                  <option value="WORKSHOP">WORKSHOP</option>
                  <option value="CONDEMNED">CONDEMNED</option>
                </select>
              </div>
            </div>
            <div className="flex gap8 mt12">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : editing ? '✓ Update Tyre' : '+ Add Tyre'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
            </div>
          </form>
        ) : (
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Serial #</th><th>Brand</th><th>Model</th><th>Size</th>
                  <th>Unit Cost</th><th>Status</th><th>Fitted On</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td className="mono" style={{ fontWeight: 700 }}>{t.serial_number}</td>
                    <td>{t.brand}</td>
                    <td style={{ fontSize: 11, color: 'var(--muted)' }}>{t.model || '—'}</td>
                    <td><span className="badge b-gray">{t.size}</span></td>
                    <td className="ced">{fmtGHS(t.unit_cost)}</td>
                    <td><span className={`badge ${STATUS_BADGE[t.status]}`}>{t.status}</span></td>
                    <td style={{ fontSize: 11 }}>
                      {t.current_assignment ? `${t.current_assignment.truck_number} / ${t.current_assignment.position}` : '—'}
                    </td>
                    <td>
                      <div className="flex gap4">
                        <button className="btn btn-ghost btn-xs" onClick={() => startEdit(t)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteTyre(t.id)}>Del</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 32 }}>No tyres found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
