"""apps/trips/views.py"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django.db import transaction
from django.db.models import ProtectedError
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

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ProtectedError as e:
            return Response(
                {'error': f'Cannot delete trip — it has protected linked records: {str(e)}'},
                status=status.HTTP_409_CONFLICT,
            )
        except Exception as e:
            return Response(
                {'error': f'Delete failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    def perform_destroy(self, instance):
        """
        Delete a trip and all its linked finance/invoice records.
        Uses a transaction so it's all-or-nothing.
        """
        from apps.finance.models import Revenue, Expenditure
        from apps.invoicing.models import Invoice

        with transaction.atomic():
            # 1. Nullify invoice trip FK (SET_NULL, but do it explicitly first
            #    so any invoice-side signals don't fire against a deleted trip)
            Invoice.objects.filter(trip=instance).update(trip=None)

            # 2. Delete auto-posted Revenue entries linked to this trip
            Revenue.objects.filter(trip=instance).delete()

            # 3. Delete auto-posted Expenditure entries keyed by waybill_no
            Expenditure.objects.filter(reference=instance.waybill_no).delete()

            # 4. Delete the trip itself (fuel_logs and spare_issues use SET_NULL
            #    so Django handles them automatically on instance.delete())
            instance.delete()


class TripPreviewView(APIView):
    """POST trip fields -> returns computed values instantly (no DB write)."""
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
