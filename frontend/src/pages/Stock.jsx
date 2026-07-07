// src/pages/Stock.jsx – Taurus ERP · Professional Stock Ledger
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useBranch, useCurrency } from '../App';
import { useAuth } from '../App';

const SPARE_PARTS = [
  "99 Glue (Big Size)","Adaptor","Adaptor 22-27","Air Blower Filter","Air Hose",
  "Air Hose Flexible (50 Yards)","Air Cylinder","Air Blower (Complete)","Air Cleaner (Complete)",
  "Air Condition Filter","Air Distribution Valve","Air Horn","Air Horn (3 Pipe)",
  "Automatic Clutch Disc","Automatic Pressure Plate","Automatic Release Bearing",
  "Automatic Ring","Automatic Clutch Booster","Automatic Plate","Axle Nut","Axle Case",
  "Air Cleaner Case","Battery Terminal","Benger Bolt","Benger Hole","Box Spanner (32, 36)",
  "Brake Bulb","Brake Shoe Locker","Brake Pin","Brake Locker","Brass Bushing","Capless Bulb",
  "Back Alarm","Shock Absorber Springs","Balloon (Air Suspension)","Jack","Driving Gear (Complete)",
  "Cello Tape","Centre Gear","Crank Shaft Sensor","Counter Sensor","Container Belt","Centre Bolt",
  "Nut","Manual Clutch Booster","Manifold (Complete)","Clutch Foot Valve","Cutting Disc",
  "Cutting Nozzle","Cutting Torch","Cut Out","Cross Member","Driving Mirror","Driver Seat",
  "Door Switch","Door Glass","Door Opener","Door Cable","D Block","Control Valve","Electrodes",
  "Allen Key Set","Welding Gloves","Welding Goggles","Welding Shield","Engine Mount (Seat)",
  "Engine Ring","Engine Spring & Ball","Epoxy","EBS Valve","Front Spring","Front Axle",
  "Fan Belt","Fan Clutch","Fan Blade","Brake Pads","Brake Band","Brake Pot","Brake Disc",
  "Brake Drum","Wheel Stud","Fuel Filter","Fuel Sensor","Gear Knob","Gear Pump","Actuator",
  "Grease Gun","Grinding Disc","Grinding Paste","Gear Box Parts","Bulb (H1, H3, H4, H7)",
  "Hand Brake Valve","Battery","Equalizer Beam","Equalizer Pin","Helper Balloon","Hub Bearing",
  "Hydraulic Hose","Hydrometer","Heavy Jack (50 Ton)","Manual Clutch Set","Measuring Unit",
  "Nipple","O Ring","Oil Filter","Oil Pan Gasket","Parking Bulb","Heater Patch",
  "Pressure Limit Valve","Radiator Seat","Return Spring","Tyre Valve","Shock Absorber",
  "Side Light","Silicone","Silencer","Spring Rubber","Steering Filter","Speedometer Sensor",
  "Paint Brush","Tipping Valve","Tipping Motor","Tipping Shaft","Oil Valve","Tank Cover",
  "Tachograph","Thread Tape","Tie Rod End","Traffic Light","Triangle Reflector","Rim","Tube",
  "Flap","Turn Table","Thrust Bearing","Water Separator","Wiper Blade","Suspension Bar",
  "Oil Seal","Fire Extinguisher","First Aid Kit","Engine Piston","Rubber Clip","Saw Blade",
  "Caliper","Relay Valve","Electric Wire","Tarpaulin","Control Board","U Clamp","Fuel Gauge",
  "Exhaust Sensor","Fog Light","Power Switch","Alternator","Intercooler","Water Hose",
  "Turbo Charger","Injector","AC Compressor","King Pin Set","Flywheel","Head Light",
  "Wheel Spanner","Cabin Shock Absorber","Rubber Bushing","Steering Parts","Shaft",
  "Starter Motor","Bearing Set","Piston with Ring","Head Gasket","Windscreen","Synchronizer",
  "Low Gear","Steel Plate"
];
const TYRES = [
  "315/80R22.5 KAPSEN S09 TRAILER D 2 AXLE","Apollo Tyre","MRF Tyre","Ceat Tyre",
  "JK Tyre","Birla Tyre","Michelin Tyre","Bridgestone Tyre","Goodyear Tyre","Continental Tyre",
  "315/80R22.5","385/65R22.5","12.00R24","12.00R20",
];
const LUBRICANTS = [
  "Engine Oil 15W-40","Engine Oil 20W-50","Gear Oil 80W-90","Gear Oil 85W-140",
  "Hydraulic Oil","Brake Fluid","Coolant","Grease","Differential Oil","Power Steering Fluid"
];
const ITEM_DICT = { SPARE_PART: SPARE_PARTS, TYRE: TYRES, LUBRICANT: LUBRICANTS };
const TYPE_LABEL = { SPARE_PART: 'Spare Part', TYRE: 'Tyre', LUBRICANT: 'Lubricant' };
const TYPE_BADGE = { SPARE_PART: 'b-navy', TYRE: 'b-purple', LUBRICANT: 'b-teal' };

