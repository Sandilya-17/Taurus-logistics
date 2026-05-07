"""apps/maintenance/views.py"""
from rest_framework import generics
from .models import Mechanic, MaintenanceLog, MaintenancePart
from .serializers import MechanicSerializer, MaintenanceLogSerializer, MaintenancePartSerializer


class MechanicListCreate(generics.ListCreateAPIView):
    queryset         = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class MechanicDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class MaintenanceLogListCreate(generics.ListCreateAPIView):
    queryset         = MaintenanceLog.objects.select_related('truck', 'mechanic').prefetch_related('parts_used')
    serializer_class = MaintenanceLogSerializer
    filterset_fields = ('truck', 'status', 'maintenance_type', 'service_date')
    search_fields    = ('description', 'truck__truck_number')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MaintenanceLogDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = MaintenanceLog.objects.all()
    serializer_class = MaintenanceLogSerializer


class MaintenancePartCreate(generics.CreateAPIView):
    queryset         = MaintenancePart.objects.all()
    serializer_class = MaintenancePartSerializer
