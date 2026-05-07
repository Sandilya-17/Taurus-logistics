"""apps/invoicing/serializers.py"""
from decimal import Decimal
from rest_framework import serializers
from .models import Invoice, InvoiceLine


class InvoiceLineSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = InvoiceLine
        fields = '__all__'
        read_only_fields = ('line_total',)


class InvoiceSerializer(serializers.ModelSerializer):
    lines        = InvoiceLineSerializer(many=True, read_only=True)
    trip_waybill = serializers.CharField(source='trip.waybill_no', read_only=True)

    # Auto-calculated – read only
    subtotal     = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    vat_amount   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    balance_due  = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Invoice
        fields = '__all__'
        read_only_fields = ('invoice_number','subtotal','vat_amount','total_amount','balance_due','created_at','updated_at')

    def create(self, validated_data):
        validated_data['invoice_number'] = Invoice.generate_number()
        validated_data['created_by']     = self.context['request'].user
        return super().create(validated_data)


class InvoicePreviewSerializer(serializers.Serializer):
    """Live VAT + total preview."""
    subtotal       = serializers.DecimalField(max_digits=14, decimal_places=2)
    vat_applicable = serializers.BooleanField(default=False)
    vat_percentage = serializers.DecimalField(max_digits=5, decimal_places=2, default=15)

    vat_amount   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    total_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    def validate(self, data):
        sub     = data['subtotal']
        vat_on  = data['vat_applicable']
        vat_pct = data['vat_percentage']
        vat_amt = (sub * vat_pct / 100) if vat_on else Decimal('0')
        data['vat_amount']   = vat_amt
        data['total_amount'] = sub + vat_amt
        return data
