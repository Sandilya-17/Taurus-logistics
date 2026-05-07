"""apps/core/serializers.py"""
from rest_framework import serializers
from .models import Supplier, Vendor, SystemAlert, AuditLog


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplier
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Vendor
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class SystemAlertSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SystemAlert
        fields = '__all__'
        read_only_fields = ('created_at',)


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model  = AuditLog
        fields = '__all__'
        read_only_fields = ('created_at',)
