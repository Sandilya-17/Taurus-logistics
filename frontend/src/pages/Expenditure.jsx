// src/pages/Expenditure.jsx – Professional Expenditure Management | Taurus ERP
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS, fmtDate, todayGH } from '../utils/api';
import toast from 'react-hot-toast';

const DEFAULT_CATEGORIES = ['FUEL', 'MAINTENANCE', 'TYRE', 'SPARE_PART', 'DRIVER_WAGE', 'TOLL', 'ADMIN', 'OTHER'];

const CAT_BADGE  = { FUEL: 'b-blue', MAINTENANCE: 'b-amber', TYRE: 'b-gray', SPARE_PART: 'b-gray', DRIVER_WAGE: 'b-gray', TOLL: 'b-gray', ADMIN: 'b-green', OTHER: 'b-gray' };
const CAT_COLOR  = { FUEL: 'var(--primary)', MAINTENANCE: 'var(--amber)', TYRE: '#64748b', SPARE_PART: '#0369a1', DRIVER_WAGE: '#7c3aed', TOLL: '#64748b', ADMIN: 'var(--green)', OTHER: '#64748b' };
const CAT_ICON   = { FUEL: '⛽', MAINTENANCE: '🔧', TYRE: '🛞', SPARE_PART: '⚙️', DRIVER_WAGE: '👤', TOLL: '🛣️', ADMIN: '🏢', OTHER: '📦' };

