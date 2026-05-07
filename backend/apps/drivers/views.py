"""apps/drivers/views.py"""
from rest_framework import generics
from .models import Driver, DriverDocument
from .serializers import DriverSerializer, DriverDocumentSerializer


class DriverListCreate(generics.ListCreateAPIView):
    queryset         = Driver.objects.select_related('assigned_truck').prefetch_related('documents')
    serializer_class = DriverSerializer
    filterset_fields = ('status',)
    search_fields    = ('name', 'phone', 'ghana_card_no', 'licence_number')


class DriverDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Driver.objects.all()
    serializer_class = DriverSerializer

    def perform_update(self, serializer):
        instance = serializer.save()
        # Prevent assigning expired-licence driver to a truck
        if instance.assigned_truck and instance.licence_expired:
            raise Exception('Cannot assign truck: driver licence is expired.')


class DriverDocumentUpload(generics.CreateAPIView):
    queryset         = DriverDocument.objects.all()
    serializer_class = DriverDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
