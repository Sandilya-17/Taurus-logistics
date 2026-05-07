// src/pages/Purchase.jsx – Supplier typed manually; Edit/Delete for Admin only
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import api, { calcPurchase, fmtGHS } from '../utils/api';
import { useAuth } from '../App';
import toast from 'react-hot-toast';

export default function PurchasePage() {
  const { user }  = useAuth();
  const isAdmin   = user?.role === 'ADMIN';

  const [items,     setItems]     = useState([]);
  const [locations, setLocations] = useState([]);
  const [history,   setHistory]   = useState([]);
  const [computed,  setComputed]  = useState({ base_amount: 0, vat_amount: 0, final_amount: 0 });
  const [saving,    setSaving]    = useState(false);
  const [editRec,   setEditRec]   = useState(null); // purchase being edited

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm({
    defaultValues: { supplier_name: '', quantity: '', unit_price: '', vat_applicable: false, vat_percentage: 15 }
  });

  const watchQty    = watch('quantity');
  const watchPrice  = watch('unit_price');
  const watchVatOn  = watch('vat_applicable');
  const watchVatPct = watch('vat_percentage');

  useEffect(() => {
    setComputed(calcPurchase(watchQty, watchPrice, watchVatOn, watchVatPct));
  }, [watchQty, watchPrice, watchVatOn, watchVatPct]);

  const loadData = () => {
    Promise.all([
      api.get('/inventory/items/'),
      api.get('/inventory/locations/'),
      api.get('/inventory/purchases/?page_size=200'),
    ]).then(([i, l, h]) => {
      setItems(i.data.results || i.data);
      setLocations(l.data.results || l.data);
      setHistory(h.data.results || h.data);
    }).catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      if (editRec) {
        // Patch purchase — only remark & invoice editable after posting (qty/price affect ledger)
        await api.patch(`/inventory/purchases/${editRec.id}/`, {
          invoice_number: data.invoice_number,
          remark:         data.remark,
          supplier_name:  data.supplier_name,
        });
        toast.success('Purchase updated.');
        setEditRec(null);
      } else {
        await api.post('/inventory/purchases/', {
          ...data,
          supplier_name:  data.supplier_name.trim(),
          quantity:       parseFloat(data.quantity),
          unit_price:     parseFloat(data.unit_price),
          vat_percentage: parseFloat(data.vat_percentage || 0),
        });
        toast.success('Purchase posted. Stock ledger updated.');
      }
      reset({ supplier_name: '', quantity: '', unit_price: '', vat_applicable: false, vat_percentage: 15 });
      setComputed({ base_amount: 0, vat_amount: 0, final_amount: 0 });
      loadData();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save purchase.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p) => {
    setEditRec(p);
    setValue('supplier_name',   p.supplier_name || '');
    setValue('invoice_number',  p.invoice_number || '');
    setValue('remark',          p.remark || '');
    // qty/price read-only when editing to protect ledger integrity
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deletePurchase = async (id) => {
    if (!window.confirm('Delete this purchase? The ledger entry will also be removed.')) return;
    try {
      await api.delete(`/inventory/purchases/${id}/`);
      toast.success('Purchase deleted. Stock ledger reversed.');
      loadData();
    } catch {
      toast.error('Failed to delete purchase.');
    }
  };

  const cancelEdit = () => {
    setEditRec(null);
    reset({ supplier_name: '', quantity: '', unit_price: '', vat_applicable: false, vat_percentage: 15 });
    setComputed({ base_amount: 0, vat_amount: 0, final_amount: 0 });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb16">
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {editRec
            ? '✏️ Editing purchase — only supplier name, invoice & remark are editable (qty/price are locked to protect ledger integrity).'
            : 'All amounts are auto-calculated. VAT is configurable per transaction.'}
        </div>
        <span className="badge b-blue">GH₵ · Ghana Cedi</span>
      </div>

      <div className="g2">
        {/* ── Entry / Edit Form ── */}
        <div className="card">
          <div className="card-title">
            <span className="card-title-ic">{editRec ? '✏️' : '📥'}</span>
            {editRec ? 'Edit Purchase' : 'New Purchase Entry'}
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="sec-div">Supplier & Item</div>
            <div className="fgrid">
              <div className="fg">
                <label>Purchase Date *</label>
                <input type="date" disabled={!!editRec} {...register('purchase_date', { required: !editRec })} />
              </div>
              <div className="fg">
                <label>Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Kumasi Tyres Ltd"
                  {...register('supplier_name', { required: true })}
                />
                {errors.supplier_name && <span style={{ color: 'var(--red)', fontSize: 11 }}>Supplier name is required</span>}
              </div>
              <div className="fg">
                <label>Item *</label>
                <select disabled={!!editRec} {...register('item_id', { required: !editRec })}>
                  <option value="">— Select Item —</option>
                  {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.item_type})</option>)}
                </select>
              </div>
              <div className="fg">
                <label>Destination Location *</label>
                <select disabled={!!editRec} {...register('location_id', { required: !editRec })}>
                  <option value="">— Select Location —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            {!editRec && (
              <>
                <div className="sec-div">Quantity & Pricing — Auto-Calculated</div>
                <div className="fgrid">
                  <div className="fg">
                    <label>Quantity *</label>
                    <input type="number" step="0.001" min="0" placeholder="0"
                           {...register('quantity', { required: true, min: 0.001 })} />
                  </div>
                  <div className="fg">
                    <label>Unit Price (GH₵) *</label>
                    <input type="number" step="0.01" min="0" placeholder="0.00"
                           {...register('unit_price', { required: true, min: 0 })} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <div className="fg">
                    <label>Base Amount (Qty × Price)</label>
                    <div className="calc-box">{fmtGHS(computed.base_amount)}</div>
                  </div>
                  <div className="fg">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" style={{ width: 'auto' }} {...register('vat_applicable')} />
                      Apply VAT &nbsp;
                      <input type="number" step="0.1" min="0" max="100"
                             style={{ width: 70, display: 'inline-block' }}
                             {...register('vat_percentage')} />
                      <span style={{ fontSize: 12 }}>%</span>
                    </label>
                    <div className="calc-box" style={{ color: watch('vat_applicable') ? 'var(--blue)' : 'var(--muted)' }}>
                      {fmtGHS(computed.vat_amount)}
                    </div>
                  </div>
                </div>

                <div className="vat-breakdown">
                  <div className="vb-row"><span style={{ color: 'var(--muted)' }}>Base Amount</span><strong>{fmtGHS(computed.base_amount)}</strong></div>
                  <div className="vb-row"><span style={{ color: 'var(--muted)' }}>VAT {watch('vat_applicable') ? `(${watch('vat_percentage')}%)` : '(N/A)'}</span><strong>{fmtGHS(computed.vat_amount)}</strong></div>
                  <div className="vb-row total"><span>Total Payable</span><span style={{ fontSize: 16 }}>{fmtGHS(computed.final_amount)}</span></div>
                </div>
              </>
            )}

            <div className="sec-div" style={{ marginTop: 14 }}>Reference</div>
            <div className="fgrid">
              <div className="fg">
                <label>Supplier Invoice No.</label>
                <input type="text" placeholder="e.g. INV-2026-0001" {...register('invoice_number')} />
              </div>
              <div className="fg">
                <label>Remark</label>
                <input type="text" placeholder="Optional note" {...register('remark')} />
              </div>
            </div>

            <div className="flex gap8 mt16">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? '⏳ Saving…' : editRec ? '✓ Update Purchase' : '✓ Post Purchase'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={cancelEdit}>
                {editRec ? 'Cancel Edit' : 'Clear'}
              </button>
            </div>
          </form>
        </div>

        {/* ── Recent Purchases ── */}
        <div className="card">
          <div className="card-title"><span className="card-title-ic">📋</span>Recent Purchases</div>
          <div className="tbl-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th><th>Supplier</th><th>Item</th><th>Qty</th>
                  <th>Unit (GH₵)</th><th>VAT</th><th>Final (GH₵)</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {history.length === 0 && (
                  <tr><td colSpan={isAdmin ? 8 : 7} style={{ textAlign: 'center', color: 'var(--muted)', padding: 24 }}>No purchases yet</td></tr>
                )}
                {history.map(p => (
                  <tr key={p.id} style={{ background: editRec?.id === p.id ? 'rgba(59,130,246,0.06)' : undefined }}>
                    <td>{new Date(p.purchase_date).toLocaleDateString('en-GB')}</td>
                    <td style={{ fontWeight: 500 }}>{p.supplier_name || '—'}</td>
                    <td>{p.item_name}</td>
                    <td>{p.quantity}</td>
                    <td className="ced">{parseFloat(p.unit_price).toFixed(2)}</td>
                    <td>{p.vat_applicable ? <span className="badge b-blue">{p.vat_percentage}%</span> : <span className="badge b-gray">None</span>}</td>
                    <td className="ced">{parseFloat(p.final_amount).toFixed(2)}</td>
                    {isAdmin && (
                      <td>
                        <div className="flex gap4">
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(p)} title="Edit">✏️</button>
                          <button className="btn btn-danger btn-xs" onClick={() => deletePurchase(p.id)} title="Delete">🗑️</button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
