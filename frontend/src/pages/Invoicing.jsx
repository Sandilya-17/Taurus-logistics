// src/pages/Invoicing.jsx – Enhanced with Quantity in Units, Auto-Revenue Push, Trip/Truck Data
import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import api, { fmtGHS } from '../utils/api';
import toast from 'react-hot-toast';

// ── Unit options for invoice lines ───────────────────────────────────────────
const UNIT_OPTIONS = [
  { value: 'TONS',    label: 'Tons (T)'        },
  { value: 'KG',      label: 'Kilograms (KG)'  },
  { value: 'LITRES',  label: 'Litres (L)'      },
  { value: 'BAGS',    label: 'Bags'             },
  { value: 'TRIPS',   label: 'Trips'            },
  { value: 'HOURS',   label: 'Hours (hrs)'      },
  { value: 'DAYS',    label: 'Days'             },
  { value: 'METRES',  label: 'Metres (m)'       },
  { value: 'UNITS',   label: 'Units'            },
  { value: 'LOADS',   label: 'Loads'            },
  { value: 'PIECES',  label: 'Pieces (pcs)'     },
  { value: 'OTHER',   label: 'Other'            },
];

const STATUS_BADGE = { DRAFT: 'b-gray', SENT: 'b-blue', PAID: 'b-green', OVERDUE: 'b-red' };

// ── Helper: format quantity with unit ────────────────────────────────────────
const fmtQty = (qty, unit) => {
  const q = parseFloat(qty || 0);
  const u = UNIT_OPTIONS.find(o => o.value === unit)?.label || unit || '';
  return `${q.toLocaleString('en-GH', { maximumFractionDigits: 3 })} ${u}`.trim();
};

