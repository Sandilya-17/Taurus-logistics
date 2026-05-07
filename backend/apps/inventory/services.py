"""apps/inventory/services.py – Stock ledger business logic."""
from decimal import Decimal
from django.db import transaction
from django.db.models import Sum
from .models import Item, Location, StockLedger, Purchase, IssueItem


class StockService:

    @staticmethod
    def get_closing_stock(item_id=None, location_id=None, as_of=None):
        from django.db.models import Sum
        from django.db.models.functions import Coalesce

        qs = Item.objects.all()
        if item_id:
            qs = qs.filter(id=item_id)
        
        # We aggregate ledger entries. If location or as_of is provided,
        # we filter the ledger entries within the aggregation.
        # But Django 3/4 allows filtering inside annotations using filter=Q(...)
        from django.db.models import Q
        ledger_filter = Q()
        if location_id:
            ledger_filter &= Q(ledger_entries__location_id=location_id)
        if as_of:
            ledger_filter &= Q(ledger_entries__created_at__date__lte=as_of)

        result = qs.annotate(
            closing_qty=Coalesce(Sum('ledger_entries__quantity', filter=ledger_filter), Decimal('0')),
            closing_value=Coalesce(Sum('ledger_entries__final_amount', filter=ledger_filter), Decimal('0'))
        ).values(
            'id', 'name', 'item_type', 'reorder_level', 'unit',
            'closing_qty', 'closing_value'
        ).order_by('name')

        # Map to the keys expected by the frontend
        out = []
        for r in result:
            out.append({
                'item__id': r['id'],
                'item__name': r['name'],
                'item__item_type': r['item_type'],
                'item__reorder_level': r['reorder_level'],
                'item__unit': r['unit'],
                'location__id': location_id or '',
                'location__name': 'All Locations' if not location_id else Location.objects.get(id=location_id).name,
                'closing_qty': r['closing_qty'],
                'closing_value': r['closing_value']
            })
        return out

    @staticmethod
    def get_available_qty(item_id, location_id=None):
        qs = StockLedger.objects.filter(item_id=item_id)
        if location_id:
            qs = qs.filter(location_id=location_id)
        total = qs.aggregate(t=Sum('quantity'))['t']
        return total or Decimal('0')

    @staticmethod
    def validate_stock(item_id, quantity, location_id=None):
        available = StockService.get_available_qty(item_id, location_id)
        if available < Decimal(str(quantity)):
            raise ValueError(
                f"Insufficient stock. Available: {available}, Requested: {quantity}"
            )
        return available


class PurchaseService:

    @staticmethod
    @transaction.atomic
    def create_purchase(data, user=None):
        """
        Create Purchase record and post to StockLedger.
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

        # Post to ledger (positive quantity = inward)
        ledger = StockLedger.objects.create(
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


class IssueService:

    @staticmethod
    @transaction.atomic
    def create_issue(data, user=None):
        """
        Validate stock, create IssueItem, post negative entry to StockLedger.
        data keys: item_id, location_id, quantity, issue_type, truck_id, issue_date, remark
        """
        qty = Decimal(str(data['quantity']))
        # Get last known unit price from ledger
        last_entry = (
            StockLedger.objects.filter(item_id=data['item_id'], quantity__gt=0)
            .order_by('-created_at').first()
        )
        unit_price = last_entry.unit_price if last_entry else Decimal('0')
        final_amt  = qty * unit_price

        # Validate stock availability
        StockService.validate_stock(data['item_id'], qty, data['location_id'])

        issue = IssueItem.objects.create(
            item_id      = data['item_id'],
            location_id  = data['location_id'],
            truck_id     = data.get('truck_id'),
            issue_type   = data['issue_type'],
            quantity     = qty,
            unit_price   = unit_price,
            final_amount = final_amt,
            issue_date   = data['issue_date'],
            remark       = data.get('remark', ''),
            created_by   = user,
        )

        # Post to ledger (negative quantity = outward)
        ledger = StockLedger.objects.create(
            item_id          = data['item_id'],
            location_id      = data['location_id'],
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