// ── Add Category Modal ────────────────────────────────────────────────────────
function AddCategoryModal({ onAdd, onClose }) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const ICON_OPTIONS = ['📦','🏗️','🚧','🔩','💡','🧰','🏦','📝','🚿','🛒','🧾','🔑','📱','🖨️','🌿','💼'];

  const handleAdd = () => {
    const trimmed = name.trim().toUpperCase().replace(/\s+/g, '_');
    if (!trimmed) { toast.error('Please enter a category name.'); return; }
    if (trimmed.length < 2) { toast.error('Category name too short.'); return; }
    onAdd(trimmed, icon);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card)', borderRadius: 14, padding: 28, width: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', border: '1px solid var(--border)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>🏷️</span>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--gray-900)' }}>Add Custom Category</span>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
            color: 'var(--muted)', lineHeight: 1, padding: 4,
          }}>✕</button>
        </div>

        {/* Category name */}
        <div className="fg" style={{ marginBottom: 16 }}>
          <label>Category Name *</label>
          <input
            ref={inputRef}
            type="text"
            placeholder="e.g. Insurance, Parking, Washing…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            maxLength={30}
          />
          {name && (
            <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 4 }}>
              Will be saved as: <strong style={{ color: 'var(--primary)' }}>{name.trim().toUpperCase().replace(/\s+/g, '_')}</strong>
            </div>
          )}
        </div>

        {/* Icon picker */}
        <div className="fg" style={{ marginBottom: 22 }}>
          <label>Icon</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {ICON_OPTIONS.map(ic => (
              <button
                key={ic} type="button"
                onClick={() => setIcon(ic)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: `2px solid ${icon === ic ? 'var(--primary)' : 'var(--border)'}`,
                  background: icon === ic ? 'var(--primary-bg, #eff6ff)' : 'var(--surface)',
                  cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
              >{ic}</button>
            ))}
          </div>
        </div>

        {/* Preview */}
        {name.trim() && (
          <div style={{
            background: 'var(--surface)', borderRadius: 8, padding: '9px 13px',
            marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8,
            border: '1px solid var(--border)',
          }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Preview:</span>
            <span className="badge b-gray" style={{ fontSize: 12 }}>
              {icon} {name.trim().toUpperCase().replace(/\s+/g, '_').replace(/_/g, ' ')}
            </span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button" onClick={handleAdd}
            className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}
          >
            + Add Category
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExpenditurePage() {
  const [items,     setItems]     = useState([]);
  const [trucks,    setTrucks]    = useState([]);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [editing,   setEditing]   = useState(null);
  const [sortCol,   setSortCol]   = useState('date');
  const [sortDir,   setSortDir]   = useState('desc');
  const [page,      setPage]      = useState(1);
  const [showAddCat, setShowAddCat] = useState(false);

  // Categories: defaults + any user-added ones (persisted in localStorage)
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('taurus_exp_categories');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES.map(c => ({ key: c, icon: CAT_ICON[c] || '📦' }));
    } catch { return DEFAULT_CATEGORIES.map(c => ({ key: c, icon: CAT_ICON[c] || '📦' })); }
  });

  const PER_PAGE = 50;
  const formRef  = useRef(null);

  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: { date: todayGH() } });
  const watchAmount   = watch('amount');
  const watchCategory = watch('category');

  // Keep categories in localStorage whenever they change
  useEffect(() => {
    try { localStorage.setItem('taurus_exp_categories', JSON.stringify(categories)); } catch {}
  }, [categories]);

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/finance/expenditure/').then(r => setItems(r.data.results || r.data)).catch(() => {});
    api.get('/trucks/?status=ACTIVE').then(r => setTrucks(r.data.results || r.data)).catch(() => {});
  };

  // Add a new custom category
  const handleAddCategory = (key, icon) => {
    if (categories.find(c => c.key === key)) {
      toast.error(`"${key}" already exists.`); return;
    }
    setCategories(prev => [...prev, { key, icon }]);
    toast.success(`Category "${key.replace(/_/g, ' ')}" added.`);
  };

  const startEdit = (rec) => {
    setEditing(rec.id);
    reset({ ...rec, date: rec.date ? rec.date.split('T')[0] : '', truck: rec.truck || '' });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => { setEditing(null); reset({ date: todayGH() }); };

  const deleteRecord = async (id) => {
    if (!window.confirm('Permanently delete this expenditure record?')) return;
    try {
      await api.delete(`/finance/expenditure/${id}/`);
      toast.success('Expenditure deleted.');
      load();
    } catch { toast.error('Failed to delete.'); }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = { ...data, truck: data.truck || null, amount: parseFloat(data.amount) };
      if (editing) {
        await api.patch(`/finance/expenditure/${editing}/`, payload);
        toast.success('Expenditure updated.');
      } else {
        await api.post('/finance/expenditure/', payload);
        toast.success('Expenditure recorded.');
      }
      reset({ date: todayGH() });
      setEditing(null);
      load();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to save.'); }
    finally { setSaving(false); }
  };

  const [dlExp, setDlExp] = useState('');

  const downloadReport = async (fmt) => {
    setDlExp(fmt);
    try {
      const params = { format: fmt };
      if (filterCat) params.category = filterCat;
      const r = await api.get('/reports/revenue-expenditure/', { params, responseType: 'blob' });
      const ext  = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const url  = URL.createObjectURL(new Blob([r.data], { type: mime }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `taurus_expenditure_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Expenditure report downloaded as ${fmt.toUpperCase()}.`);
    } catch { toast.error('Download failed. Please try again.'); }
    finally { setDlExp(''); }
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const total      = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const byCategory = categories.reduce((acc, c) => {
    acc[c.key] = items.filter(i => i.category === c.key).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
    return acc;
  }, {});
  // Also capture any categories in data not in our list (e.g. old records)
  items.forEach(i => { if (i.category && byCategory[i.category] === undefined) byCategory[i.category] = (byCategory[i.category] || 0) + parseFloat(i.amount || 0); });

  const maxCat       = Math.max(...Object.values(byCategory), 1);
  const thisMonth    = new Date().toISOString().slice(0, 7);
  const thisMonthExp = items.filter(i => i.date?.slice(0, 7) === thisMonth).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const lastMonth    = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
  const lastMonthExp = items.filter(i => i.date?.slice(0, 7) === lastMonth).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const momChange    = lastMonthExp > 0 ? ((thisMonthExp - lastMonthExp) / lastMonthExp * 100).toFixed(1) : null;

  const monthlyData = (() => {
    const map = {};
    items.forEach(i => { const m = i.date ? i.date.slice(0, 7) : null; if (m) map[m] = (map[m] || 0) + parseFloat(i.amount || 0); });
    return Object.entries(map).sort().slice(-6);
  })();
  const maxMonth = Math.max(...monthlyData.map(([, v]) => v), 1);

  const formatMonth = (m) => {
    const [y, mo] = m.split('-');
    return new Date(y, mo - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };

  // Helper: get icon for any category key
  const getIcon = (key) => {
    const found = categories.find(c => c.key === key);
    return found ? found.icon : (CAT_ICON[key] || '📦');
  };
  const getColor = (key) => CAT_COLOR[key] || '#64748b';
  const getBadge = (key) => CAT_BADGE[key] || 'b-gray';

  // ── Filter & Sort ─────────────────────────────────────────────────────────
  const filtered = items
    .filter(i => {
      const matchS = (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
                     (i.reference   || '').toLowerCase().includes(search.toLowerCase());
      return matchS && (!filterCat || i.category === filterCat);
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === 'amount') { va = parseFloat(va); vb = parseFloat(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 :  1;
      if (va > vb) return sortDir === 'asc' ?  1 : -1;
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

  // All unique category keys for the filter dropdown (includes any from records)
  const allCatKeys = [...new Set([...categories.map(c => c.key), ...items.map(i => i.category).filter(Boolean)])];

  return (
    <div>
      {/* Modal */}
      {showAddCat && <AddCategoryModal onAdd={handleAddCategory} onClose={() => setShowAddCat(false)} />}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(155px, 1fr))', marginBottom: 10 }}>
        {[
          { label: 'Total Expenditure', val: fmtGHS(total),        color: 'var(--red)',     sub: `${items.length} records` },
          { label: 'This Month',        val: fmtGHS(thisMonthExp), color: 'var(--primary)', sub: momChange !== null ? `${momChange > 0 ? '▲' : '▼'} ${Math.abs(momChange)}% vs last month` : 'No prior data' },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ color: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ fontSize: 17 }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>
      {/* Dynamic category KPIs — auto-grows when admin adds a new category */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginBottom: 20 }}>
        {[
          // Build full list: all known categories + any that appear in records but aren't in state yet
          ...categories,
          ...items
            .map(i => i.category)
            .filter(Boolean)
            .filter(k => !categories.find(c => c.key === k))
            .filter((k, idx, arr) => arr.indexOf(k) === idx)
            .map(k => ({ key: k, icon: CAT_ICON[k] || '📦' })),
        ].map((c) => {
          const amt   = byCategory[c.key] || 0;
          const pct   = total > 0 ? (amt / total * 100).toFixed(1) : '0';
          const color = CAT_COLOR[c.key] || '#64748b';
          const label = c.key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
          return (
            <div key={c.key} className="kpi" style={{ color }}>
              <div className="kpi-label">{c.icon} {label}</div>
              <div className="kpi-val" style={{ fontSize: 15 }}>{fmtGHS(amt)}</div>
              <div className="kpi-sub">{pct}% of total</div>
            </div>
          );
        })}
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* ── Left: Form + Analytics ── */}
        <div>
          <div className="card mb16" ref={formRef} style={{
            borderTop: `3px solid ${editing ? 'var(--amber)' : 'var(--red)'}`,
          }}>
            <div className="card-title">
              <span className="card-title-ic">{editing ? '✏️' : '💸'}</span>
              {editing ? 'Edit Expenditure' : 'Record Expenditure'}
              {editing && (
                <span className="badge b-amber" style={{ marginLeft: 'auto', fontSize: 10 }}>Editing #{editing}</span>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="fgrid">

                {/* Category row: dropdown + Add button side by side */}
                <div className="fg" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>Category *</span>
                    <button
                      type="button"
                      onClick={() => setShowAddCat(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        background: 'none', border: '1.5px dashed var(--border)',
                        borderRadius: 6, padding: '2px 9px', cursor: 'pointer',
                        fontSize: 11, color: 'var(--primary)', fontWeight: 600,
                        transition: 'all .15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-bg, #eff6ff)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'none'; }}
                    >
                      <span style={{ fontSize: 13 }}>＋</span> Add Category
                    </button>
                  </label>
                  <select {...register('category', { required: true })}>
                    <option value="">— Select Category —</option>
                    {/* Default categories */}
                    <optgroup label="Default">
                      {categories.filter(c => DEFAULT_CATEGORIES.includes(c.key)).map(c => (
                        <option key={c.key} value={c.key}>{c.icon} {c.key.replace(/_/g, ' ')}</option>
                      ))}
                    </optgroup>
                    {/* Custom categories (user-added) */}
                    {categories.filter(c => !DEFAULT_CATEGORIES.includes(c.key)).length > 0 && (
                      <optgroup label="Custom">
                        {categories.filter(c => !DEFAULT_CATEGORIES.includes(c.key)).map(c => (
                          <option key={c.key} value={c.key}>{c.icon} {c.key.replace(/_/g, ' ')}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="fg">
                  <label>Amount (GH₵) *</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00"
                    {...register('amount', { required: true })} />
                </div>
                <div className="fg">
                  <label>Date *</label>
                  <input type="date" {...register('date', { required: true })} />
                </div>
                <div className="fg">
                  <label>Truck (optional)</label>
                  <select {...register('truck')}>
                    <option value="">— Not truck-specific —</option>
                    {trucks.map(t => <option key={t.id} value={t.id}>{t.truck_number}</option>)}
                  </select>
                </div>
                <div className="fg">
                  <label>Reference / Receipt No.</label>
                  <input type="text" placeholder="RCPT-001" {...register('reference')} />
                </div>
              </div>

              <div className="fg mb16">
                <label>Description</label>
                <textarea rows={2} placeholder="Details about this expense…" {...register('description')} />
              </div>

              {/* Live preview */}
              {watchAmount && parseFloat(watchAmount) > 0 && watchCategory && (
                <div style={{
                  background: 'var(--red-bg)', border: '1px solid #fca5a5', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 14 }}>{getIcon(watchCategory)}</span>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>{watchCategory.replace(/_/g, ' ')}:</span>
                  <span style={{ fontWeight: 800, color: 'var(--red)', fontSize: 16 }}>{fmtGHS(watchAmount)}</span>
                </div>
              )}

              <div className="flex gap8">
                <button type="submit" className="btn btn-danger" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? '⏳ Saving…' : editing ? '✓ Update Expenditure' : '+ Record Expenditure'}
                </button>
                {editing && (
                  <button type="button" className="btn btn-ghost" onClick={cancelEdit}>✕ Cancel</button>
                )}
              </div>
            </form>
          </div>

          {/* Spend by Category */}
          <div className="card mb16">
            <div className="card-title"><span className="card-title-ic">📊</span>Spend by Category</div>
            {Object.entries(byCategory)
              .filter(([, v]) => v > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([key, val]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12, alignItems: 'center' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span>{getIcon(key)}</span>
                      <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{key.replace(/_/g, ' ')}</span>
                    </span>
                    <span>
                      <span style={{ color: getColor(key), fontWeight: 700 }}>{fmtGHS(val)}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 10.5, marginLeft: 5 }}>
                        ({total > 0 ? (val / total * 100).toFixed(1) : 0}%)
                      </span>
                    </span>
                  </div>
                  <div className="prog-bar" style={{ height: 8 }}>
                    <div className="prog-fill" style={{ width: `${(val / maxCat) * 100}%`, background: getColor(key) }} />
                  </div>
                </div>
              ))
            }
            {Object.values(byCategory).every(v => v === 0) && (
              <div style={{ color: 'var(--muted)', fontSize: 12.5, textAlign: 'center', padding: '20px 0' }}>
                No expenditure recorded yet
              </div>
            )}
          </div>

          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <div className="card">
              <div className="card-title"><span className="card-title-ic">📉</span>Monthly Spend Trend</div>
              {monthlyData.map(([month, val]) => (
                <div key={month} style={{ marginBottom: 10 }}>
                  <div className="flex justify-between" style={{ fontSize: 11.5, marginBottom: 4 }}>
                    <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{formatMonth(month)}</span>
                    <span style={{ color: 'var(--red)', fontWeight: 700 }}>{fmtGHS(val)}</span>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${(val / maxMonth) * 100}%`, background: 'var(--red)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: History Table ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <span className="card-title-ic">📋</span>
              Expenditure History
              <span className="badge b-red" style={{ marginLeft: 8 }}>{filtered.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(1); }}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--card)' }}
              >
                <option value="">All Categories</option>
                {allCatKeys.map(k => <option key={k} value={k}>{getIcon(k)} {k.replace(/_/g, ' ')}</option>)}
              </select>
              <input
                type="text" placeholder="Search…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 150, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)' }}
              />
              <button className="export-btn excel" onClick={() => downloadReport('excel')} disabled={!!dlExp}>{dlExp === 'excel' ? '⏳ Exporting…' : '📊 Excel'}</button>
              <button className="export-btn pdf"   onClick={() => downloadReport('pdf')} disabled={!!dlExp}>{dlExp === 'pdf' ? '⏳ Exporting…' : '🖨️ PDF'}</button>
            </div>
          </div>

          <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>Date <SortIcon col="date" /></th>
                  <th>Category</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('truck_number')}>Truck <SortIcon col="truck_number" /></th>
                  <th>Description</th>
                  <th>Ref</th>
                  <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('amount')}>Amount <SortIcon col="amount" /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(i => (
                  <tr key={i.id}>
                    <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(i.date)}</td>
                    <td>
                      <span className={`badge ${getBadge(i.category)}`}>
                        {getIcon(i.category)} {i.category?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{i.truck_number || '—'}</td>
                    <td style={{ fontSize: 11, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {i.description || '—'}
                    </td>
                    <td className="mono" style={{ fontSize: 11 }}>{i.reference || '—'}</td>
                    <td className="ced" style={{ color: 'var(--red)', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      – {fmtGHS(i.amount)}
                    </td>
                    <td>
                      <div className="flex gap4">
                        <button className="btn btn-ghost btn-xs" onClick={() => startEdit(i)}>✏️</button>
                        <button className="btn btn-danger btn-xs" onClick={() => deleteRecord(i.id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={7}>
                      <div className="empty-state">
                        <div className="empty-state-icon">💸</div>
                        <div className="empty-state-title">No expenditure records found</div>
                        <div className="empty-state-sub">Try adjusting your search or category filter</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--muted)' }}>
                Showing {Math.min((page - 1) * PER_PAGE + 1, filtered.length)}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length}
                &nbsp;|&nbsp;
                <strong style={{ color: 'var(--red)' }}>Total: {fmtGHS(filtered.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}</strong>
              </span>
              {totalPages > 1 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-ghost btn-xs" disabled={page === 1}          onClick={() => setPage(p => p - 1)}>‹ Prev</button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`btn btn-xs ${p === page ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                  <button className="btn btn-ghost btn-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next ›</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
