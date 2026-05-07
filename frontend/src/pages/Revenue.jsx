// src/pages/Revenue.jsx – Auto-pulls from Trips, Trucks, Purchase, Issue | Taurus ERP
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import api, { fmtGHS, fmtDate, todayGH } from '../utils/api';
import toast from 'react-hot-toast';

// ── Expanded revenue sources (covers all data origins in system) ──────────────
const SOURCES = [
  { value: 'HAULAGE',       label: '🚛 Haulage (Invoice)',       color: 'var(--green)',   badge: 'b-green'  },
  { value: 'TRIP_REVENUE',  label: '🗺️ Trip Revenue',           color: 'var(--teal)',    badge: 'b-blue'   },
  { value: 'TRUCK_RENTAL',  label: '🏗️ Truck Rental',           color: 'var(--primary)', badge: 'b-blue'   },
  { value: 'SPARE_SALE',    label: '⚙️ Spare Parts Sale',        color: '#7c3aed',        badge: 'b-gray'   },
  { value: 'FUEL_REBATE',   label: '⛽ Fuel Rebate',             color: '#d97706',        badge: 'b-amber'  },
  { value: 'COMMISSION',    label: '💼 Commission',              color: '#0369a1',        badge: 'b-blue'   },
  { value: 'INSURANCE',     label: '🛡️ Insurance Recovery',     color: '#059669',        badge: 'b-green'  },
  { value: 'OTHER',         label: '📦 Other Income',            color: 'var(--amber)',   badge: 'b-gray'   },
];

const SRC_MAP = Object.fromEntries(SOURCES.map(s => [s.value, s]));

function MiniSparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const vals  = data.map(([, v]) => v);
  const max   = Math.max(...vals, 1);
  const min   = Math.min(...vals, 0);
  const range = max - min || 1;
  const w = 120, h = 36;
  const pts = vals.map((v, i) => {
    const x = (i / (vals.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x},${y}`;
  });
  const area = `0,${h} ${pts.join(' ')} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/gi, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace(/[^a-z]/gi, '')})`} />
      <polyline points={pts.join(' ')} fill="none" stroke={color} strokeWidth="2"
                strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function InfoPill({ label, value, color = 'var(--muted)' }) {
  if (!value) return null;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 2,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 110,
    }}>
      <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        {label}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
    </div>
  );
}

export default function RevenuePage() {
  const [items,        setItems]        = useState([]);
  const [saving,       setSaving]       = useState(false);
  const [search,       setSearch]       = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [editing,      setEditing]      = useState(null);
  const [sortCol,      setSortCol]      = useState('date');
  const [sortDir,      setSortDir]      = useState('desc');
  const [page,         setPage]         = useState(1);

  // External data for auto-linking
  const [invoices,        setInvoices]        = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [trips,           setTrips]           = useState([]);
  const [selectedTrip,    setSelectedTrip]    = useState(null);
  const [tripsLoading,    setTripsLoading]    = useState(false);
  const [purchases,       setPurchases]       = useState([]);
  const [purchasesLoading,setPurchasesLoading]= useState(false);
  const [selectedPurchase,setSelectedPurchase]= useState(null);

  const PER_PAGE = 50;
  const formRef  = useRef(null);

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { source: 'HAULAGE', date: todayGH() },
  });

  const watchSource = watch('source');
  const watchAmount = watch('amount');

  // ── Load revenue records ────────────────────────────────────────────────
  useEffect(() => { loadRevenue(); }, []);

  const loadRevenue = () => {
    api.get('/finance/revenue/')
      .then(r => setItems(r.data.results || r.data))
      .catch(() => {});
  };

  // ── Load invoices (HAULAGE) ─────────────────────────────────────────────
  useEffect(() => {
    if (watchSource !== 'HAULAGE') { setInvoices([]); setSelectedInvoice(null); return; }
    setInvoicesLoading(true);
    Promise.all([
      api.get('/invoicing/invoices/?status=SENT').catch(() => ({ data: [] })),
      api.get('/invoicing/invoices/?status=PAID').catch(() => ({ data: [] })),
    ]).then(([sent, paid]) => {
      const all    = [...(sent.data.results||sent.data||[]), ...(paid.data.results||paid.data||[])];
      const unique = Array.from(new Map(all.map(i => [i.id, i])).values());
      setInvoices(unique);
      // silently succeed even if backend blocks invoice-linked revenue
    }).catch(() => {
      // backend blocked — show no invoices, allow manual entry
      setInvoices([]);
    }).finally(() => setInvoicesLoading(false));
  }, [watchSource]);

  // ── Load trips (TRIP_REVENUE) ───────────────────────────────────────────
  useEffect(() => {
    if (watchSource !== 'TRIP_REVENUE') { setTrips([]); setSelectedTrip(null); return; }
    setTripsLoading(true);
    api.get('/trips/?status=COMPLETED')
      .then(r => setTrips(r.data.results || r.data))
      .catch(() => toast.error('Could not load trips.'))
      .finally(() => setTripsLoading(false));
  }, [watchSource]);

  // ── Load purchases (SPARE_SALE — resale value) ──────────────────────────
  useEffect(() => {
    if (watchSource !== 'SPARE_SALE') { setPurchases([]); setSelectedPurchase(null); return; }
    setPurchasesLoading(true);
    api.get('/inventory/purchases/?page_size=100')
      .then(r => setPurchases(r.data.results || r.data))
      .catch(() => {})
      .finally(() => setPurchasesLoading(false));
  }, [watchSource]);

  // ── Invoice select handler ──────────────────────────────────────────────
  const handleInvoiceSelect = (e) => {
    const id  = parseInt(e.target.value, 10);
    const inv = invoices.find(i => i.id === id) || null;
    setSelectedInvoice(inv);
    if (inv) {
      setValue('amount',      inv.total_amount);
      setValue('reference',   inv.invoice_number);
      setValue('description', `Payment received – ${inv.invoice_number} (${inv.client_name})`);
    } else {
      setValue('amount', ''); setValue('reference', ''); setValue('description', '');
    }
  };

  // ── Trip select handler ─────────────────────────────────────────────────
  const handleTripSelect = (e) => {
    const id   = parseInt(e.target.value, 10);
    const trip = trips.find(t => t.id === id) || null;
    setSelectedTrip(trip);
    if (trip) {
      const rev = parseFloat(trip.trip_revenue || 0);
      setValue('amount',      rev);
      setValue('reference',   trip.waybill_no);
      setValue('description', `Trip revenue – ${trip.waybill_no} | ${trip.origin} → ${trip.destination} | ${trip.delivered_qty || trip.loaded_qty}T ${trip.material_type}`);
    } else {
      setValue('amount', ''); setValue('reference', ''); setValue('description', '');
    }
  };

  // ── Purchase select handler (for spare sale revenue) ────────────────────
  const handlePurchaseSelect = (e) => {
    const id  = parseInt(e.target.value, 10);
    const pur = purchases.find(p => p.id === id) || null;
    setSelectedPurchase(pur);
    if (pur) {
      setValue('reference',   pur.invoice_number || `PUR-${pur.id}`);
      setValue('description', `Spare parts sale – ${pur.item_name || 'Item'} x${pur.quantity} from ${pur.supplier_name}`);
      // Amount left blank for user to enter sell price
    }
  };

  // ── Edit / delete / cancel ──────────────────────────────────────────────
  const startEdit = (rec) => {
    setEditing(rec.id);
    setSelectedInvoice(null); setSelectedTrip(null); setSelectedPurchase(null);
    reset({
      source:      rec.source,
      amount:      rec.amount,
      date:        rec.date ? rec.date.split('T')[0] : '',
      reference:   rec.reference,
      description: rec.description,
    });
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditing(null);
    setSelectedInvoice(null); setSelectedTrip(null); setSelectedPurchase(null);
    reset({ source: 'HAULAGE', date: todayGH() });
  };

  const deleteRecord = async (id) => {
    if (!window.confirm('Permanently delete this revenue record?')) return;
    try {
      await api.delete(`/finance/revenue/${id}/`);
      toast.success('Revenue record deleted.');
      loadRevenue();
    } catch { toast.error('Failed to delete.'); }
  };

  // ── Submit ──────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    if (watchSource === 'HAULAGE' && !editing && !selectedInvoice && invoices.length > 0) {
      toast.error('Please select an invoice to link this haulage revenue.');
      return;
    }
    if (watchSource === 'TRIP_REVENUE' && !editing && !selectedTrip) {
      toast.error('Please select a completed trip.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...data,
        amount: parseFloat(data.amount),
        source: data.source,
        ...(watchSource === 'HAULAGE' && selectedInvoice
          ? { invoice: selectedInvoice.id, trip: selectedInvoice.trip || null }
          : {}),
        ...(watchSource === 'TRIP_REVENUE' && selectedTrip
          ? { trip: selectedTrip.id }
          : {}),
      };

      if (editing) {
        await api.patch(`/finance/revenue/${editing}/`, payload);
        toast.success('Revenue record updated.');
      } else {
        await api.post('/finance/revenue/', payload);
        toast.success('Revenue recorded successfully.');
      }

      reset({ source: 'HAULAGE', date: todayGH() });
      setEditing(null);
      setSelectedInvoice(null); setSelectedTrip(null); setSelectedPurchase(null);
      loadRevenue();
    } catch (e) {
      toast.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  // ── Export ──────────────────────────────────────────────────────────────
  const [dlRev, setDlRev] = useState('');

  const downloadReport = async (fmt) => {
    setDlRev(fmt);
    try {
      const params = { format: fmt };
      if (filterSource) params.source = filterSource;
      const r = await api.get('/reports/revenue-expenditure/', { params, responseType: 'blob' });
      const ext  = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const url  = URL.createObjectURL(new Blob([r.data], { type: mime }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `taurus_revenue_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Revenue report downloaded as ${fmt.toUpperCase()}.`);
    } catch { toast.error('Download failed.'); }
    finally { setDlRev(''); }
  };

  // ── Stats ───────────────────────────────────────────────────────────────
  const total        = items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const haulage      = items.filter(i => i.source === 'HAULAGE').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const tripRev      = items.filter(i => i.source === 'TRIP_REVENUE').reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  // "Others" = Truck Rental + Spare Parts + Fuel Rebate + Commission + Insurance + Other
  const OTHER_SOURCES = ['TRUCK_RENTAL','SPARE_SALE','FUEL_REBATE','COMMISSION','INSURANCE','OTHER'];
  const other        = items.filter(i => OTHER_SOURCES.includes(i.source)).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const otherCount   = items.filter(i => OTHER_SOURCES.includes(i.source)).length;

  const thisMonth    = new Date().toISOString().slice(0, 7);
  const thisMonthRev = items.filter(i => i.date?.slice(0, 7) === thisMonth).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const lastMonth    = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7);
  const lastMonthRev = items.filter(i => i.date?.slice(0, 7) === lastMonth).reduce((s, i) => s + parseFloat(i.amount || 0), 0);
  const momChange    = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev * 100).toFixed(1) : null;

  const monthlyData = (() => {
    const map = {};
    items.forEach(i => {
      const m = i.date ? i.date.slice(0, 7) : null;
      if (m) map[m] = (map[m] || 0) + parseFloat(i.amount || 0);
    });
    return Object.entries(map).sort().slice(-8);
  })();
  const maxMonth = Math.max(...monthlyData.map(([, v]) => v), 1);

  // By-source breakdown
  const sourceBreakdown = SOURCES.map(s => ({
    ...s,
    total: items.filter(i => i.source === s.value).reduce((sum, i) => sum + parseFloat(i.amount || 0), 0),
    count: items.filter(i => i.source === s.value).length,
  })).filter(s => s.total > 0);

  // ── Filter & sort ───────────────────────────────────────────────────────
  const filtered = items
    .filter(i => {
      const matchSearch = (i.description || '').toLowerCase().includes(search.toLowerCase()) ||
                          (i.reference   || '').toLowerCase().includes(search.toLowerCase());
      const matchSource = !filterSource || i.source === filterSource;
      return matchSearch && matchSource;
    })
    .sort((a, b) => {
      let va = a[sortCol], vb = b[sortCol];
      if (sortCol === 'amount') { va = parseFloat(va); vb = parseFloat(vb); }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
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

  const formatMonth = (m) => {
    const [y, mo] = m.split('-');
    return new Date(y, mo - 1).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  };

  const srcInfo = SRC_MAP[watchSource] || SOURCES[0];

  return (
    <div>
      {/* ── KPI Cards ────────────────────────────────────────────────────── */}
      {/* Row 1: Summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', marginBottom: 10 }}>
        {[
          { label: 'Total Revenue',   val: fmtGHS(total),        color: 'var(--green)',   sub: `${items.length} records`, spark: monthlyData, sparkColor: '#0e9f6e' },
          { label: 'This Month',      val: fmtGHS(thisMonthRev), color: 'var(--primary)', sub: momChange !== null ? `${momChange > 0 ? '▲' : '▼'} ${Math.abs(momChange)}% vs last month` : 'No prior month data', sparkColor: '#1a56db' },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ color: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ fontSize: 18, marginBottom: 2 }}>{k.val}</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
              <div className="kpi-sub" style={{ margin: 0 }}>{k.sub}</div>
              {k.spark && <MiniSparkline data={k.spark} color={k.sparkColor} />}
            </div>
          </div>
        ))}
      </div>
      {/* Row 2: 3-column revenue breakdown — Haulage | Trip | Others */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        {[
          {
            label: 'Haulage Revenue',
            val: fmtGHS(haulage),
            color: 'var(--teal)',
            sub: `${(total > 0 ? haulage / total * 100 : 0).toFixed(1)}% of total · ${items.filter(i => i.source === 'HAULAGE').length} records`,
            sparkColor: '#0694a2',
          },
          {
            label: 'Trip Revenue',
            val: fmtGHS(tripRev),
            color: 'var(--amber)',
            sub: `${(total > 0 ? tripRev / total * 100 : 0).toFixed(1)}% of total · ${items.filter(i => i.source === 'TRIP_REVENUE').length} trips`,
            sparkColor: '#d97706',
          },
          {
            label: 'Others',
            val: fmtGHS(other),
            color: '#7c3aed',
            sub: `Rental · Spares · Rebate · Commission · Insurance · Other · ${otherCount} records`,
            sparkColor: '#7c3aed',
          },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ color: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ fontSize: 18, marginBottom: 2 }}>{k.val}</div>
            <div className="kpi-sub" style={{ margin: 0, fontSize: 10 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="g2" style={{ alignItems: 'start' }}>
        {/* ── Left Column ── */}
        <div>
          {/* ── Form Card ── */}
          <div className="card mb16" ref={formRef} style={{
            borderTop: `3px solid ${editing ? 'var(--amber)' : srcInfo.color}`,
          }}>
            <div className="card-title">
              <span className="card-title-ic">{editing ? '✏️' : srcInfo.label.split(' ')[0]}</span>
              {editing ? 'Edit Revenue Record' : 'Record Revenue'}
              {editing && (
                <span className="badge b-amber" style={{ marginLeft: 'auto', fontSize: 10 }}>Editing #{editing}</span>
              )}
            </div>

            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Source + Date */}
              <div className="fgrid" style={{ marginBottom: 14 }}>
                <div className="fg">
                  <label>Revenue Source *</label>
                  <select {...register('source', { required: true })}>
                    {SOURCES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
                    {watchSource === 'HAULAGE'      && 'Links to an invoice — amount auto-filled'}
                    {watchSource === 'TRIP_REVENUE' && 'Links to a completed trip — revenue auto-calculated'}
                    {watchSource === 'TRUCK_RENTAL' && 'Revenue from renting out a truck'}
                    {watchSource === 'SPARE_SALE'   && 'Revenue from reselling spare parts'}
                    {watchSource === 'FUEL_REBATE'  && 'Fuel cost rebate or refund received'}
                    {watchSource === 'COMMISSION'   && 'Commission income from third parties'}
                    {watchSource === 'INSURANCE'    && 'Insurance claim recovery'}
                    {watchSource === 'OTHER'        && 'Any other income not listed above'}
                  </div>
                </div>
                <div className="fg">
                  <label>Date *</label>
                  <input type="date" {...register('date', { required: true })} />
                </div>
              </div>

              {/* ── HAULAGE: Invoice selector ── */}
              {watchSource === 'HAULAGE' && (
                <>
                  <div className="fg mb14">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Invoice
                      {invoicesLoading && <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>loading…</span>}
                      {!invoicesLoading && invoices.length === 0 && (
                        <span style={{ fontSize: 10, color: 'var(--amber)', fontStyle: 'italic' }}>No invoices found — enter amount manually</span>
                      )}
                    </label>
                    {invoices.length > 0 ? (
                      <select onChange={handleInvoiceSelect} defaultValue="" style={{ background: selectedInvoice ? 'var(--green-bg)' : undefined }}>
                        <option value="" disabled>— Select invoice —</option>
                        {invoices.map(inv => (
                          <option key={inv.id} value={inv.id}>
                            {inv.invoice_number} · {inv.client_name} · {fmtGHS(inv.total_amount)} {inv.status === 'PAID' ? '✓ PAID' : '· SENT'}
                          </option>
                        ))}
                      </select>
                    ) : !invoicesLoading && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface)', borderRadius: 7, padding: '8px 12px', border: '1px dashed var(--border)' }}>
                        Invoice list unavailable — fill in amount and reference below.
                      </div>
                    )}
                  </div>
                  {selectedInvoice && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <InfoPill label="Client"        value={selectedInvoice.client_name} />
                      <InfoPill label="Invoice Total"  value={fmtGHS(selectedInvoice.total_amount)} color="var(--green)" />
                      <InfoPill label="Waybill"        value={selectedInvoice.trip_waybill || '—'} />
                    </div>
                  )}
                  <div className="fgrid mb14">
                    <div className="fg">
                      <label>Amount (GH₵)</label>
                      <input type="number" step="0.01"
                        readOnly={!!selectedInvoice}
                        placeholder={selectedInvoice ? 'Auto-filled from invoice' : '0.00'}
                        style={selectedInvoice ? { background: 'var(--surface)', color: 'var(--green)', fontWeight: 700, cursor: 'not-allowed' } : {}}
                        {...register('amount', { required: true })} />
                    </div>
                    <div className="fg">
                      <label>Reference</label>
                      <input type="text"
                        readOnly={!!selectedInvoice}
                        placeholder={selectedInvoice ? 'Auto-filled' : 'e.g. INV-001'}
                        style={selectedInvoice ? { background: 'var(--surface)', cursor: 'not-allowed' } : {}}
                        {...register('reference')} />
                    </div>
                  </div>
                  <div className="fg mb14">
                    <label>Description</label>
                    <textarea rows={2} placeholder="Auto-filled — add notes if needed…" {...register('description')} />
                  </div>
                </>
              )}

              {/* ── TRIP_REVENUE: Trip selector ── */}
              {watchSource === 'TRIP_REVENUE' && (
                <>
                  <div className="fg mb14">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Completed Trip *
                      {tripsLoading && <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>loading…</span>}
                    </label>
                    <select onChange={handleTripSelect} defaultValue="" style={{ background: selectedTrip ? 'var(--green-bg)' : undefined }}>
                      <option value="" disabled>— Select completed trip —</option>
                      {trips.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.waybill_no} · {t.truck_number} · {t.origin} → {t.destination} · {t.delivered_qty || t.loaded_qty}T · {fmtGHS(t.trip_revenue || 0)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedTrip && (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <InfoPill label="Truck"     value={selectedTrip.truck_number} />
                      <InfoPill label="Driver"    value={selectedTrip.driver_name} />
                      <InfoPill label="Delivered" value={`${selectedTrip.delivered_qty || selectedTrip.loaded_qty}T`} />
                      <InfoPill label="Revenue"   value={fmtGHS(selectedTrip.trip_revenue || 0)} color="var(--green)" />
                    </div>
                  )}
                  <div className="fgrid mb14">
                    <div className="fg">
                      <label>Amount (GH₵) *</label>
                      <input type="number" step="0.01"
                        style={{ color: selectedTrip ? 'var(--green)' : undefined, fontWeight: selectedTrip ? 700 : 400 }}
                        placeholder="Auto-filled from trip" {...register('amount', { required: true })} />
                    </div>
                    <div className="fg">
                      <label>Reference</label>
                      <input type="text" placeholder="Auto-filled" {...register('reference')} />
                    </div>
                  </div>
                  <div className="fg mb14">
                    <label>Description</label>
                    <textarea rows={2} {...register('description')} />
                  </div>
                </>
              )}

              {/* ── SPARE_SALE: Purchase selector ── */}
              {watchSource === 'SPARE_SALE' && (
                <>
                  <div className="fg mb14">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Link to Purchase (optional)
                      {purchasesLoading && <span style={{ fontSize: 10, color: 'var(--muted)', fontStyle: 'italic' }}>loading…</span>}
                    </label>
                    <select onChange={handlePurchaseSelect} defaultValue="">
                      <option value="">— Select purchase (optional) —</option>
                      {purchases.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.item_name || 'Item'} · {p.quantity} units · {p.supplier_name} · {fmtGHS(p.final_amount || 0)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="fgrid mb14">
                    <div className="fg">
                      <label>Sale Amount (GH₵) *</label>
                      <input type="number" step="0.01" min="0" placeholder="Enter sale price" {...register('amount', { required: true })} />
                    </div>
                    <div className="fg">
                      <label>Reference / Invoice No.</label>
                      <input type="text" placeholder="e.g. SALE-001" {...register('reference')} />
                    </div>
                  </div>
                  <div className="fg mb14">
                    <label>Description *</label>
                    <textarea rows={2} placeholder="Describe the spare parts sold…" {...register('description', { required: true })} />
                  </div>
                </>
              )}

              {/* ── All other sources: fully manual ── */}
              {!['HAULAGE','TRIP_REVENUE','SPARE_SALE'].includes(watchSource) && (
                <>
                  <div className="fgrid mb14">
                    <div className="fg">
                      <label>Amount (GH₵) *</label>
                      <input type="number" step="0.01" min="0" placeholder="0.00" {...register('amount', { required: true })} />
                    </div>
                    <div className="fg">
                      <label>Reference / Invoice No.</label>
                      <input type="text" placeholder="e.g. RNT-001, CMM-007" {...register('reference')} />
                    </div>
                  </div>
                  <div className="fg mb14">
                    <label>Description *</label>
                    <textarea rows={3}
                      placeholder={
                        watchSource === 'TRUCK_RENTAL' ? 'e.g. Truck rental – TT-003 to XYZ Company for 5 days…' :
                        watchSource === 'FUEL_REBATE'  ? 'e.g. Fuel rebate from supplier for May 2026…' :
                        watchSource === 'COMMISSION'   ? 'e.g. 5% commission on Buildco contract…' :
                        watchSource === 'INSURANCE'    ? 'e.g. Insurance recovery – accident claim TT-001…' :
                        'Describe the source of this income…'
                      }
                      {...register('description', { required: true })} />
                  </div>
                </>
              )}

              {/* Amount preview */}
              {watchAmount && parseFloat(watchAmount) > 0 && (
                <div style={{
                  background: 'var(--green-bg)', border: '1px solid #6ee7b7', borderRadius: 8,
                  padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>Recording:</span>
                  <span style={{ fontWeight: 800, color: 'var(--green)', fontSize: 16 }}>{fmtGHS(watchAmount)}</span>
                  <span className={`badge ${srcInfo.badge}`} style={{ marginLeft: 'auto' }}>{watchSource}</span>
                </div>
              )}

              {/* Submit */}
              <div className="flex gap8">
                <button type="submit" className="btn btn-success" disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                  {saving ? '⏳ Saving…' : editing ? '✓ Update Revenue' : '+ Record Revenue'}
                </button>
                {editing && <button type="button" className="btn btn-ghost" onClick={cancelEdit}>✕ Cancel</button>}
              </div>
            </form>
          </div>

          {/* Monthly Trend */}
          {monthlyData.length > 0 && (
            <div className="card mb16">
              <div className="card-title"><span className="card-title-ic">📈</span>Monthly Revenue Trend</div>
              {monthlyData.map(([month, val]) => (
                <div key={month} style={{ marginBottom: 12 }}>
                  <div className="flex justify-between" style={{ fontSize: 11.5, marginBottom: 5 }}>
                    <span style={{ color: 'var(--gray-700)', fontWeight: 600 }}>{formatMonth(month)}</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 10.5 }}>
                        {total > 0 ? `${(val / total * 100).toFixed(1)}%` : '—'}
                      </span>
                      <span style={{ color: 'var(--green)', fontWeight: 700 }}>{fmtGHS(val)}</span>
                    </div>
                  </div>
                  <div className="prog-bar">
                    <div className="prog-fill" style={{ width: `${(val / maxMonth) * 100}%`, background: 'var(--green)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Source Breakdown */}
          <div className="card">
            <div className="card-title"><span className="card-title-ic">🥧</span>Revenue by Source</div>
            {sourceBreakdown.length === 0 && (
              <div style={{ color: 'var(--muted)', fontSize: 12, padding: '12px 0' }}>No data yet</div>
            )}
            {sourceBreakdown.map(s => (
              <div key={s.value} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: 'var(--gray-700)' }}>{s.label}</span>
                  <span style={{ color: s.color, fontWeight: 700 }}>
                    {fmtGHS(s.total)}{' '}
                    <span style={{ color: 'var(--muted)', fontWeight: 500, fontSize: 10.5 }}>
                      ({total > 0 ? (s.total / total * 100).toFixed(1) : 0}%)
                    </span>
                  </span>
                </div>
                <div className="prog-bar" style={{ height: 8 }}>
                  <div className="prog-fill" style={{ width: `${total > 0 ? s.total / total * 100 : 0}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: History Table ── */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <span className="card-title-ic">📋</span>
              Revenue History
              <span className="badge b-blue" style={{ marginLeft: 8 }}>{filtered.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={filterSource} onChange={e => { setFilterSource(e.target.value); setPage(1); }}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--card)' }}
              >
                <option value="">All Sources</option>
                {SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
              <input
                type="text" placeholder="Search description / ref…" value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                style={{ width: 180, padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)' }}
              />
              <button className="export-btn excel" onClick={() => downloadReport('excel')} disabled={!!dlRev}>{dlRev === 'excel' ? '⏳ Exporting…' : '📊 Excel'}</button>
              <button className="export-btn pdf"   onClick={() => downloadReport('pdf')} disabled={!!dlRev}>{dlRev === 'pdf' ? '⏳ Exporting…' : '🖨️ PDF'}</button>
            </div>
          </div>

          <div className="tbl-wrap" style={{ maxHeight: 560, overflowY: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('date')}>Date <SortIcon col="date" /></th>
                  <th>Source</th>
                  <th>Description</th>
                  <th style={{ cursor: 'pointer' }} onClick={() => toggleSort('reference')}>Reference <SortIcon col="reference" /></th>
                  <th style={{ cursor: 'pointer', textAlign: 'right' }} onClick={() => toggleSort('amount')}>Amount <SortIcon col="amount" /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(i => {
                  const src = SRC_MAP[i.source];
                  return (
                    <tr key={i.id}>
                      <td style={{ fontSize: 11, whiteSpace: 'nowrap' }}>{fmtDate(i.date)}</td>
                      <td>
                        <span className={`badge ${src?.badge || 'b-gray'}`} style={{ fontSize: 9.5 }}>
                          {src?.label || i.source}
                        </span>
                      </td>
                      <td style={{ fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i.description || '—'}
                      </td>
                      <td className="mono" style={{ fontSize: 11 }}>{i.reference || '—'}</td>
                      <td className="ced" style={{ color: 'var(--green)', fontWeight: 700, textAlign: 'right', whiteSpace: 'nowrap' }}>
                        + {fmtGHS(i.amount)}
                      </td>
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(i)}>✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deleteRecord(i.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-state-icon">💰</div>
                        <div className="empty-state-title">No revenue records found</div>
                        <div className="empty-state-sub">Try adjusting your search or filter</div>
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
                <strong style={{ color: 'var(--green)' }}>
                  Total: {fmtGHS(filtered.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                </strong>
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
        </div>
      </div>
    </div>
  );
}
