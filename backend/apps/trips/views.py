"""apps/trips/views.py"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Trip
from .serializers import TripSerializer, TripPreviewSerializer


class TripListCreate(generics.ListCreateAPIView):
    queryset         = Trip.objects.select_related('truck', 'driver')
    serializer_class = TripSerializer
    filterset_fields = ('status', 'truck', 'driver')
    search_fields    = ('waybill_no', 'origin', 'destination', 'material_type')
    ordering_fields  = ('loading_time', 'status')

    def perform_create(self, serializer):
        try:
            serializer.save(created_by=self.request.user)
        except ValueError as e:
            raise ValidationError({'error': str(e)})


class TripDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Trip.objects.all()
    serializer_class = TripSerializer

    def perform_destroy(self, instance):
        """Delete revenue before removing the trip — guarantees dashboard accuracy."""
        from apps.finance.models import Revenue
        Revenue.objects.filter(trip=instance).delete()
        Revenue.objects.filter(invoice__trip=instance).delete()
        instance.delete()


class TripPreviewView(APIView):
    """POST trip fields → returns computed values instantly (no DB write)."""
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
