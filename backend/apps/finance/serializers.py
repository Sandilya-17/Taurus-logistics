"""apps/finance/serializers.py"""
from rest_framework import serializers
from .models import Expenditure, Revenue


class ExpenditureSerializer(serializers.ModelSerializer):
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    vendor_name  = serializers.CharField(source='vendor.name',        read_only=True)

    class Meta:
        model  = Expenditure
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class RevenueSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    trip_waybill   = serializers.CharField(source='trip.waybill_no',        read_only=True)

    class Meta:
        model  = Revenue
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
