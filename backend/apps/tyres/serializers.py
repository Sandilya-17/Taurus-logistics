"""apps/tyres/serializers.py"""
from rest_framework import serializers
from .models import Tyre, TyreAssignment, TyreSwap


class TyreSerializer(serializers.ModelSerializer):
    current_assignment = serializers.SerializerMethodField()

    class Meta:
        model  = Tyre
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')

    def get_current_assignment(self, obj):
        a = obj.current_assignment
        if not a: return None
        return {'id': a.pk, 'truck': a.truck.truck_number, 'position': a.position, 'odometer_fit': a.odometer_fit}


class TyreAssignmentSerializer(serializers.ModelSerializer):
    tyre_serial  = serializers.CharField(source='tyre.serial_number', read_only=True)
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    km_used      = serializers.DecimalField(max_digits=10, decimal_places=1, read_only=True)

    class Meta:
        model  = TyreAssignment
        fields = '__all__'
        read_only_fields = ('fitted_at','removed_at','odometer_remove','km_used')


class TyreSwapSerializer(serializers.ModelSerializer):
    tyre_serial      = serializers.CharField(source='tyre.serial_number',      read_only=True)
    from_truck_number = serializers.CharField(source='from_truck.truck_number', read_only=True)
    to_truck_number   = serializers.CharField(source='to_truck.truck_number',   read_only=True)

    class Meta:
        model  = TyreSwap
        fields = '__all__'
        read_only_fields = ('created_at',)
