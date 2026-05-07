"""apps/trucks/views.py"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Truck, TruckDocument
from .serializers import TruckSerializer, TruckDocumentSerializer


class TruckListCreate(generics.ListCreateAPIView):
    queryset         = Truck.objects.prefetch_related('documents')
    serializer_class = TruckSerializer
    filterset_fields = ('status',)
    search_fields    = ('truck_number', 'model', 'make')


class TruckDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Truck.objects.all()
    serializer_class = TruckSerializer


class TruckAlerts(APIView):
    def get(self, request):
        trucks = Truck.objects.filter(status=Truck.ACTIVE)
        all_alerts = []
        for t in trucks:
            for a in t.expiry_alerts():
                a['truck_number'] = t.truck_number
                a['truck_id']     = t.pk
                all_alerts.append(a)
        return Response(all_alerts)


class TruckDocumentUpload(generics.CreateAPIView):
    queryset         = TruckDocument.objects.all()
    serializer_class = TruckDocumentSerializer

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)
