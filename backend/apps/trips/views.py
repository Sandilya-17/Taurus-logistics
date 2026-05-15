"""apps/trips/views.py"""
from django.db import connection
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from .models import Trip
from .serializers import TripSerializer, TripPreviewSerializer


def _issue_items_trip_column_exists():
    """Return True if issue_items.trip_id column is present in the DB.
    Cached per process to avoid repeated INFORMATION_SCHEMA queries.
    """
    if not hasattr(_issue_items_trip_column_exists, '_cache'):
        with connection.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_name = 'issue_items'
                  AND column_name = 'trip_id'
            """)
            _issue_items_trip_column_exists._cache = cur.fetchone()[0] > 0
    return _issue_items_trip_column_exists._cache


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
        Delete a trip and its linked Finance records cleanly.

        Guards against the case where issue_items.trip_id column has not
        yet been migrated to the live database: we use raw SQL to null out
        the FK before Django's ORM cascade tries to query it.
        """
        from apps.finance.models import Revenue, Expenditure

        # ── 1. Clean up Finance records ──────────────────────────────────
        Revenue.objects.filter(trip=instance).delete()
        Expenditure.objects.filter(reference=instance.waybill_no).delete()

        # ── 2. Null out IssueItem.trip_id if column exists ───────────────
        # Avoids "Unknown column 'issue_items.trip_id'" when the migration
        # hasn't run yet on the production database.
        if _issue_items_trip_column_exists():
            with connection.cursor() as cur:
                cur.execute(
                    "UPDATE issue_items SET trip_id = NULL WHERE trip_id = %s",
                    [instance.pk]
                )
        else:
            # Column missing — invalidate cache so next deploy re-checks
            if hasattr(_issue_items_trip_column_exists, '_cache'):
                del _issue_items_trip_column_exists._cache

        # ── 3. Delete the trip ───────────────────────────────────────────
        instance.delete()


class TripPreviewView(APIView):
    """POST trip fields -> returns computed values instantly (no DB write)."""
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
