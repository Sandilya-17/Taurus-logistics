// src/pages/Fuel.jsx – Fuel log with live excess detection + excess cost
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { calcFuel, fmtGHS } from '../utils/api';
import toast from 'react-hot-toast';

export default function FuelPage() {
  const [trucks,   setTrucks]   = useState([]);
  const [trips,    setTrips]    = useState([]);
  const [limits,   setLimits]   = useState({});
  const [history,  setHistory]  = useState([]);
  const [computed, setComputed] = useState({ excess_fuel: 0, total_cost: 0, excess_cost: 0 });
  const [saving,   setSaving]   = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [dlFuel,   setDlFuel]   = useState(''); // '' | 'excel' | 'pdf'

  const handleFuelDownload = async (fmt) => {
    setDlFuel(fmt);
    try {
      const mime = fmt === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const resp = await api.get(`/reports/fuel/?format=${fmt}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([resp.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `fuel_report_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Fuel report downloaded as ${fmt.toUpperCase()}.`);
    } catch { toast.error('Download failed. Please try again.'); }
    finally { setDlFuel(''); }
  };
  const { register, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: { price_per_litre: '14.50', litres: '', fuel_limit: '' }
  });

  const watchedTruck  = watch('truck_id');
  const watchedLitres = watch('litres');
  const watchedLimit  = watch('fuel_limit');
  const watchedPrice  = watch('price_per_litre');

  // Load data
  useEffect(() => {
    api.get('/trucks/?status=ACTIVE').then(r => setTrucks(r.data.results || r.data));
    api.get('/fuel/limits/').then(r => {
      const lmap = {};
      (r.data.results || r.data).forEach(l => { lmap[l.truck] = l.fuel_limit; });
      setLimits(lmap);
    });
    api.get('/trips/?status=EN_ROUTE').then(r => setTrips(r.data.results || r.data));
    loadHistory();
  }, []);

  const loadHistory = () => {
    api.get('/fuel/logs/').then(r => setHistory(r.data.results || r.data));
  };

  const startEdit = (f) => {
    setEditing(f.id);
    reset({
      date:            f.date,
      truck_id:        f.truck,
      trip_id:         f.trip || '',
      odometer:        f.odometer || '',
      fuel_limit:      f.fuel_limit,
      litres:          f.litres,
      price_per_litre: f.price_per_litre,
      remark:          f.remark || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Delete this fuel log?')) return;
    try {
      await api.delete(`/fuel/logs/${id}/`);
      toast.success('Fuel log deleted.');
      loadHistory();
    } catch {
      toast.error('Failed to delete fuel log.');
    }
  };

  // When truck changes → auto-fill fuel limit
  useEffect(() => {
    if (watchedTruck && limits[watchedTruck]) {
      setValue('fuel_limit', limits[watchedTruck]);
    }
  }, [watchedTruck, limits]);

  // Live auto-calculation using shared calcFuel helper
  useEffect(() => {
    setComputed(calcFuel(watchedLitres, watchedLimit, watchedPrice));
  }, [watchedLitres, watchedLimit, watchedPrice]);

  const excess = computed.excess_fuel;

  const onSubmit = async (data) => {
    if (excess > 0 && !data.remark?.trim()) {
      toast.error('Remark is MANDATORY when fuel exceeds the limit.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...data,
        truck_id:        parseInt(data.truck_id),
        trip_id:         data.trip_id ? parseInt(data.trip_id) : null,
        litres:          parseFloat(data.litres),
        fuel_limit:      parseFloat(data.fuel_limit),
        price_per_litre: parseFloat(data.price_per_litre),
        odometer:        data.odometer ? parseFloat(data.odometer) : null,
      };
      if (editing) {
        await api.patch(`/fuel/logs/${editing}/`, payload);
        toast.success('Fuel log updated successfully.');
      } else {
        await api.post('/fuel/logs/', payload);
        toast.success('Fuel log saved successfully.');
      }
      reset({ price_per_litre: '14.50' });
      setEditing(null);
      setComputed({ excess_fuel: 0, total_cost: 0, excess_cost: 0 });
      loadHistory();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save fuel log.');
    } finally {
      setSaving(false);
    }
  };

  // Helper: compute excess cost for a history row
  const rowExcessCost = (fl) => {
    const ex  = parseFloat(fl.excess_fuel || 0);
    const ppl = parseFloat(fl.price_per_litre || 0);
    return ex * ppl;
  };

  return (
    <div>
      <div className="g2">
        {/* ── Fuel Log Form ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">⛽</span>{editing ? 'Edit Fuel Fill' : 'Log Fuel Fill'}</div>
          <form onSubmit={handleSubmit(onSubmit)}>

            <div className="sec-div">Truck & Date</div>
            <div className="fgrid">
              <div className="fg">
                <label>Date *</label>
                <input type="date" {...register('date', { required: true })} />
              </div>
              <div className="fg">
                <label>Truck *</label>
                <select {...register('truck_id', { required: true })}>
                  <option value="">— Select Truck —</option>
                  {trucks.map(t => (
                    <option key={t.id} value={t.id}>{t.truck_number} – {t.model}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Linked Trip (Optional)</label>
                <select {...register('trip_id')}>
                  <option value="">None</option>
                  {trips.map(t => (
                    <option key={t.id} value={t.id}>{t.waybill_no} – {t.origin}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>Odometer (km)</label>
                <input type="number" step="0.1" placeholder="e.g. 84230" {...register('odometer')} />
              </div>
            </div>

            <div className="sec-div">Fuel Details — Auto-Calculated</div>
            <div className="fgrid">
              <div className="fg">
                <label>Fuel Limit (L) — Auto-Filled</label>
                <input type="number" step="0.1" placeholder="Auto from truck"
                       {...register('fuel_limit', { required: true })}
                       style={{ color: 'var(--blue)', fontWeight: 600 }} />
              </div>
              <div className="fg">
                <label>Litres Issued *</label>
                <input type="number" step="0.1" min="0" placeholder="0.0"
                       {...register('litres', { required: true, min: 0.1 })}
                       style={{ borderColor: excess > 0 ? 'var(--red)' : undefined }} />
              </div>
              <div className="fg">
                <label>Price per Litre (GH₵) *</label>
                <input type="number" step="0.01" min="0" placeholder="14.50"
                       {...register('price_per_litre', { required: true })} />
              </div>
            </div>

            {/* Live calculation results — 3 boxes */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div className="fg">
                <label>Excess Fuel (L) — Auto</label>
                <div className="calc-box" style={{
                  color:       excess > 0 ? 'var(--red)' : 'var(--green)',
                  borderColor: excess > 0 ? '#fecdd3'    : '#bbf7d0',
                  background:  excess > 0 ? '#fff1f2'    : '#f0fdf4',
                  fontSize: 14,
                }}>
                  {excess > 0 ? `⚠️ +${excess.toFixed(2)} L EXCESS` : '✓ Within Limit'}
                </div>
              </div>
              <div className="fg">
                <label>Total Fuel Cost (GH₵) — Auto</label>
                <div className="calc-box" style={{ fontSize: 14, fontWeight: 700 }}>{fmtGHS(computed.total_cost)}</div>
              </div>
              <div className="fg">
                <label>Excess Fuel Cost (GH₵) — Auto</label>
                <div className="calc-box" style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color:       computed.excess_cost > 0 ? 'var(--red)' : 'var(--muted)',
                  borderColor: computed.excess_cost > 0 ? '#fecdd3'    : undefined,
                  background:  computed.excess_cost > 0 ? '#fff1f2'    : undefined,
                }}>
                  {computed.excess_cost > 0 ? fmtGHS(computed.excess_cost) : 'GH₵ 0.00'}
                </div>
              </div>
            </div>

            {excess > 0 && (
              <div className="excess-warn mt8">
                ⚠️ Fuel issued exceeds the truck limit by <strong>{excess.toFixed(2)} L</strong> costing an extra <strong>{fmtGHS(computed.excess_cost)}</strong>. Remark below is MANDATORY.
              </div>
            )}

            <div className="fg mt12">
              <label style={{ color: excess > 0 ? 'var(--red)' : undefined }}>
                Remark {excess > 0 ? '* (MANDATORY – excess detected)' : '(Optional)'}
              </label>
              <input type="text" placeholder={excess > 0 ? 'Explain reason for excess fuel' : 'Optional note'}
                     {...register('remark')}
                     style={{ borderColor: excess > 0 ? 'var(--red)' : undefined }} />
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : editing ? '✓ Update Fuel Log' : '💾 Save Fuel Log'}
              </button>
              <button type="button" className="btn btn-ghost"
                      onClick={() => { setEditing(null); reset({ price_per_litre: '14.50' }); setComputed({ excess_fuel: 0, total_cost: 0, excess_cost: 0 }); }}>
                {editing ? 'Cancel' : 'Clear'}
              </button>
            </div>
          </form>
        </div>

        {/* ── History & Excess Report ── */}
        <div>
          <div className="flex justify-end mb12 gap8">
            <button className="export-btn excel" onClick={() => handleFuelDownload('excel')} disabled={!!dlFuel}>
              {dlFuel === 'excel' ? '⏳ Exporting…' : <><span style={{ marginRight: 6 }}>📊</span> Download Fuel Report (Excel)</>}
            </button>
            <button className="export-btn pdf" onClick={() => handleFuelDownload('pdf')} disabled={!!dlFuel}>
              {dlFuel === 'pdf' ? '⏳ Exporting…' : <><span style={{ marginRight: 6 }}>🖨️</span> Download Fuel Report (PDF)</>}
            </button>
          </div>

          <div className="card mb16">
            <div className="card-title"><span className="card-title-ic">🔴</span>Fuel Excess Incidents</div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Truck</th><th>Limit</th><th>Issued</th>
                    <th>Excess (L)</th><th>Excess Cost</th><th>Remark</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.filter(h => parseFloat(h.excess_fuel) > 0).length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No excess incidents</td></tr>
                  )}
                  {history.filter(h => parseFloat(h.excess_fuel) > 0).map(fl => (
                    <tr key={fl.id}>
                      <td>{new Date(fl.date).toLocaleDateString('en-GB')}</td>
                      <td className="mono"><strong>{fl.truck_number}</strong></td>
                      <td>{fl.fuel_limit} L</td>
                      <td>{fl.litres} L</td>
                      <td><span className="badge b-red">+{fl.excess_fuel} L</span></td>
                      <td className="ced" style={{ color: 'var(--red)', fontWeight: 600 }}>{fmtGHS(rowExcessCost(fl))}</td>
                      <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }}>{fl.remark}</td>
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(fl)}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteRecord(fl.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <div className="card-title"><span className="card-title-ic">📋</span>Recent Fuel Logs</div>
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th><th>Truck</th><th>Litres</th><th>Price/L</th>
                    <th>Total Cost</th><th>Excess Cost</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 && (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No fuel logs yet</td></tr>
                  )}
                  {history.slice(0, 15).map(fl => {
                    const exCost = rowExcessCost(fl);
                    return (
                      <tr key={fl.id}>
                        <td>{new Date(fl.date).toLocaleDateString('en-GB')}</td>
                        <td className="mono">{fl.truck_number}</td>
                        <td>{fl.litres} L</td>
                        <td>GH₵ {fl.price_per_litre}</td>
                        <td className="ced" style={{ fontWeight: 600 }}>{fmtGHS(fl.total_cost)}</td>
                        <td className="ced" style={{ color: exCost > 0 ? 'var(--red)' : 'var(--muted)' }}>
                          {exCost > 0 ? fmtGHS(exCost) : '—'}
                        </td>
                        <td>
                          {parseFloat(fl.excess_fuel) > 0
                            ? <span className="badge b-red">Excess</span>
                            : <span className="badge b-green">Normal</span>}
                        </td>
                        <td>
                          <div className="flex gap4">
                            <button className="btn btn-ghost btn-xs" onClick={() => startEdit(fl)}>Edit</button>
                            <button className="btn btn-danger btn-xs" onClick={() => deleteRecord(fl.id)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
