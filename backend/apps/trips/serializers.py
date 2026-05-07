"""apps/trips/serializers.py"""
from decimal import Decimal
from rest_framework import serializers
from .models import Trip


class TripSerializer(serializers.ModelSerializer):
    truck_number    = serializers.CharField(source='truck.truck_number', read_only=True)
    driver_name     = serializers.CharField(source='driver.name',        read_only=True)
    duration_display = serializers.CharField(read_only=True)

    # Read-only auto-calculated
    qty_difference        = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    trip_duration_minutes = serializers.IntegerField(read_only=True)
    trip_revenue          = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Trip
        fields = '__all__'
        read_only_fields = ('qty_difference','trip_duration_minutes','trip_revenue','created_at','updated_at')


class TripPreviewSerializer(serializers.Serializer):
    """Live calculation preview for frontend."""
    loaded_qty    = serializers.DecimalField(max_digits=10, decimal_places=3)
    delivered_qty = serializers.DecimalField(max_digits=10, decimal_places=3, required=False, allow_null=True)
    rate_per_ton  = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, default=0)
    loading_time  = serializers.DateTimeField(required=False, allow_null=True)
    unloading_time = serializers.DateTimeField(required=False, allow_null=True)

    qty_difference        = serializers.DecimalField(max_digits=10, decimal_places=3, read_only=True)
    trip_revenue          = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    trip_duration_minutes = serializers.IntegerField(read_only=True)
    duration_display      = serializers.CharField(read_only=True)

    def validate(self, data):
        loaded    = data.get('loaded_qty', Decimal('0'))
        delivered = data.get('delivered_qty')
        rate      = data.get('rate_per_ton', Decimal('0'))

        data['qty_difference'] = (loaded - delivered) if delivered is not None else None
        data['trip_revenue']   = (delivered * rate)   if delivered is not None else Decimal('0')

        loading   = data.get('loading_time')
        unloading = data.get('unloading_time')
        if loading and unloading and unloading > loading:
            mins = int((unloading - loading).total_seconds() / 60)
            data['trip_duration_minutes'] = mins
            h, m = divmod(mins, 60)
            data['duration_display'] = f"{h}h {m}m"
        else:
            data['trip_duration_minutes'] = None
            data['duration_display']      = None
        return data
