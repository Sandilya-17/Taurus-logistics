"""apps/trucks/serializers.py"""
from rest_framework import serializers
from .models import Truck, TruckDocument


class TruckDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = TruckDocument
        fields = '__all__'
        read_only_fields = ('uploaded_at',)


class TruckSerializer(serializers.ModelSerializer):
    expiry_alerts    = serializers.SerializerMethodField()
    documents        = TruckDocumentSerializer(many=True, read_only=True)

    class Meta:
        model  = Truck
        fields = '__all__'
        read_only_fields = ('vit_next_due_date', 'created_at', 'updated_at')

    def get_expiry_alerts(self, obj):
        return obj.expiry_alerts()

    def validate(self, data):
        if data.get('status') == Truck.INACTIVE and not data.get('inactive_reason'):
            raise serializers.ValidationError({'inactive_reason': 'Required when status is INACTIVE.'})
        return data