const FORM_DEFAULTS = { item_type: 'SPARE_PART', unit: 'pcs', unit_price: '', quantity: '', tyre_size: '', name: '', description: '' };

export default function StockPage() {
  const { user } = useAuth();
  const isAdmin   = user?.role === 'ADMIN';
  const branchCtx = useBranch();
  const branchQS  = branchCtx?.branchQS || {};
  const { fmt, symbol } = useCurrency();

  const [stock,      setStock]      = useState([]);
  const [allItems,   setAllItems]   = useState([]);
  const [ledger,     setLedger]     = useState([]);
  const [search,     setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [editing,    setEditing]    = useState(null); // item id when editing

  const [dlStock, setDlStock] = useState('');

  // ── Excel → Stock Ledger import ──
  const importInputRef = useRef(null);
  const [importing,     setImporting]     = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [zeroing,       setZeroing]       = useState(false);

  const handleImportClick = () => importInputRef.current?.click();

  const handleZeroClosingStock = async () => {
    const ok = window.confirm(
      'This will set Closing Qty to 0 for every item in this branch.\n\n' +
      'Existing Opening / Purchased / Issued history is kept — this only ' +
      'posts a balancing adjustment so the running total becomes 0.\n\n' +
      'Continue?'
    );
    if (!ok) return;

    setZeroing(true);
    try {
      const r = await api.post('/inventory/zero-closing-stock/', {}, { params: branchQS });
      toast.success(r.data.message || 'Closing stock reset to 0.');
      loadData();
    } catch (e) {
      const errData = e.response?.data;
      toast.error(errData?.error || errData?.detail || 'Failed to reset closing stock.');
    } finally {
      setZeroing(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!/\.(xlsx|xlsm)$/i.test(file.name)) {
      toast.error('Please upload a .xlsx or .xlsm file.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setImporting(true);
    setImportSummary(null);
    try {
      const r = await api.post('/inventory/import-opening-stock/', formData, {
        params: branchQS,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportSummary(r.data);
      toast.success(r.data.message || 'Import complete.');
      loadData();
    } catch (e) {
      const errData = e.response?.data;
      toast.error(errData?.error || errData?.detail || 'Import failed. Please check the file format.');
    } finally {
      setImporting(false);
    }
  };

  const handleStockDownload = async (fmtType) => {
    setDlStock(fmtType);
    try {
      const mime = fmtType === 'pdf'
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const ext = fmtType === 'pdf' ? 'pdf' : 'xlsx';
      const r = await api.get(`/reports/stock/?export=${fmtType}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([r.data], { type: mime }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `stock_report_${new Date().toISOString().split('T')[0]}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Stock report downloaded as ${fmtType.toUpperCase()}.`);
    } catch { toast.error('Download failed. Please try again.'); }
    finally { setDlStock(''); }
  };

  // Quick-add modal
  const [quickAdd,    setQuickAdd]    = useState(null);
  const [qaName,      setQaName]      = useState('');
  const [qaTyreSize,  setQaTyreSize]  = useState('');
  const [qaUnit,      setQaUnit]      = useState('pcs');
  const [qaSaving,    setQaSaving]    = useState(false);

  const { register, handleSubmit, reset, watch } = useForm({ defaultValues: FORM_DEFAULTS });

  const watchedType      = watch('item_type');
  const watchedUnitPrice = watch('unit_price');
  const watchedQuantity  = watch('quantity');
  const watchedUnit      = watch('unit');
  const totalCost = (parseFloat(watchedQuantity || 0) * parseFloat(watchedUnitPrice || 0)) || 0;

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.get('/inventory/closing-stock/', { params: branchQS }),
      api.get('/inventory/ledger/', { params: { page_size: 2000, ordering: 'created_at', ...branchQS } }),
      api.get('/inventory/items/', { params: { page_size: 2000, ...branchQS } }),
    ]).then(([s, l, it]) => {
      setStock(s.data.results || s.data);
      setLedger(l.data.results || l.data);
      setAllItems(it.data.results || it.data);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [branchCtx?.activeBranchId]);

  const buildLedgerSummary = (itemId) => {
    const id = parseInt(itemId, 10);
    const entries = ledger.filter(e => parseInt(e.item, 10) === id);
    const sum    = (type) => entries.filter(e => e.transaction_type === type).reduce((s, e) => s + parseFloat(e.quantity || 0), 0);
    const sumVal = (type) => entries.filter(e => e.transaction_type === type).reduce((s, e) => s + Math.abs(parseFloat(e.final_amount || 0)), 0);
    return {
      openQty:  sum('OPENING'),
      openVal:  sumVal('OPENING'),
      purchQty: sum('PURCHASE'),
      purchVal: sumVal('PURCHASE'),
      issueQty: Math.abs(sum('ISSUE')),
      issueVal: sumVal('ISSUE'),
      hasAnyEntry: entries.length > 0,
    };
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const itemName = (watchedType === 'TYRE' && data.tyre_size)
        ? `${data.name} - ${data.tyre_size}`
        : data.name;

      if (editing) {
        // PATCH: only send Item model fields (no unit_price/opening_qty — not Item fields)
        const patchPayload = {
          name:        itemName,
          item_type:   data.item_type,
          unit:        data.unit,
          description: data.description || '',
        };
        await api.patch(`/inventory/items/${editing}/`, patchPayload);
        toast.success('Item updated successfully.');
      } else {
        // POST: send item fields + opening_qty + unit_price for auto stock creation
        const postPayload = {
          name:        itemName,
          item_type:   data.item_type,
          unit:        data.unit,
          description: data.description || '',
          unit_price:  parseFloat(data.unit_price || 0),
          opening_qty: parseFloat(data.quantity   || 0),
        };
        await api.post('/inventory/items/', postPayload);
        const qty = parseFloat(data.quantity || 0);
        if (qty > 0) {
          toast.success(`Item created with opening stock of ${qty} ${data.unit}.`);
        } else {
          toast.success('Item created. Use "Set Stock" to post opening stock.');
        }
      }

      reset(FORM_DEFAULTS);
      setEditing(null);
      setShowForm(false);
      loadData();
    } catch (e) {
      // Handle both DRF error formats: {detail:...}, {error:...}, or field errors
      const errData = e.response?.data;
      const msg = errData?.error || errData?.detail || (typeof errData === 'object' ? JSON.stringify(errData) : null) || 'Failed to save item.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Opening stock modal
  const [openingModal,   setOpeningModal]   = useState(null);
  const [openingForm,    setOpeningForm]    = useState({ qty: '', price: '' });
  const [savingOpening,  setSavingOpening]  = useState(false);

  const openSetStock = (s, ld) => {
    const openingEntry = ledger.find(
      e => parseInt(e.item, 10) === parseInt(s.item__id, 10) && e.transaction_type === 'OPENING'
    );
    setOpeningModal({
      id:       s.item__id,
      name:     s.item__name,
      ledgerId: openingEntry?.id || null,
      isEdit:   ld.openQty > 0,
    });
    setOpeningForm({
      qty:   ld.openQty > 0 ? String(ld.openQty) : '',
      price: ld.openVal > 0 && ld.openQty > 0 ? String((ld.openVal / ld.openQty).toFixed(4)) : '',
    });
  };

  const submitOpeningStock = async () => {
    const qty   = parseFloat(openingForm.qty   || 0);
    const price = parseFloat(openingForm.price || 0);
    if (!qty   || qty   <= 0) { toast.error('Enter a valid quantity.');   return; }
    if (!price || price <= 0) { toast.error('Enter a valid unit price.'); return; }
    setSavingOpening(true);
    try {
      if (openingModal.isEdit && openingModal.ledgerId) {
        await api.patch(`/inventory/ledger/${openingModal.ledgerId}/`, { quantity: qty, unit_price: price });
        toast.success(`Opening stock updated for ${openingModal.name}.`);
      } else {
        await api.post('/inventory/opening-stock/', { item_id: openingModal.id, quantity: qty, unit_price: price });
        toast.success(`Opening stock of ${qty} units posted for ${openingModal.name}.`);
      }
      setOpeningModal(null);
      setOpeningForm({ qty: '', price: '' });
      loadData();
    } catch (e) {
      const errData = e.response?.data;
      toast.error(errData?.error || errData?.detail || 'Failed to save opening stock.');
    } finally {
      setSavingOpening(false);
    }
  };

  const startEdit = (s) => {
    setEditing(s.item__id);
    let tyreSize = '';
    let name = s.item__name;
    if (s.item__item_type === 'TYRE' && name.includes(' - ')) {
      const parts = name.split(' - ');
      tyreSize = parts.pop();
      name = parts.join(' - ');
    }
    // unit_price and quantity are blank on edit — those are StockLedger fields, not Item fields
    reset({ name, tyre_size: tyreSize, item_type: s.item__item_type, unit: s.item__unit, unit_price: '', quantity: '', description: '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitQuickAdd = async () => {
    const name = quickAdd === 'TYRE' && qaTyreSize
      ? `${qaName.trim()} - ${qaTyreSize}`
      : qaName.trim();
    if (!name) { toast.error('Enter a name.'); return; }
    setQaSaving(true);
    try {
      await api.post('/inventory/items/', {
        name,
        item_type: quickAdd,
        unit: quickAdd === 'LUBRICANT' ? 'litres' : 'pcs',
      });
      toast.success(`${name} added to ${TYPE_LABEL[quickAdd]} list.`);
      setQuickAdd(null); setQaName(''); setQaTyreSize(''); setQaUnit('pcs');
      loadData();
    } catch (e) {
      const errData = e.response?.data;
      toast.error(errData?.name?.[0] || errData?.error || 'Failed to add item.');
    } finally { setQaSaving(false); }
  };

  const deleteItem = async (id) => {
    if (!isAdmin) { toast.error('Only admins can delete items.'); return; }
    if (!window.confirm('Delete this item? All ledger entries will be permanently removed.')) return;
    try {
      await api.delete(`/inventory/items/${id}/`);
      toast.success('Item deleted.');
      loadData();
    } catch {
      toast.error('Cannot delete — item may have linked transactions.');
    }
  };

  const filtered = stock.filter(s => {
    const matchSearch = (s.item__name || '').toLowerCase().includes(search.toLowerCase());
    const matchType   = !typeFilter || s.item__item_type === typeFilter;
    return matchSearch && matchType;
  });

  const totalItems = stock.length;
  const lowStock   = stock.filter(s => {
    const qty = parseFloat(s.closing_qty || 0);
    const reorder = parseFloat(s.item__reorder_level || 0);
    return qty > 0 && reorder > 0 && qty <= reorder;
  }).length;
  const outOfStock = stock.filter(s => {
    const ld  = buildLedgerSummary(s.item__id);
    const qty = parseFloat(s.closing_qty || 0);
    return ld.hasAnyEntry && qty <= 0;
  }).length;
  const totalValue = stock.reduce((sum, s) => sum + parseFloat(s.closing_value || 0), 0);

  return (
    <div>
      {/* ── KPI Summary ── */}
      <div className="kpi-grid mb16" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        {[
          { label: 'Total Items',  val: totalItems,      color: 'var(--blue)',  icon: '📦' },
          { label: 'Low Stock',    val: lowStock,        color: 'var(--amber)', icon: '⚠️' },
          { label: 'Out of Stock', val: outOfStock,      color: 'var(--red)',   icon: '🚨' },
          { label: 'Total Value',  val: fmt(totalValue), color: 'var(--green)', icon: '💰' },
        ].map((k, i) => (
          <div key={i} className="kpi">
            <div className="kpi-label">{k.icon} {k.label}</div>
            <div className="kpi-val" style={{ color: k.color, fontSize: typeof k.val === 'string' ? 15 : 24 }}>{k.val}</div>
          </div>
        ))}
      </div>

      {lowStock > 0 && (
        <div className="alert alert-warn mb16">
          ⚠️ <strong>{lowStock} item(s)</strong> are at or below reorder level — please replenish stock.
        </div>
      )}

      {importSummary && (
        <div className="alert alert-success mb16" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            ✅ <strong>Excel import complete:</strong> {importSummary.created} new item(s) created,{' '}
            {importSummary.opening_posted} opening stock entr{importSummary.opening_posted === 1 ? 'y' : 'ies'} posted
            {importSummary.skipped_no_stock > 0 && <>, {importSummary.skipped_no_stock} row(s) skipped (no qty/price)</>}
            {' '}out of {importSummary.total_rows} row(s).
            {importSummary.errors?.length > 0 && (
              <div style={{ marginTop: 6, color: 'var(--red)', fontSize: 12 }}>
                {importSummary.errors.length} row(s) had errors:
                <ul style={{ margin: '4px 0 0 18px' }}>
                  {importSummary.errors.slice(0, 8).map((e, i) => <li key={i}>{e}</li>)}
                  {importSummary.errors.length > 8 && <li>…and {importSummary.errors.length - 8} more</li>}
                </ul>
              </div>
            )}
          </div>
          <button className="btn btn-ghost btn-xs" onClick={() => setImportSummary(null)}>✕</button>
        </div>
      )}

      <div className="card">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb16">
          <div className="card-title" style={{ margin: 0 }}>
            <span className="card-title-ic">📦</span> Stock Ledger
          </div>
          <div className="flex gap8 flex-wrap">
            <input
              type="text" placeholder="Search items…" value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: 200, padding: '7px 10px', fontSize: 12 }}
            />
            <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '7px 10px', fontSize: 12 }}>
              <option value="">All Types</option>
              <option value="SPARE_PART">Spare Parts</option>
              <option value="LUBRICANT">Lubricants</option>
              <option value="TYRE">Tyres</option>
            </select>
            <button className="btn btn-sm" style={{ background:'var(--navy,#1e3a5f)', color:'#fff', fontSize:11 }}
              onClick={() => { setQuickAdd('SPARE_PART'); setQaName(''); setQaTyreSize(''); setQaUnit('pcs'); }}>
              + Add Stock
            </button>
            <button className="btn btn-sm" style={{ background:'var(--teal,#0d9488)', color:'#fff', fontSize:11 }}
              onClick={() => { setQuickAdd('LUBRICANT'); setQaName(''); setQaUnit('litres'); }}>
              + Add Lubricant
            </button>
            <button className="btn btn-sm" style={{ background:'var(--purple,#7c3aed)', color:'#fff', fontSize:11 }}
              onClick={() => { setQuickAdd('TYRE'); setQaName(''); setQaTyreSize(''); setQaUnit('pcs'); }}>
              + Add Tyre & Size
            </button>
            <input
              type="file" accept=".xlsx,.xlsm" ref={importInputRef}
              style={{ display: 'none' }} onChange={handleImportFile}
            />
            {isAdmin && (
              <button className="btn btn-sm" style={{ background:'var(--green,#059669)', color:'#fff', fontSize:11 }}
                onClick={handleImportClick} disabled={importing}
                title="Bulk-import Items + Opening Stock from an Excel file (S/N, Item Description, Opening Stock, Unit Price)">
                {importing ? '⏳ Importing…' : '📥 Import Excel'}
              </button>
            )}
            {isAdmin && (
              <button className="btn btn-sm" style={{ background:'var(--red,#dc2626)', color:'#fff', fontSize:11 }}
                onClick={handleZeroClosingStock} disabled={zeroing}
                title="Set every item's Closing Qty to 0. Opening/Purchased/Issued history is kept.">
                {zeroing ? '⏳ Resetting…' : '0️⃣ Zero Closing Stock'}
              </button>
            )}
            <button className="export-btn excel" onClick={() => handleStockDownload('excel')} disabled={!!dlStock}>
              {dlStock === 'excel' ? '⏳ Exporting…' : '📊 Excel'}
            </button>
            <button className="export-btn pdf" onClick={() => handleStockDownload('pdf')} disabled={!!dlStock}>
              {dlStock === 'pdf' ? '⏳ Exporting…' : '🖨️ PDF'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => {
              if (showForm) { reset(FORM_DEFAULTS); setEditing(null); }
              setShowForm(!showForm);
            }}>
              {showForm ? '✕ Cancel' : '+ Add Inventory Item'}
            </button>
          </div>
        </div>

        {/* ── Add / Edit Form ── */}
        {showForm && (
          <div className="mb16 p16" style={{ background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 10 }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
              {editing ? '✏️ Edit Inventory Item' : '📦 Add New Inventory Item'}
            </h4>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="fgrid">
                <div className="fg" style={{ gridColumn: watchedType === 'TYRE' ? 'span 1' : 'span 2' }}>
                  <label>Item Name / Brand *</label>
                  <input type="text" list="item-suggestions" placeholder="Type or select…" {...register('name', { required: true })} />
                  <datalist id="item-suggestions">
                    {(ITEM_DICT[watchedType] || []).map((item, i) => <option key={i} value={item} />)}
                  </datalist>
                </div>

                {watchedType === 'TYRE' && (
                  <div className="fg">
                    <label>Tyre Size (type manually)</label>
                    <input type="text" placeholder="e.g. 11.00 R20" {...register('tyre_size')} />
                  </div>
                )}

                <div className="fg">
                  <label>Item Type *</label>
                  <select {...register('item_type', { required: true })}>
                    <option value="SPARE_PART">Spare Part</option>
                    <option value="LUBRICANT">Lubricant</option>
                    <option value="TYRE">Tyre</option>
                  </select>
                </div>

                <div className="fg">
                  <label>Unit of Measure</label>
                  <select {...register('unit')}>
                    <option value="pcs">pcs</option>
                    <option value="litres">litres</option>
                    <option value="set">set</option>
                    <option value="kg">kg</option>
                    <option value="pair">pair</option>
                    <option value="box">box</option>
                    <option value="roll">roll</option>
                  </select>
                </div>

                {/* Unit Price + Quantity only shown when ADDING (not editing) */}
                {!editing && (
                  <>
                    <div className="fg">
                      <label>Unit Price ({symbol}) *</label>
                      <input type="number" step="0.01" min="0" placeholder="0.00"
                        {...register('unit_price', { required: !editing })} />
                    </div>
                    <div className="fg">
                      <label>Opening Quantity *</label>
                      <input type="number" step="0.001" min="0" placeholder="0"
                        {...register('quantity', { required: !editing })} />
                    </div>
                  </>
                )}

                <div className="fg" style={{ gridColumn: 'span 2' }}>
                  <label>Description / Notes</label>
                  <input type="text" placeholder="Optional description…" {...register('description')} />
                </div>
              </div>

              {/* Total cost preview — only for new items */}
              {!editing && totalCost > 0 && (
                <div className="alert alert-success" style={{ margin: '10px 0' }}>
                  💰 Total Opening Value: <strong>{symbol} {totalCost.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                  <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 8 }}>
                    ({parseFloat(watchedQuantity || 0).toLocaleString()} {watchedUnit} × {symbol} {parseFloat(watchedUnitPrice || 0).toLocaleString('en', { minimumFractionDigits: 2 })})
                  </span>
                </div>
              )}

              <div className="flex gap8 mt12">
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving…' : editing ? '✓ Update Item' : '✓ Save Item'}
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => {
                  reset(FORM_DEFAULTS); setEditing(null); setShowForm(false);
                }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ── Stock Ledger Table ── */}
        <div className="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Item Name</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Op. Qty</th>
                <th style={{ textAlign: 'right' }}>Op. Value ({symbol})</th>
                <th style={{ textAlign: 'right', color: 'var(--green)' }}>+ Purchased Qty</th>
                <th style={{ textAlign: 'right', color: 'var(--green)' }}>Purchased Value</th>
                <th style={{ textAlign: 'right', color: 'var(--red)' }}>− Issued Qty</th>
                <th style={{ textAlign: 'right', fontWeight: 700 }}>Closing Qty</th>
                <th style={{ textAlign: 'right' }}>Unit Price</th>
                <th style={{ textAlign: 'right', fontWeight: 700 }}>Total Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                    ⏳ Loading stock data…
                  </td>
                </tr>
              )}
              {!loading && filtered.map((s, idx) => {
                const closingQty = parseFloat(s.closing_qty   || 0);
                const closingVal = parseFloat(s.closing_value || 0);
                const reorder    = parseFloat(s.item__reorder_level || 0);
                const ld         = buildLedgerSummary(s.item__id);
                const avgPrice   = closingQty > 0 && closingVal > 0 ? closingVal / closingQty : 0;

                const neverHadStock = !ld.hasAnyEntry;
                const isOut = ld.hasAnyEntry && closingQty <= 0;
                const isLow = !isOut && reorder > 0 && closingQty > 0 && closingQty <= reorder;

                return (
                  <tr key={s.item__id} style={{ background: isOut ? 'rgba(220,38,38,0.03)' : isLow ? 'rgba(245,158,11,0.03)' : undefined }}>
                    <td style={{ color: 'var(--muted)', fontSize: 11 }}>{String(idx + 1).padStart(2, '0')}</td>

                    <td style={{ fontWeight: 600 }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginBottom: 2 }}>
                        {`ITM-${String(s.item__id).padStart(4, '0')}`}
                      </div>
                      {s.item__name}
                      {s.item__unit && (
                        <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400, marginLeft: 5 }}>
                          ({s.item__unit})
                        </span>
                      )}
                    </td>

                    <td>
                      <span className={`badge ${TYPE_BADGE[s.item__item_type] || 'b-gray'}`}>
                        {TYPE_LABEL[s.item__item_type] || s.item__item_type}
                      </span>
                    </td>

                    <td className="mono" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                      {ld.openQty > 0 ? ld.openQty.toLocaleString('en', { maximumFractionDigits: 3 }) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td className="ced" style={{ textAlign: 'right', color: 'var(--muted)' }}>
                      {ld.openVal > 0 ? fmt(ld.openVal) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>

                    <td className="mono" style={{ textAlign: 'right', color: 'var(--green)', fontWeight: 600 }}>
                      {ld.purchQty > 0 ? `+${ld.purchQty.toLocaleString('en', { maximumFractionDigits: 3 })}` : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>
                    <td className="ced" style={{ textAlign: 'right', color: 'var(--green)' }}>
                      {ld.purchVal > 0 ? fmt(ld.purchVal) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>

                    <td className="mono" style={{ textAlign: 'right', color: ld.issueQty > 0 ? 'var(--red)' : '#cbd5e1', fontWeight: 600 }}>
                      {ld.issueQty > 0 ? `−${ld.issueQty.toLocaleString('en', { maximumFractionDigits: 3 })}` : '—'}
                    </td>

                    <td className="mono" style={{
                      textAlign: 'right', fontWeight: 800, fontSize: 14,
                      color: isOut ? 'var(--red)' : isLow ? 'var(--amber)' : 'var(--text)'
                    }}>
                      {closingQty.toLocaleString('en', { maximumFractionDigits: 3 })}
                    </td>

                    {/* Unit Price = closing_value / closing_qty (weighted avg) */}
                    <td className="ced" style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 11 }}>
                      {avgPrice > 0 ? fmt(avgPrice) : <span style={{ color: '#cbd5e1' }}>—</span>}
                    </td>

                    {/* Total Value = closing_value (qty × avg price) */}
                    <td className="ced" style={{ textAlign: 'right', fontWeight: 700, color: closingVal > 0 ? 'var(--text)' : '#cbd5e1' }}>
                      {closingVal > 0 ? fmt(closingVal) : '—'}
                    </td>

                    <td>
                      {neverHadStock && <span className="badge b-gray" style={{ fontSize: 10 }}>No Stock</span>}
                      {isOut         && <span className="badge b-red">Out of Stock</span>}
                      {isLow         && <span className="badge b-amber">Low Stock</span>}
                      {!neverHadStock && !isOut && !isLow && <span className="badge b-green">✓ OK</span>}
                    </td>

                    <td>
                      <div className="flex gap4" style={{ flexWrap: 'wrap' }}>
                        <button
                          className={ld.openQty > 0 ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-amber'}
                          style={{ fontSize: 10.5, padding: '3px 8px', whiteSpace: 'nowrap' }}
                          onClick={() => openSetStock(s, ld)}
                          title={ld.openQty > 0 ? 'Edit opening quantity & unit cost' : 'Set opening stock'}
                        >
                          {ld.openQty > 0 ? '✏️ Edit Stock' : '📦 Set Stock'}
                        </button>
                        {isAdmin && (
                          <button className="btn btn-ghost btn-xs" onClick={() => startEdit(s)} title="Edit item name / type / unit">✏️ Item</button>
                        )}
                        {isAdmin && (
                          <button className="btn btn-danger btn-xs" onClick={() => deleteItem(s.item__id)} title="Delete">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ textAlign: 'center', color: 'var(--muted)', padding: 40 }}>
                    No inventory items found{search ? ` matching "${search}"` : ''}.
                  </td>
                </tr>
              )}
            </tbody>
            {!loading && filtered.length > 0 && (
              <tfoot>
                <tr style={{ background: 'var(--surface)', fontWeight: 700 }}>
                  <td colSpan={4} style={{ padding: '10px 12px', fontSize: 12, color: 'var(--muted)' }}>
                    Showing {filtered.length} of {totalItems} items
                  </td>
                  <td style={{ textAlign: 'right', padding: '10px 12px' }}>
                    {fmt(filtered.reduce((s, x) => s + parseFloat(buildLedgerSummary(x.item__id).openVal), 0))}
                  </td>
                  <td colSpan={2} style={{ textAlign: 'right', padding: '10px 12px', color: 'var(--green)' }}>
                    {fmt(filtered.reduce((s, x) => s + parseFloat(buildLedgerSummary(x.item__id).purchVal), 0))}
                  </td>
                  <td></td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontSize: 14 }}>
                    {filtered.reduce((s, x) => s + parseFloat(x.closing_qty || 0), 0).toLocaleString('en', { maximumFractionDigits: 3 })}
                  </td>
                  <td></td>
                  <td style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: 'var(--green)' }}>
                    {fmt(filtered.reduce((s, x) => s + parseFloat(x.closing_value || 0), 0))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ── Opening Stock Modal ── */}
      {openingModal && (
        <div className="modal-overlay" onClick={() => setOpeningModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>{openingModal.isEdit ? '✏️ Edit Opening Stock' : '📦 Set Opening Stock'}</span>
              <button className="modal-close" onClick={() => setOpeningModal(null)}>✕</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              {openingModal.isEdit ? 'Editing opening stock for:' : 'Posting opening stock for:'}{' '}
              <strong style={{ color: 'var(--text)' }}>{openingModal.name}</strong>
            </p>
            {openingModal.isEdit && (
              <div className="alert" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid var(--amber)', borderRadius: 8, padding: '8px 14px', fontSize: 12, marginBottom: 12 }}>
                ⚠️ Editing will update the opening ledger entry. This affects the closing balance.
              </div>
            )}
            <div className="fgrid">
              <div className="fg">
                <label>Opening Quantity *</label>
                <input type="number" step="0.001" min="0.001" placeholder="e.g. 10"
                  value={openingForm.qty}
                  onChange={e => setOpeningForm(f => ({ ...f, qty: e.target.value }))}
                  autoFocus />
              </div>
              <div className="fg">
                <label>Unit Cost ({symbol}) *</label>
                <input type="number" step="0.01" min="0.01" placeholder="e.g. 250.00"
                  value={openingForm.price}
                  onChange={e => setOpeningForm(f => ({ ...f, price: e.target.value }))} />
              </div>
            </div>
            {openingForm.qty && openingForm.price && parseFloat(openingForm.qty) > 0 && parseFloat(openingForm.price) > 0 && (
              <div className="alert alert-success" style={{ margin: '10px 0' }}>
                ✅ Total opening value: <strong>{symbol} {(parseFloat(openingForm.qty) * parseFloat(openingForm.price)).toLocaleString('en', { minimumFractionDigits: 2 })}</strong>
              </div>
            )}
            <div className="flex gap8 mt16">
              <button className="btn btn-primary" onClick={submitOpeningStock} disabled={savingOpening}>
                {savingOpening ? '⏳ Saving…' : openingModal.isEdit ? '✓ Update Opening Stock' : '✓ Post Opening Stock'}
              </button>
              <button className="btn btn-ghost" onClick={() => { setOpeningModal(null); setOpeningForm({ qty: '', price: '' }); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick-Add Modal ── */}
      {quickAdd && (
        <div className="modal-overlay" onClick={() => setQuickAdd(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              <span>
                {quickAdd === 'SPARE_PART' && '🔩 Add / Manage Stock Items'}
                {quickAdd === 'LUBRICANT'  && '🛢️ Add / Manage Lubricants'}
                {quickAdd === 'TYRE'       && '🔵 Add / Manage Tyres & Sizes'}
              </span>
              <button className="modal-close" onClick={() => setQuickAdd(null)}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              Items here appear in Purchase & Issue dropdowns and the Add Inventory list.
            </p>
            <div className="fgrid" style={{ marginBottom: 8 }}>
              <div className="fg" style={{ gridColumn: quickAdd === 'TYRE' ? 'span 1' : 'span 2' }}>
                <label>{quickAdd === 'TYRE' ? 'Tyre Brand / Name *' : 'Item Name *'}</label>
                <input type="text"
                  placeholder={quickAdd === 'TYRE' ? 'e.g. Apollo Tyre' : quickAdd === 'LUBRICANT' ? 'e.g. Engine Oil 15W-40' : 'e.g. Brake Pad'}
                  value={qaName} onChange={e => setQaName(e.target.value)} autoFocus />
              </div>
              {quickAdd === 'TYRE' && (
                <div className="fg">
                  <label>Tyre Size (type manually)</label>
                  <input type="text" placeholder="e.g. 11.00 R20" value={qaTyreSize} onChange={e => setQaTyreSize(e.target.value)} />
                </div>
              )}
            </div>
            <div className="flex gap8 mb16">
              <button className="btn btn-primary btn-sm" onClick={submitQuickAdd} disabled={qaSaving}>
                {qaSaving ? '⏳ Saving…' : '+ Add Item'}
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => { setQaName(''); setQaTyreSize(''); }}>Clear</button>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Current {TYPE_LABEL[quickAdd]} Items — 🗑️ to remove from dropdowns
              </div>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allItems.filter(s => s.item_type === quickAdd).map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', background: 'var(--surface)', borderRadius: 6, fontSize: 12 }}>
                    <span>{s.name}</span>
                    <button className="btn btn-danger btn-xs" style={{ padding: '2px 7px', fontSize: 11 }}
                      onClick={() => deleteItem(s.id)} title="Remove from list">🗑️</button>
                  </div>
                ))}
                {allItems.filter(s => s.item_type === quickAdd).length === 0 && (
                  <div style={{ color: 'var(--muted)', fontSize: 12, padding: '8px 0' }}>No items yet.</div>
                )}
              </div>
            </div>
            <div className="flex gap8 mt16">
              <button className="btn btn-ghost" onClick={() => { setQuickAdd(null); setQaName(''); setQaTyreSize(''); }}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
