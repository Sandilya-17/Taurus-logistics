"""apps/inventory/services.py – Stock ledger business logic.

FIX SUMMARY
-----------
- _fifo_batches()         → accepts branch_id; only looks at THAT branch's inward rows.
- _fifo_weighted_price()  → passes branch_id through.
- StockService methods    → all accept optional branch_id for filtering.
- PurchaseService         → accepts branch kwarg; stamps Purchase + StockLedger row.
- IssueService            → accepts branch kwarg; stamps IssueItem + StockLedger row.
                            Also passes branch_id to _fifo_weighted_price so FIFO
                            only consumes stock from the correct branch.

FIFO COSTING
------------
When issuing stock, oldest inward batches (OPENING first, then PURCHASE,
ordered by created_at ASC) are consumed first.  The unit_price stored on
the IssueItem and its ledger entry is a weighted-average of the batches
consumed, so final_amount = sum(batch_qty_consumed × batch_price).
"""
from decimal import Decimal
from django.db import transaction, connection
from django.db.models import Sum
from .models import Item, Location, StockLedger, Purchase, IssueItem


def _column_exists(table, column):
    """Return True if `column` exists in `table` in the current DB."""
    db_name = connection.settings_dict['NAME']
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME   = %s
              AND COLUMN_NAME  = %s
            """,
            [db_name, table, column],
        )
        return cursor.fetchone()[0] > 0


# ── FIFO helpers ─────────────────────────────────────────────────────────────

def _fifo_batches(item_id, location_id=None, branch_id=None):
    """
    Return still-available inward batches for this item/location/branch,
    oldest-first.

    FIX: branch_id parameter added so each branch only sees its own stock.

    Each element:
        { 'ledger_id': int, 'unit_price': Decimal, 'remaining': Decimal }
    """
    # 1. Inward batches (oldest first)
    inward_qs = (
        StockLedger.objects
        .filter(
            item_id=item_id,
            transaction_type__in=[StockLedger.OPENING, StockLedger.PURCHASE],
            quantity__gt=0,
        )
    )
    if location_id:
        inward_qs = inward_qs.filter(location_id=location_id)
    if branch_id is not None:
        inward_qs = inward_qs.filter(branch_id=branch_id)

    inward_batches = list(
        inward_qs.order_by('created_at')
                 .values('id', 'unit_price', 'quantity')
    )

    # 2. Total outward already issued (scoped to same branch)
    outward_qs = StockLedger.objects.filter(
        item_id=item_id,
        transaction_type__in=[StockLedger.ISSUE, StockLedger.TRANSFER_OUT],
        quantity__lt=0,
    )
    if location_id:
        outward_qs = outward_qs.filter(location_id=location_id)
    if branch_id is not None:
        outward_qs = outward_qs.filter(branch_id=branch_id)

    total_issued = abs(
        outward_qs.aggregate(t=Sum('quantity'))['t'] or Decimal('0')
    )

    # 3. Walk batches, compute remaining
    remaining_to_deduct = total_issued
    available_batches = []

    for batch in inward_batches:
        batch_qty = Decimal(str(batch['quantity']))
        if remaining_to_deduct >= batch_qty:
            remaining_to_deduct -= batch_qty   # fully consumed by prior issues
        else:
            remaining = batch_qty - remaining_to_deduct
            remaining_to_deduct = Decimal('0')
            available_batches.append({
                'ledger_id':  batch['id'],
                'unit_price': Decimal(str(batch['unit_price'])),
                'remaining':  remaining,
            })

    return available_batches


def _fifo_weighted_price(item_id, qty_needed, location_id=None, branch_id=None):
    """
    Consume qty_needed units from FIFO batches (oldest first) and return the
    weighted-average unit price across batches consumed.

    FIX: branch_id parameter added — FIFO only considers stock owned by
    the same branch, preventing branch cross-contamination.

    Raises ValueError if insufficient stock.
    """
    batches = _fifo_batches(item_id, location_id, branch_id=branch_id)

    total_available = sum(b['remaining'] for b in batches)
    if total_available < qty_needed:
        raise ValueError(
            f"Insufficient stock. Available: {total_available:.3f}, "
            f"Requested: {qty_needed:.3f}"
        )

    remaining_need = qty_needed
    weighted_sum   = Decimal('0')

    for batch in batches:
        if remaining_need <= 0:
            break
        take = min(batch['remaining'], remaining_need)
        weighted_sum   += take * batch['unit_price']
        remaining_need -= take

    avg_price = (weighted_sum / qty_needed).quantize(Decimal('0.000001'))
    return avg_price


# ── StockService ──────────────────────────────────────────────────────────────

class StockService:

    @staticmethod
    def get_closing_stock(item_id=None, location_id=None, as_of=None, branch_id=None):
        """
        FIX: branch_id parameter added.
        - Branch admin:  always pass their branch_id → sees only their stock.
        - SUPER_ADMIN:   pass branch_id to narrow, or omit to see all branches.
        """
        from django.db.models import Q, Sum
        from django.db.models.functions import Coalesce

        qs = Item.objects.all()
        if item_id:
            qs = qs.filter(id=item_id)

        ledger_filter = Q()
        if location_id:
            ledger_filter &= Q(ledger_entries__location_id=location_id)
        if as_of:
            ledger_filter &= Q(ledger_entries__created_at__date__lte=as_of)
        # ── FIX: branch scope ──
        if branch_id is not None:
            ledger_filter &= Q(ledger_entries__branch_id=branch_id)

        result = qs.annotate(
            closing_qty=Coalesce(Sum('ledger_entries__quantity', filter=ledger_filter), Decimal('0')),
            closing_value=Coalesce(Sum('ledger_entries__final_amount', filter=ledger_filter), Decimal('0'))
        ).values(
            'id', 'name', 'item_type', 'reorder_level', 'unit',
            'closing_qty', 'closing_value'
        ).order_by('name')

        out = []
        for r in result:
            out.append({
                'item__id':            r['id'],
                'item__name':          r['name'],
                'item__item_type':     r['item_type'],
                'item__reorder_level': r['reorder_level'],
                'item__unit':          r['unit'],
                'location__id':        location_id or '',
                'location__name':      (
                    'All Locations' if not location_id
                    else Location.objects.get(id=location_id).name
                ),
                'closing_qty':         r['closing_qty'],
                'closing_value':       r['closing_value'],
            })
        return out

    @staticmethod
    def get_available_qty(item_id, location_id=None, branch_id=None):
        """FIX: branch_id parameter added."""
        qs = StockLedger.objects.filter(item_id=item_id)
        if location_id:
            qs = qs.filter(location_id=location_id)
        if branch_id is not None:
            qs = qs.filter(branch_id=branch_id)
        total = qs.aggregate(t=Sum('quantity'))['t']
        return total or Decimal('0')

    @staticmethod
    def validate_stock(item_id, quantity, location_id=None, branch_id=None):
        """FIX: branch_id parameter added."""
        available = StockService.get_available_qty(item_id, location_id, branch_id=branch_id)
        if available < Decimal(str(quantity)):
            raise ValueError(
                f"Insufficient stock. Available: {available}, Requested: {quantity}"
            )
        return available

    @staticmethod
    def get_fifo_batches(item_id, location_id=None, branch_id=None):
        """Public helper — returns FIFO batch breakdown for API/frontend preview."""
        return _fifo_batches(item_id, location_id, branch_id=branch_id)


# ── PurchaseService ───────────────────────────────────────────────────────────

class PurchaseService:

    @staticmethod
    @transaction.atomic
    def create_purchase(data, user=None, branch=None):
        """
        Create Purchase record and post to StockLedger.

        FIX: `branch` parameter added — both the Purchase row and its
        StockLedger entry are now stamped with the branch, preventing
        cross-branch stock leakage.

        data keys: supplier_id, item_id, location_id, quantity, unit_price,
                   vat_applicable, vat_percentage, invoice_number, purchase_date, remark
        """
        qty       = Decimal(str(data['quantity']))
        price     = Decimal(str(data['unit_price']))
        base_amt  = qty * price
        vat_on    = bool(data.get('vat_applicable', False))
        vat_pct   = Decimal(str(data.get('vat_percentage', 0))) if vat_on else Decimal('0')
        vat_amt   = base_amt * (vat_pct / 100) if vat_on else Decimal('0')
        final_amt = base_amt + vat_amt

        purchase = Purchase.objects.create(
            branch         = branch,               # ← FIX
            supplier_id    = data['supplier_id'],
            item_id        = data['item_id'],
            location_id    = data['location_id'],
            quantity       = qty,
            unit_price     = price,
            vat_applicable = vat_on,
            vat_percentage = vat_pct,
            vat_amount     = vat_amt,
            base_amount    = base_amt,
            final_amount   = final_amt,
            invoice_number = data.get('invoice_number', ''),
            purchase_date  = data['purchase_date'],
            remark         = data.get('remark', ''),
            created_by     = user,
        )

        ledger = StockLedger.objects.create(
            branch           = branch,             # ← FIX
            item_id          = data['item_id'],
            location_id      = data['location_id'],
            transaction_type = StockLedger.PURCHASE,
            quantity         = qty,
            unit_price       = price,
            vat_applicable   = vat_on,
            vat_percentage   = vat_pct,
            reference_type   = 'Purchase',
            reference_id     = purchase.pk,
            remark           = data.get('remark', ''),
            created_by       = user,
        )
        purchase.ledger_entry = ledger
        purchase.save(update_fields=['ledger_entry'])
        return purchase


# ── IssueService ──────────────────────────────────────────────────────────────

class IssueService:

    @staticmethod
    @transaction.atomic
    def create_issue(data, user=None, branch=None):
        """
        Validate stock, compute FIFO weighted-average unit price, create
        IssueItem and post a negative entry to StockLedger.

        FIX: `branch` parameter added — FIFO only draws from that branch's
        inward batches, and both the IssueItem and its StockLedger row are
        stamped with the branch.

        FIFO rule
        ---------
        Oldest inward batches (OPENING first, then PURCHASE by created_at)
        are consumed before newer ones.  The unit_price on the issue record
        is the weighted-average across the batches consumed.

        data keys:
            item_id, location_id, quantity, issue_type,
            truck_id, trip_id (optional), issue_date, remark
        """
        item_id      = data.get('item_id')
        location_id  = data.get('location_id')
        issue_type   = data.get('issue_type')
        issue_date   = data.get('issue_date')
        quantity_raw = data.get('quantity')

        if not item_id:
            raise ValueError("item_id is required.")
        if not location_id:
            raise ValueError("location_id is required.")
        if not issue_type:
            raise ValueError("issue_type is required.")
        if not issue_date:
            raise ValueError("issue_date is required.")
        if quantity_raw is None or quantity_raw == '':
            raise ValueError("quantity is required.")

        try:
            qty = Decimal(str(quantity_raw))
        except Exception:
            raise ValueError(f"Invalid quantity: {quantity_raw!r}")

        if qty <= 0:
            raise ValueError("Quantity must be greater than 0.")

        # ── FIX: FIFO weighted-average scoped to this branch ─────────────────
        branch_id  = branch.pk if branch else None
        unit_price = _fifo_weighted_price(item_id, qty, location_id, branch_id=branch_id)
        final_amt  = (qty * unit_price).quantize(Decimal('0.01'))

        create_kwargs = dict(
            branch       = branch,             # ← FIX
            item_id      = item_id,
            location_id  = location_id,
            truck_id     = data.get('truck_id') or None,
            issue_type   = issue_type,
            quantity     = qty,
            unit_price   = unit_price,
            final_amount = final_amt,
            issue_date   = issue_date,
            remark       = data.get('remark', ''),
            created_by   = user,
        )
        trip_id = data.get('trip_id') or None
        if trip_id and _column_exists('issue_items', 'trip_id'):
            create_kwargs['trip_id'] = trip_id

        issue = IssueItem.objects.create(**create_kwargs)

        # Post to ledger (negative quantity = outward)
        ledger = StockLedger.objects.create(
            branch           = branch,         # ← FIX
            item_id          = item_id,
            location_id      = location_id,
            transaction_type = StockLedger.ISSUE,
            quantity         = -qty,
            unit_price       = unit_price,
            reference_type   = 'Issue',
            reference_id     = issue.pk,
            remark           = data.get('remark', ''),
            created_by       = user,
        )
        issue.ledger_entry = ledger
        issue.save(update_fields=['ledger_entry'])
        return issue
