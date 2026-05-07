"""apps/drivers/serializers.py"""
from rest_framework import serializers
from .models import Driver, DriverDocument


class DriverDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = DriverDocument
        fields = '__all__'
        read_only_fields = ('uploaded_at',)


class DriverSerializer(serializers.ModelSerializer):
    licence_expired  = serializers.BooleanField(read_only=True)
    can_be_assigned  = serializers.BooleanField(read_only=True)
    truck_number     = serializers.CharField(source='assigned_truck.truck_number', read_only=True)
    documents        = DriverDocumentSerializer(many=True, read_only=True)

    class Meta:
        model  = Driver
        fields = '__all__'
        read_only_fields = ('created_at', 'updated_at')
