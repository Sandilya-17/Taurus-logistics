"""apps/maintenance/serializers.py"""
from rest_framework import serializers
from .models import Mechanic, MaintenanceLog, MaintenancePart


class MechanicSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Mechanic
        fields = '__all__'


class MaintenancePartSerializer(serializers.ModelSerializer):
    item_name   = serializers.CharField(source='item.name', read_only=True)
    total_price = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = MaintenancePart
        fields = '__all__'
        read_only_fields = ('total_price',)


class MaintenanceLogSerializer(serializers.ModelSerializer):
    truck_number  = serializers.CharField(source='truck.truck_number', read_only=True)
    mechanic_name = serializers.CharField(source='mechanic.name',      read_only=True)
    parts_used    = MaintenancePartSerializer(many=True, read_only=True)
    total_cost    = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model  = MaintenanceLog
        fields = '__all__'
        read_only_fields = ('total_cost', 'created_at', 'updated_at')