export default function InvoicingPage() {
  const [trips,      setTrips]      = useState([]);
  const [trucks,     setTrucks]     = useState([]);
  const [invoices,   setInvoices]   = useState([]);
  const [totals,     setTotals]     = useState({ subtotal: 0, vat_amount: 0, total_amount: 0 });
  const [saving,     setSaving]     = useState(false);
  const [tab,        setTab]        = useState('new');
  const [statusFilter, setStatusFilter] = useState('');

  const { register, control, handleSubmit, watch, reset, setValue } = useForm({
    defaultValues: {
      invoice_date:   new Date().toISOString().split('T')[0],
      vat_applicable: false,
      vat_percentage: 15,
      lines: [{ description: '', quantity: '', unit: 'TONS', unit_price: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lines' });
  const watchedLines   = watch('lines');
  const watchedVAT     = watch('vat_applicable');
  const watchedVATPct  = watch('vat_percentage');

  // ── Load data on mount ────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/trips/?status=COMPLETED').then(r => setTrips(r.data.results || r.data));
    api.get('/trucks/').then(r => setTrucks(r.data.results || r.data));
    loadInvoices();
  }, []);

  // ── Live total calculation ────────────────────────────────────────────────
  useEffect(() => {
    const subtotal = (watchedLines || []).reduce((sum, l) =>
      sum + (parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)), 0);
    const vat   = watchedVAT ? subtotal * (parseFloat(watchedVATPct || 0) / 100) : 0;
    setTotals({ subtotal, vat_amount: vat, total_amount: subtotal + vat });
  }, [watchedLines, watchedVAT, watchedVATPct]);

  // ── Auto-fill from selected trip ──────────────────────────────────────────
  const onTripSelect = (e) => {
    const trip = trips.find(t => t.id === parseInt(e.target.value));
    if (!trip) return;
    const qty  = trip.delivered_qty || trip.loaded_qty || '';
    const desc = `Haulage Services – ${trip.origin} to ${trip.destination} (${trip.waybill_no}) | ${trip.material_type}`;
    setValue('lines.0.description', desc);
    setValue('lines.0.quantity',    qty);
    setValue('lines.0.unit',        'TONS');
    setValue('lines.0.unit_price',  trip.rate_per_ton || '');
    // Also set client if truck has an owner field (best-effort)
    const truck = trucks.find(t => t.id === trip.truck_id || t.truck_number === trip.truck_number);
    if (truck?.owner_name) setValue('client_name', truck.owner_name);
    toast('✅ Line auto-filled from trip', { icon: '🚛' });
  };

  const loadInvoices = () => {
    api.get('/invoicing/').then(r => setInvoices(r.data.results || r.data));
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const inv = await api.post('/invoicing/', {
        client_name:    data.client_name,
        client_address: data.client_address || '',
        client_phone:   data.client_phone   || '',
        invoice_date:   data.invoice_date,
        due_date:       data.due_date        || null,
        trip_id:        data.trip_id         || null,
        vat_applicable: data.vat_applicable,
        vat_percentage: parseFloat(data.vat_percentage || 15),
        notes:          data.notes || '',
      });

      // Save line items (includes unit)
      await Promise.all(data.lines.map(line =>
        api.post('/invoicing/lines/', {
          invoice_id:  inv.data.id,
          description: `[${line.unit || 'UNITS'}] ${line.description}`,
          quantity:    parseFloat(line.quantity),
          unit_price:  parseFloat(line.unit_price),
          unit:        line.unit || 'UNITS',
        })
      ));

      // Auto-push to Revenue if total > 0 (as DRAFT/SENT revenue to be confirmed)
      toast.success(`Invoice ${inv.data.invoice_number} created — mark as PAID to auto-record revenue.`);

      reset({
        invoice_date: new Date().toISOString().split('T')[0],
        vat_applicable: false, vat_percentage: 15,
        lines: [{ description: '', quantity: '', unit: 'TONS', unit_price: '' }],
      });
      setTotals({ subtotal: 0, vat_amount: 0, total_amount: 0 });
      loadInvoices();
      setTab('list');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to create invoice.');
    } finally {
      setSaving(false);
    }
  };

  // ── Mark invoice as PAID (triggers auto Revenue in backend) ──────────────
  const markPaid = async (inv) => {
    if (!window.confirm(`Mark ${inv.invoice_number} as PAID? This will auto-record revenue of ${fmtGHS(inv.total_amount)}.`)) return;
    try {
      await api.patch(`/invoicing/${inv.id}/`, { status: 'PAID' });
      toast.success(`✅ ${inv.invoice_number} marked PAID — revenue auto-recorded.`);
      loadInvoices();
    } catch { toast.error('Failed to update status.'); }
  };

  const markSent = async (inv) => {
    try {
      await api.patch(`/invoicing/${inv.id}/`, { status: 'SENT' });
      toast.success(`Invoice ${inv.invoice_number} marked as SENT.`);
      loadInvoices();
    } catch { toast.error('Failed to update status.'); }
  };

  const downloadPDF = async (id) => {
    try {
      const resp = await api.get(`/invoicing/${id}/pdf/`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `invoice_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice PDF downloaded.');
    } catch { toast.error('PDF download failed.'); }
  };

  const downloadExcel = async (id, number) => {
    try {
      const resp = await api.get(`/reports/invoices/?invoice_id=${id}&format=excel`, { responseType: 'blob' });
      const url  = URL.createObjectURL(new Blob([resp.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const a    = document.createElement('a');
      a.href = url;
      a.download = `${number}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice Excel downloaded.');
    } catch { toast.error('Export failed.'); }
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalValue  = invoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const paidValue   = invoices.filter(i => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);
  const draftCount  = invoices.filter(i => i.status === 'DRAFT').length;
  const overdueCount= invoices.filter(i => i.status === 'OVERDUE').length;

  const filteredInvoices = statusFilter
    ? invoices.filter(i => i.status === statusFilter)
    : invoices;

  return (
    <div>
      {/* ── KPI Summary ─────────────────────────────────────────────────── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', marginBottom: 20 }}>
        {[
          { label: 'Total Invoiced',  val: fmtGHS(totalValue),         color: 'var(--primary)', sub: `${invoices.length} invoices` },
          { label: 'Revenue Received',val: fmtGHS(paidValue),           color: 'var(--green)',   sub: `${invoices.filter(i=>i.status==='PAID').length} paid` },
          { label: 'Draft / Pending', val: draftCount,                  color: 'var(--amber)',   sub: 'awaiting send' },
          { label: 'Overdue',         val: overdueCount,                color: 'var(--red)',     sub: 'action needed' },
        ].map((k, i) => (
          <div key={i} className="kpi" style={{ color: k.color }}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-val" style={{ fontSize: 18 }}>{k.val}</div>
            <div className="kpi-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────── */}
      <div className="tabs">
        {['new', 'list'].map(t => (
          <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'new' ? '+ New Invoice' : `All Invoices (${invoices.length})`}
          </div>
        ))}
      </div>

      {/* ══ NEW INVOICE FORM ══════════════════════════════════════════════ */}
      {tab === 'new' && (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="g2">
            {/* ── Left: Invoice Builder ── */}
            <div className="card">
              <div className="card-title"><span className="card-title-ic">🧾</span>Invoice Builder</div>

              <div className="sec-div">Client & Date</div>
              <div className="fgrid">
                <div className="fg">
                  <label>Invoice Date *</label>
                  <input type="date" {...register('invoice_date', { required: true })} />
                </div>
                <div className="fg">
                  <label>Due Date</label>
                  <input type="date" {...register('due_date')} />
                </div>
                <div className="fg">
                  <label>Client Name *</label>
                  <input type="text" placeholder="Client / Company name" {...register('client_name', { required: true })} />
                </div>
                <div className="fg">
                  <label>Client Phone</label>
                  <input type="text" placeholder="+233 XX XXX XXXX" {...register('client_phone')} />
                </div>
                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <label>Client Address</label>
                  <input type="text" placeholder="Address" {...register('client_address')} />
                </div>

                {/* Trip auto-fill */}
                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <label>
                    🚛 Link to Completed Trip
                    <span style={{ fontSize: 10, color: 'var(--muted)', marginLeft: 6, fontWeight: 400 }}>
                      — auto-fills quantity, unit & rate
                    </span>
                  </label>
                  <select {...register('trip_id')} onChange={onTripSelect}>
                    <option value="">— Select Completed Trip —</option>
                    {trips.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.waybill_no} · {t.truck_number} · {t.origin} → {t.destination} ·{' '}
                        {t.material_type} · {t.delivered_qty || t.loaded_qty}T
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── Line Items ── */}
              <div className="sec-div">
                Line Items — Quantity in Units, Totals Auto-Calculated
              </div>

              {/* Line item header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '3fr 80px 100px 1.1fr 1.1fr auto',
                gap: 6, padding: '0 4px', marginBottom: 4,
              }}>
                {['Description', 'Qty', 'Unit', 'Rate (GH₵)', 'Amount (GH₵)', ''].map((h, i) => (
                  <div key={i} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    {h}
                  </div>
                ))}
              </div>

              {fields.map((field, idx) => {
                const lineAmt = parseFloat(watchedLines?.[idx]?.quantity || 0) * parseFloat(watchedLines?.[idx]?.unit_price || 0);
                const unitLabel = UNIT_OPTIONS.find(o => o.value === watchedLines?.[idx]?.unit)?.label?.split(' ')[0] || '';
                return (
                  <div key={field.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 80px 100px 1.1fr 1.1fr auto',
                    gap: 6, marginBottom: 8, alignItems: 'flex-end',
                    background: idx % 2 === 0 ? 'transparent' : 'var(--surface)',
                    borderRadius: 6, padding: '4px 4px',
                  }}>
                    {/* Description */}
                    <div className="fg" style={{ margin: 0 }}>
                      <input
                        type="text"
                        placeholder={`Line ${idx + 1} description`}
                        style={{ fontSize: 12 }}
                        {...register(`lines.${idx}.description`, { required: true })}
                      />
                    </div>

                    {/* Quantity */}
                    <div className="fg" style={{ margin: 0 }}>
                      <input
                        type="number" step="0.001" placeholder="0"
                        style={{ fontSize: 12 }}
                        {...register(`lines.${idx}.quantity`, { required: true })}
                      />
                    </div>

                    {/* Unit selector */}
                    <div className="fg" style={{ margin: 0 }}>
                      <select style={{ fontSize: 11, padding: '7px 6px' }} {...register(`lines.${idx}.unit`)}>
                        {UNIT_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Unit Rate */}
                    <div className="fg" style={{ margin: 0 }}>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        style={{ fontSize: 12 }}
                        {...register(`lines.${idx}.unit_price`, { required: true })}
                      />
                    </div>

                    {/* Auto-calculated amount */}
                    <div className="fg" style={{ margin: 0 }}>
                      <div className="calc-box" style={{ fontSize: 12, background: 'var(--green-bg)', color: 'var(--green)', fontWeight: 700 }}>
                        {fmtGHS(lineAmt)}
                      </div>
                    </div>

                    {/* Remove button */}
                    <div>
                      {fields.length > 1 && (
                        <button type="button" className="btn btn-danger btn-xs" onClick={() => remove(idx)}>✕</button>
                      )}
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                className="btn btn-ghost btn-sm mt8"
                onClick={() => append({ description: '', quantity: '', unit: 'TONS', unit_price: '' })}
              >
                + Add Line
              </button>

              {/* ── VAT & Totals ── */}
              <div className="sec-div mt12">VAT & Totals</div>
              <div className="fgrid">
                <div className="fg">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" style={{ width: 'auto' }} {...register('vat_applicable')} />
                    Apply VAT
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                    <input type="number" step="0.1" min="0" {...register('vat_percentage')} style={{ width: 80 }} />
                    <span style={{ fontSize: 13 }}>%</span>
                  </div>
                </div>
                <div className="fg">
                  <label>Notes / Payment Terms</label>
                  <input type="text" placeholder="e.g. Payment within 30 days…" {...register('notes')} />
                </div>
              </div>

              {/* Totals box */}
              <div className="vat-breakdown" style={{ marginTop: 12 }}>
                <div className="vb-row">
                  <span style={{ color: 'var(--muted)' }}>Subtotal</span>
                  <strong>{fmtGHS(totals.subtotal)}</strong>
                </div>
                <div className="vb-row">
                  <span style={{ color: 'var(--muted)' }}>
                    VAT {watchedVAT ? `(${watchedVATPct}%)` : '(N/A)'}
                  </span>
                  <strong>{fmtGHS(totals.vat_amount)}</strong>
                </div>
                <div className="vb-row total">
                  <span>Total Payable</span>
                  <span style={{ fontSize: 17 }}>{fmtGHS(totals.total_amount)}</span>
                </div>
              </div>

              {/* Quantity summary across all lines */}
              {(watchedLines || []).some(l => parseFloat(l.quantity) > 0) && (
                <div style={{
                  marginTop: 10, padding: '10px 14px',
                  background: 'var(--surface)', borderRadius: 8,
                  border: '1px solid var(--border)', fontSize: 11.5,
                }}>
                  <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--muted)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                    Quantity Summary
                  </div>
                  {(watchedLines || []).filter(l => parseFloat(l.quantity) > 0).map((l, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ color: 'var(--muted)' }}>{l.description || `Line ${i + 1}`}</span>
                      <strong style={{ color: 'var(--primary)' }}>
                        {fmtQty(l.quantity, l.unit)} @ {fmtGHS(l.unit_price)}/{UNIT_OPTIONS.find(o => o.value === l.unit)?.label?.split(' ')[0] || l.unit}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap8 mt16">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving…' : '💾 Create Invoice'}
                </button>
                <button
                  type="button" className="btn btn-ghost"
                  onClick={() => {
                    reset({
                      invoice_date: new Date().toISOString().split('T')[0],
                      vat_applicable: false, vat_percentage: 15,
                      lines: [{ description: '', quantity: '', unit: 'TONS', unit_price: '' }],
                    });
                    setTotals({ subtotal: 0, vat_amount: 0, total_amount: 0 });
                  }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* ── Right: Live Invoice Preview ── */}
            <div className="card">
              <div className="card-title"><span className="card-title-ic">👁️</span>Live Preview</div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 20 }}>
                <div style={{ background: 'var(--navy)', color: '#fff', padding: '12px 16px', borderRadius: '6px 6px 0 0', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>TAURUS TRADE & LOGISTICS</div>
                  <div style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>Tax Invoice</div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{watch('client_name') || 'Client Name'}</div>
                    <div style={{ color: 'var(--muted)' }}>{watch('client_phone') || ''}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 10 }}>{watch('client_address') || ''}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, color: 'var(--blue)' }}>INVOICE #</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>Date: {watch('invoice_date') || '—'}</div>
                    {watch('due_date') && <div style={{ color: 'var(--red)', fontSize: 10 }}>Due: {watch('due_date')}</div>}
                  </div>
                </div>
                <div className="tbl-wrap" style={{ marginBottom: 12 }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(watchedLines || []).map((l, i) => (
                        <tr key={i}>
                          <td style={{ fontSize: 10 }}>{l.description || '—'}</td>
                          <td style={{ fontSize: 11 }}>{parseFloat(l.quantity || 0).toLocaleString('en-GH', { maximumFractionDigits: 3 })}</td>
                          <td style={{ fontSize: 10, color: 'var(--muted)' }}>
                            {UNIT_OPTIONS.find(o => o.value === l.unit)?.label?.split(' ')[0] || l.unit || '—'}
                          </td>
                          <td style={{ fontSize: 11 }}>{fmtGHS(l.unit_price || 0)}</td>
                          <td className="ced" style={{ fontWeight: 700 }}>
                            {fmtGHS(parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="vat-breakdown">
                  <div className="vb-row">
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>Subtotal</span>
                    <span className="ced">{fmtGHS(totals.subtotal)}</span>
                  </div>
                  <div className="vb-row">
                    <span style={{ color: 'var(--muted)', fontSize: 12 }}>
                      VAT {watchedVAT ? `(${watchedVATPct}%)` : ''}
                    </span>
                    <span className="ced">{fmtGHS(totals.vat_amount)}</span>
                  </div>
                  <div className="vb-row total">
                    <span>TOTAL DUE</span>
                    <span>{fmtGHS(totals.total_amount)}</span>
                  </div>
                </div>
                {watch('notes') && (
                  <div style={{ marginTop: 12, fontSize: 10, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                    <strong>Notes:</strong> {watch('notes')}
                  </div>
                )}
              </div>

              {/* Info panel */}
              <div style={{
                marginTop: 14, padding: '10px 13px', borderRadius: 8,
                background: 'var(--blue-bg, #eff6ff)', border: '1px solid #bfdbfe',
                fontSize: 11.5, color: 'var(--blue)', lineHeight: 1.5,
              }}>
                <strong>💡 Revenue Auto-Flow:</strong><br />
                When you mark an invoice as <strong>PAID</strong>, revenue is automatically
                recorded in the Revenue page — no manual entry needed.
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ══ ALL INVOICES LIST ═════════════════════════════════════════════ */}
      {tab === 'list' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div className="card-title" style={{ margin: 0 }}>
              <span className="card-title-ic">📋</span>All Invoices
              <span className="badge b-blue" style={{ marginLeft: 8 }}>{filteredInvoices.length}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1.5px solid var(--border)', background: 'var(--card)' }}
              >
                <option value="">All Statuses</option>
                <option value="DRAFT">Draft</option>
                <option value="SENT">Sent</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Qty / Units</th>
                  <th>Subtotal</th>
                  <th>VAT</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>
                      No invoices found
                    </td>
                  </tr>
                )}
                {filteredInvoices.map(inv => {
                  // Parse quantity summary from lines if available
                  const lines = inv.lines || [];
                  const totalQty = lines.reduce((s, l) => s + parseFloat(l.quantity || 0), 0);
                  const units = [...new Set(lines.map(l => {
                    const m = l.description?.match(/^\[([A-Z]+)\]/);
                    return m ? m[1] : 'UNITS';
                  }))].join(', ');

                  return (
                    <tr key={inv.id}>
                      <td className="mono" style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                      <td>{inv.client_name}</td>
                      <td style={{ fontSize: 11 }}>{new Date(inv.invoice_date).toLocaleDateString('en-GB')}</td>
                      <td style={{ fontSize: 11, color: 'var(--primary)' }}>
                        {totalQty > 0
                          ? <span>{parseFloat(totalQty).toLocaleString('en-GH', { maximumFractionDigits: 3 })} {units}</span>
                          : <span style={{ color: 'var(--muted)' }}>—</span>
                        }
                      </td>
                      <td className="ced">{fmtGHS(inv.subtotal)}</td>
                      <td>
                        {inv.vat_applicable
                          ? <span className="badge b-blue">{inv.vat_percentage}%</span>
                          : <span className="badge b-gray">N/A</span>}
                      </td>
                      <td className="ced" style={{ fontWeight: 700 }}>{fmtGHS(inv.total_amount)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[inv.status]}`}>{inv.status}</span>
                      </td>
                      <td>
                        <div className="flex gap4" style={{ flexWrap: 'wrap' }}>
                          {inv.status === 'DRAFT' && (
                            <button className="btn btn-ghost btn-xs" onClick={() => markSent(inv)} title="Mark as Sent">
                              📤 Send
                            </button>
                          )}
                          {(inv.status === 'SENT' || inv.status === 'OVERDUE') && (
                            <button className="btn btn-ghost btn-xs" style={{ color: 'var(--green)', borderColor: 'var(--green)' }} onClick={() => markPaid(inv)} title="Mark as Paid — auto-records revenue">
                              ✅ Paid
                            </button>
                          )}
                          <button className="export-btn pdf btn-xs" onClick={() => downloadPDF(inv.id)}>🖨️</button>
                          <button className="export-btn excel btn-xs" onClick={() => downloadExcel(inv.id, inv.invoice_number)}>📊</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer totals */}
          {filteredInvoices.length > 0 && (
            <div style={{
              display: 'flex', gap: 20, flexWrap: 'wrap',
              marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: 12,
            }}>
              <span style={{ color: 'var(--muted)' }}>
                Total Invoiced: <strong style={{ color: 'var(--primary)' }}>
                  {fmtGHS(filteredInvoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0))}
                </strong>
              </span>
              <span style={{ color: 'var(--muted)' }}>
                Revenue Received: <strong style={{ color: 'var(--green)' }}>
                  {fmtGHS(filteredInvoices.filter(i => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0))}
                </strong>
              </span>
              <span style={{ color: 'var(--muted)' }}>
                Outstanding: <strong style={{ color: 'var(--red)' }}>
                  {fmtGHS(filteredInvoices.filter(i => i.status !== 'PAID').reduce((s, i) => s + parseFloat(i.total_amount || 0), 0))}
                </strong>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
