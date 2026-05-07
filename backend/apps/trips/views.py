"""apps/trips/views.py"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Trip
from .serializers import TripSerializer, TripPreviewSerializer


class TripListCreate(generics.ListCreateAPIView):
    queryset         = Trip.objects.select_related('truck', 'driver')
    serializer_class = TripSerializer
    filterset_fields = ('status', 'truck', 'driver')
    search_fields    = ('waybill_no', 'origin', 'destination', 'material_type')
    ordering_fields  = ('loading_time', 'status')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TripDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Trip.objects.all()
    serializer_class = TripSerializer


class TripPreviewView(APIView):
    """POST trip fields → returns computed values instantly (no DB write)."""
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
