"""apps/inventory/serializers.py"""
from decimal import Decimal
from rest_framework import serializers
from .models import Item, Location, StockLedger, Purchase, IssueItem


class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Location
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class ItemSerializer(serializers.ModelSerializer):
    available_qty   = serializers.SerializerMethodField()
    available_value = serializers.SerializerMethodField()

    class Meta:
        model  = Item
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def get_available_qty(self, obj):
        return float(obj.available_qty())

    def get_available_value(self, obj):
        return float(obj.available_value())


class StockLedgerSerializer(serializers.ModelSerializer):
    item_name     = serializers.CharField(source='item.name',          read_only=True)
    location_name = serializers.CharField(source='location.name',      read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model  = StockLedger
        fields = '__all__'
        read_only_fields = ('base_amount','vat_amount','final_amount','created_at')


class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item_name     = serializers.CharField(source='item.name',     read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)

    # Auto-calculated read-only fields
    base_amount  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    vat_amount   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    final_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Purchase
        fields = '__all__'
        read_only_fields = ('base_amount','vat_amount','final_amount','ledger_entry','created_at','updated_at')

    def validate(self, data):
        # Server-side: preview computed values in response
        qty      = Decimal(str(data.get('quantity', 0)))
        price    = Decimal(str(data.get('unit_price', 0)))
        vat_on   = data.get('vat_applicable', False)
        vat_pct  = Decimal(str(data.get('vat_percentage', 0))) if vat_on else Decimal('0')
        base     = qty * price
        vat_amt  = base * (vat_pct / 100) if vat_on else Decimal('0')
        data['base_amount']  = base
        data['vat_amount']   = vat_amt
        data['final_amount'] = base + vat_amt
        return data


class IssueItemSerializer(serializers.ModelSerializer):
    item_name     = serializers.CharField(source='item.name',     read_only=True)
    location_name = serializers.CharField(source='location.name', read_only=True)
    truck_number  = serializers.CharField(source='truck.truck_number', read_only=True)
    available_qty = serializers.SerializerMethodField()

    class Meta:
        model  = IssueItem
        fields = '__all__'
        read_only_fields = ('unit_price','final_amount','ledger_entry','created_at','updated_at')

    def get_available_qty(self, obj):
        from apps.inventory.services import StockService
        return float(StockService.get_available_qty(obj.item_id, obj.location_id))


# ── Lightweight preview serializer (for frontend auto-calc) ───────────────────
class PurchasePreviewSerializer(serializers.Serializer):
    """Returns computed amounts without saving – used by frontend for live preview."""
    quantity        = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_price      = serializers.DecimalField(max_digits=12, decimal_places=2)
    vat_applicable  = serializers.BooleanField(default=False)
    vat_percentage  = serializers.DecimalField(max_digits=5, decimal_places=2, default=0)

    base_amount  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    vat_amount   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    final_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    def validate(self, data):
        qty     = data['quantity']
        price   = data['unit_price']
        vat_on  = data['vat_applicable']
        vat_pct = data['vat_percentage'] if vat_on else Decimal('0')
        base    = qty * price
        vat_amt = base * (vat_pct / 100) if vat_on else Decimal('0')
        data['base_amount']  = base
        data['vat_amount']   = vat_amt
        data['final_amount'] = base + vat_amt
        return data
