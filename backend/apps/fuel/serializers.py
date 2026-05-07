"""apps/fuel/serializers.py"""
from decimal import Decimal
from rest_framework import serializers
from .models import FuelLimit, FuelLog


class FuelLimitSerializer(serializers.ModelSerializer):
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)

    class Meta:
        model  = FuelLimit
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')


class FuelLogSerializer(serializers.ModelSerializer):
    truck_number = serializers.CharField(source='truck.truck_number', read_only=True)
    # Auto-calculated – read only
    excess_fuel  = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    total_cost   = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model  = FuelLog
        fields = '__all__'
        read_only_fields = ('excess_fuel', 'total_cost', 'created_at', 'updated_at')

    def validate(self, data):
        litres = data.get('litres', Decimal('0'))
        limit  = data.get('fuel_limit', Decimal('0'))
        excess = max(Decimal('0'), litres - limit)
        if excess > 0 and not data.get('remark', '').strip():
            raise serializers.ValidationError({'remark': 'Mandatory when fuel exceeds limit.'})
        # Preview computed fields
        data['excess_fuel'] = excess
        data['total_cost']  = litres * data.get('price_per_litre', Decimal('0'))
        return data


class FuelPreviewSerializer(serializers.Serializer):
    """Live preview – no DB write."""
    litres          = serializers.DecimalField(max_digits=8, decimal_places=2)
    fuel_limit      = serializers.DecimalField(max_digits=8, decimal_places=2)
    price_per_litre = serializers.DecimalField(max_digits=8, decimal_places=2, default=0)

    excess_fuel = serializers.DecimalField(max_digits=8, decimal_places=2, read_only=True)
    total_cost  = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    def validate(self, data):
        excess = max(Decimal('0'), data['litres'] - data['fuel_limit'])
        data['excess_fuel'] = excess
        data['total_cost']  = data['litres'] * data['price_per_litre']
        return data
