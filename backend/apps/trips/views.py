"""apps/trips/views.py"""
from django.db import connection
from rest_framework import generics
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

    def perform_update(self, serializer):
        try:
            serializer.save()
        except ValueError as e:
            raise ValidationError({'error': str(e)})


class TripDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Trip.objects.all()
    serializer_class = TripSerializer

    def perform_update(self, serializer):
        try:
            serializer.save()
        except ValueError as e:
            raise ValidationError({'error': str(e)})

    def perform_destroy(self, instance):
        """
        Delete a trip safely using raw SQL for ALL related-record cleanup.

        We bypass Django ORM cascades entirely because several FK migrations
        may not have applied on the live DB (mismatched migration numbers
        between apps), which causes 'Unknown column' or constraint errors.

        Order:
          1. DELETE revenues linked to this trip
          2. DELETE expenditures linked by waybill_no
          3. NULL fuel_logs.trip_id
          4. NULL issue_items.trip_id  (guarded - column may not exist)
          5. NULL invoices.trip_id     (guarded - column may not exist)
          6. DELETE the trip row
        """
        pk         = instance.pk
        waybill_no = instance.waybill_no

        with connection.cursor() as cur:
            # 1. Revenue rows (trip FK is CASCADE - must delete before trip)
            cur.execute("DELETE FROM revenues WHERE trip_id = %s", [pk])

            # 2. Expenditure rows keyed by waybill (no trip FK column)
            cur.execute("DELETE FROM expenditures WHERE reference = %s", [waybill_no])

            # 3. Fuel logs — trip_id column always exists
            cur.execute("UPDATE fuel_logs SET trip_id = NULL WHERE trip_id = %s", [pk])

            # 4. Issue items — trip_id column may not exist yet
            cur.execute(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name='issue_items' AND column_name='trip_id'"
            )
            if cur.fetchone()[0]:
                cur.execute(
                    "UPDATE issue_items SET trip_id = NULL WHERE trip_id = %s", [pk]
                )

            # 5. Invoices — trip_id column may not exist
            cur.execute(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name='invoices' AND column_name='trip_id'"
            )
            if cur.fetchone()[0]:
                cur.execute(
                    "UPDATE invoices SET trip_id = NULL WHERE trip_id = %s", [pk]
                )

            # 6. Delete the trip itself
            cur.execute("DELETE FROM trips WHERE id = %s", [pk])


class TripPreviewView(APIView):
    """POST trip fields -> returns computed values instantly (no DB write)."""
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
