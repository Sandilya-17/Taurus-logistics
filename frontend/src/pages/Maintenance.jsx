// src/pages/Maintenance.jsx – Professional Maintenance Management | Taurus ERP
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS, fmtDate, todayGH } from '../utils/api';
import toast from 'react-hot-toast';

const TYPE_BADGE   = { PREVENTIVE: 'b-blue', CORRECTIVE: 'b-amber', BREAKDOWN: 'b-red' };
const TYPE_COLOR   = { PREVENTIVE: 'var(--primary)', CORRECTIVE: 'var(--amber)', BREAKDOWN: 'var(--red)' };
const TYPE_ICON    = { PREVENTIVE: '🔄', CORRECTIVE: '🔧', BREAKDOWN: '🚨' };
const STATUS_BADGE = { PENDING: 'b-amber', IN_PROGRESS: 'b-blue', DONE: 'b-green' };
const STATUS_ICON  = { PENDING: '⏳', IN_PROGRESS: '🔄', DONE: '✅' };

export default function MaintenancePage() {
  const [records,    setRecords]    = useState([]);
  const [trucks,     setTrucks]     = useState([]);
  const [mechanics,  setMechanics]  = useState([]);
  const [saving,     setSaving]     = useState(false);
  const [view,       setView]       = useState('list'); // 'list' | 'form'
  const [editing,    setEditing]    = useState(null);
  const [filterType, setFilterType] = useState('');
  const [filterStat, setFilterStat] = useState('');
  const [search,     setSearch]     = useState('');
  const [sortCol,    setSortCol]    = useState('service_date');
  const [sortDir,    setSortDir]    = useState('desc');
  const [page,       setPage]       = useState(1);
  const PER_PAGE = 50;
  const formRef = useRef(null);

  const { register, handleSubmit, reset, watch } = useForm({
    defaultValues: {
      maintenance_type: 'PREVENTIVE',
      status: 'PENDING',
      service_date: todayGH(),
      labour_cost: '',
      parts_cost: '',
    }
  });
  const watchLabour = parseFloat(watch('labour_cost') || 0);
  const watchParts  = parseFloat(watch('parts_cost')  || 0);
  const watchTotal  = watchLabour + watchParts;

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/maintenance/logs/').then(r => setRecords(r.data.results || r.data)).catch(() => {});
    api.get('/trucks/').then(r => setTrucks(r.data.results || r.data)).catch(() => {});
    // Try to load mechanics if endpoint exists
    api.get('/maintenance/mechanics/').then(r => setMechanics(r.data.results || r.data)).catch(() => {});
  };

  const startNew = () => {
    setEditing(null);
    reset({ maintenance_type: 'PREVENTIVE', status: 'PENDING', service_date: todayGH(), labour_cost: '', parts_cost: '' });
    setView('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const startEdit = (rec) => {
    setEditing(rec.id);
    reset({
      ...rec,
      truck: rec.truck,
      mechanic: rec.mechanic || '',
      service_date: rec.service_date,
    });
    setView('form');
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const cancelForm = () => {
    setEditing(null);
    reset({ maintenance_type: 'PREVENTIVE', status: 'PENDING', service_date: todayGH(), labour_cost: '', parts_cost: '' });
    setView('list');
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Permanently delete this maintenance record?')) return;
    try {
      await api.delete(`/maintenance/logs/${id}/`);
      toast.success('Maintenance record deleted.');
      load();
    } catch { toast.error('Cannot delete this record.'); }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const labourCost = data.labour_cost ? parseFloat(data.labour_cost) : 0;
      const partsCost  = data.parts_cost  ? parseFloat(data.parts_cost)  : 0;
      const payload = {
        ...data,
        mechanic:            data.mechanic || null,
        labour_cost:         labourCost,
        parts_cost:          partsCost,
        total_cost:          labourCost + partsCost,
        odometer_at_service: data.odometer_at_service ? parseFloat(data.odometer_at_service) : null,
      };
      if (editing) {
        await api.patch(`/maintenance/logs/${editing}/`, payload);
        toast.success('Maintenance record updated.');
      } else {
        await api.post('/maintenance/logs/', payload);
        toast.success('Maintenance record created.');
      }
      cancelForm();
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const [dlMaint, setDlMaint] = useState('');

  const downloadReport = async (fmt) => {
    setDlMaint(fmt);
    try {
      const r = await api.get('/reports/maintenance/', { params: { format: fmt }, responseType: 'blob' });
      const ext  = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const url = URL.createObjectURL(new Blob([r.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `taurus_maintenance_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Maintenance report downloaded as ${fmt.toUpperCase()}.`);
    } catch { toast.error('Download failed. Please try again.'); }
    finally { setDlMaint(''); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const pending      = records.filter(r => r.status === 'PENDING').length;
  const inProgress   = records.filter(r => r.status === 'IN_PROGRESS').length;
  const done         = records.filter(r => r.status === 'DONE').length;
  const totalCost    = records.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0);
  const breakdowns   = records.filter(r => r.maintenance_type === 'BREAKDOWN').length;
  const preventive   = records.filter(r => r.maintenance_type === 'PREVENTIVE').length;

  // Overdue (next_service_date passed but status not DONE)
  const today = new Date().toISOString().split('T')[0];
  const overdue = records.filter(r => r.next_service_date && r.next_service_date < today && r.status !== 'DONE').length;

  // Monthly cost
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthCost = records.filter(r => r.service_date?.slice(0, 7) === thisMonth).reduce((s, r) => s + parseFloat(r.total_cost || 0), 0);

  // ── Filter & Sort ─────────────────────────────────────────────────────────
  const filtered = records
    .filter(r => {
      const matchSearch = (r.description || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.truck_number || '').toLowerCase().includes(search.toLowerCase()) ||
                          (r.mechanic_name || '').toLowerCase().includes(search.toLowerCase());
      const matchType = !filterType || r.maintenance_type === filterType;
      const matchStat = !filterStat || r.status === filterStat;
      return matchSearch && matchType && matchStat;
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === 'total_cost') { va = parseFloat(va); vb = parseFloat(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPage(1);
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span style={{ opacity: .3, fontSize: 10 }}>↕</span>;
    return <span style={{ fontSize: 10 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div>
      {/* ── KPI Cards ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', marginBottom: 20 }}>
        {[
          { label: 'Total Records', val: records.length,     color: 'var(--primary)', sub: `${preventive} preventive` },
          { label: 'Pending',       val: pending,            color: 'var(--amber)',   sub: 'Awaiting action' },
          { label: 'In Progress',   val: inProgress,         color: 'var(--primary)', sub: 'Currently active' },
          { label: 'Breakdowns',    val: breakdowns,         color: 'var(--red)',     sub: `${done} completed` },
          { label: 'Overdue',       val: overdue,            color: overdue > 0 ? 'var(--red)' : 'var(--green)', sub: 'Past service date' },
          { label: 'This Month',    val: fmtGHS(monthCost),  color: 'var(--red)',     sub: `Total: ${fmtGHS(totalCost)}`, isAmount: true },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ color: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ fontSize: k.isAmount ? 15 : 26 }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Overdue Alert ── */}
      {overdue > 0 && (
        <div style={{
          background: 'var(--red-bg)', border: '1.5px solid #fca5a5', borderRadius: 10,
          padding: '12px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--red)', fontSize: 13 }}>
              {overdue} vehicle{overdue > 1 ? 's' : ''} overdue for service
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--red)', opacity: .8 }}>
              These trucks have passed their next service date without a completed maintenance record.
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', borderColor: '#fca5a5', color: 'var(--red)' }}
            onClick={() => { setFilterStat('PENDING'); setFilterType(''); }}>
            View Pending →
          </button>
        </div>
      )}

      <div className="card">
        {/* ── Card Header ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 8 }}>
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">🛠️</span>
            {view === 'form' ? (editing ? 'Edit Maintenance Record' : 'New Maintenance Record') : 'Maintenance Records'}
            <span className="badge b-blue" style={{ marginLeft: 8 }}>{records.length}</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {view === 'list' ? (
              <>
                <button className="export-btn excel" onClick={() => downloadReport('excel')} disabled={!!dlMaint}>{dlMaint === 'excel' ? '⏳ Exporting…' : '📊 Excel'}</button>
                <button className="export-btn pdf" onClick={() => downloadReport('pdf')} disabled={!!dlMaint}>{dlMaint === 'pdf' ? '⏳ Exporting…' : '🖨️ PDF'}</button>
                <button className="btn btn-primary btn-sm" onClick={startNew}>+ New Record</button>
              </>
            ) : (
              <button className="btn btn-ghost btn-sm" onClick={cancelForm}>← Back to List</button>
            )}
          </div>
        </div>

        {/* ── FORM VIEW ── */}
        {view === 'form' && (
          <div ref={formRef}>
            {editing && (
              <div style={{ background: 'var(--amber-bg)', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 14px', marginBottom: 16, fontSize: 12.5, color: '#92400e' }}>
                ✏️ Editing record #{editing} — make your changes and click Update.
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ marginBottom: 14 }}>
                <div className="sec-div" style={{ marginBottom: 14 }}>📋 Basic Information</div>
                <div className="fgrid">
                  <div className="fg">
                    <label>Truck *</label>
                    <select {...register('truck', { required: true })}>
                      <option value="">— Select Truck —</option>
                      {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number} – {t.model || ''}</option>)}
                    </select>
                  </div>
                  <div className="fg">
                    <label>Maintenance Type *</label>
                    <select {...register('maintenance_type', { required: true })}>
                      <option value="PREVENTIVE">🔄 PREVENTIVE</option>
                      <option value="CORRECTIVE">🔧 CORRECTIVE</option>
                      <option value="BREAKDOWN">🚨 BREAKDOWN</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Status</label>
                    <select {...register('status')}>
                      <option value="PENDING">⏳ PENDING</option>
                      <option value="IN_PROGRESS">🔄 IN PROGRESS</option>
                      <option value="DONE">✅ DONE</option>
                    </select>
                  </div>
                  <div className="fg">
                    <label>Service Date *</label>
                    <input type="date" {...register('service_date', { required: true })} />
                  </div>
                  {mechanics.length > 0 && (
                    <div className="fg">
                      <label>Mechanic</label>
                      <select {...register('mechanic')}>
                        <option value="">— Not assigned —</option>
                        {mechanics.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="fg">
                    <label>Odometer at Service (km)</label>
                    <input type="number" step="0.1" min="0" placeholder="e.g. 125000" {...register('odometer_at_service')} />
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="sec-div" style={{ marginBottom: 14 }}>💰 Cost Breakdown</div>
                <div className="fgrid">
                  <div className="fg">
                    <label>Labour Cost (GH₵)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" {...register('labour_cost')} />
                  </div>
                  <div className="fg">
                    <label>Parts Cost (GH₵)</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00" {...register('parts_cost')} />
                  </div>
                  <div className="fg">
                    <label>Total Cost</label>
                    <div className="calc-box">{fmtGHS(watchTotal)}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div className="sec-div" style={{ marginBottom: 14 }}>📅 Next Service Schedule</div>
                <div className="fgrid">
                  <div className="fg">
                    <label>Next Service Date</label>
                    <input type="date" {...register('next_service_date')} />
                  </div>
                  <div className="fg">
                    <label>Next Service Odometer (km)</label>
                    <input type="number" step="0.1" min="0" {...register('next_service_odometer')} />
                  </div>
                </div>
              </div>

              <div className="fg mb16">
                <label>Description / Work Done *</label>
                <textarea rows={3} placeholder="Describe the maintenance work performed in detail…" {...register('description', { required: true })} />
              </div>

              <div className="fg mb16">
                <label>Remarks</label>
                <textarea rows={2} placeholder="Additional remarks or notes…" {...register('remark')} />
              </div>

              <div className="flex gap8">
                <button type="submit" className="btn btn-primary" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? '⏳ Saving…' : editing ? '✓ Update Record' : '+ Create Maintenance Record'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={cancelForm}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterType} onChange={e => { setFilterType(e.target.value); setPage(1); }}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--card)' }}>
                <option value="">All Types</option>
                <option value="PREVENTIVE">🔄 Preventive</option>
                <option value="CORRECTIVE">🔧 Corrective</option>
                <option value="BREAKDOWN">🚨 Breakdown</option>
              </select>
              <select
                value={filterStat} onChange={e => { setFilterStat(e.target.value); setPage(1); }}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--card)' }}>
                <option value="">All Statuses</option>
                <option value="PENDING">⏳ Pending</option>
                <option value="IN_PROGRESS">🔄 In Progress</option>
                <option value="DONE">✅ Done</option>
              </select>
              <input
                type="text" placeholder="Search truck, description, mechanic…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 240, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', flex: '1 1 200px' }}
              />
              {(filterType || filterStat || search) && (
                <button className="btn btn-ghost btn-sm" onClick={() => { setFilterType(''); setFilterStat(''); setSearch(''); setPage(1); }}>
                  ✕ Clear
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
                {filtered.length} record{filtered.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('service_date')}>Date <SortIcon col="service_date" /></th>
                    <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('truck_number')}>Truck <SortIcon col="truck_number" /></th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Mechanic</th>
                    <th>Odometer</th>
                    <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('total_cost')}>Cost <SortIcon col="total_cost" /></th>
                    <th>Next Service</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(r => {
                    const isOverdue = r.next_service_date && r.next_service_date < today && r.status !== 'DONE';
                    return (
                      <tr key={r.id} className={isOverdue ? 'row-highlight' : ''}>
                        <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(r.service_date)}</td>
                        <td className="mono" style={{ fontWeight: 700, fontSize: 12 }}>{r.truck_number}</td>
                        <td>
                          <span className={`badge ${TYPE_BADGE[r.maintenance_type]}`}>
                            {TYPE_ICON[r.maintenance_type]} {r.maintenance_type}
                          </span>
                        </td>
                        <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {r.description}
                        </td>
                        <td style={{ fontSize: 11 }}>{r.mechanic_name || '—'}</td>
                        <td style={{ fontSize: 11 }}>
                          {r.odometer_at_service ? `${parseFloat(r.odometer_at_service).toLocaleString()} km` : '—'}
                        </td>
                        <td className="ced" style={{ textAlign: 'right', fontWeight: 700 }}>
                          {r.total_cost ? fmtGHS(r.total_cost) : '—'}
                        </td>
                        <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
                          {r.next_service_date ? (
                            <span style={{ color: isOverdue ? 'var(--red)' : 'inherit' }}>
                              {isOverdue && '⚠️ '}{fmtDate(r.next_service_date)}
                            </span>
                          ) : '—'}
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[r.status]}`}>
                            {STATUS_ICON[r.status]} {r.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap4">
                            <button className="btn btn-ghost btn-xs" onClick={() => startEdit(r)}>✏️</button>
                            <button className="btn btn-danger btn-xs" onClick={() => deleteRecord(r.id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginated.length === 0 && (
                    <tr>
                      <td colSpan={10}>
                        <div className="empty-state">
                          <div className="empty-state-icon">🛠️</div>
                          <div className="empty-state-title">No maintenance records found</div>
                          <div className="empty-state-sub">
                            {records.length === 0 ? 'Start by adding your first maintenance record' : 'Try adjusting your filters'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination + totals */}
            {filtered.length > 0 && (
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12,
              }}>
                <span style={{ color: 'var(--muted)' }}>
                  Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} &nbsp;|&nbsp;
                  <strong style={{ color: 'var(--red)' }}>Total: {fmtGHS(filtered.reduce((s, r) => s + parseFloat(r.total_cost || 0), 0))}</strong>
                </span>
                {totalPages > 1 && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                      <button key={p} className={`btn btn-xs ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
                    ))}
                    <button className="btn btn-ghost btn-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
