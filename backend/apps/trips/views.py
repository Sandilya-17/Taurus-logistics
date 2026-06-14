"""apps/trips/views.py"""
from django.db import connection
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from apps.core.branch_mixin import BranchScopedQuerysetMixin
from .models import Trip
from .serializers import TripSerializer, TripPreviewSerializer


class TripListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = Trip.objects.select_related('truck', 'driver')
    serializer_class = TripSerializer
    filterset_fields = ('status', 'truck', 'driver')
    search_fields    = ('waybill_no', 'origin', 'destination', 'material_type')
    ordering_fields  = ('loading_time', 'status')

    def perform_create(self, serializer):
        try:
            from apps.users.models import User
            user = self.request.user
            kwargs = {'created_by': user}
            if user.role != User.SUPER_ADMIN and user.branch_id:
                kwargs['branch'] = user.branch
            serializer.save(**kwargs)
        except ValueError as e:
            raise ValidationError({'error': str(e)})


class TripDetail(BranchScopedQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset         = Trip.objects.all()
    serializer_class = TripSerializer

    def perform_update(self, serializer):
        try:
            serializer.save()
        except ValueError as e:
            raise ValidationError({'error': str(e)})

    def perform_destroy(self, instance):
        pk         = instance.pk
        waybill_no = instance.waybill_no

        with connection.cursor() as cur:
            cur.execute("DELETE FROM revenues WHERE trip_id = %s", [pk])
            cur.execute("DELETE FROM expenditures WHERE reference = %s", [waybill_no])
            cur.execute("UPDATE fuel_logs SET trip_id = NULL WHERE trip_id = %s", [pk])

            cur.execute(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name='issue_items' AND column_name='trip_id'"
            )
            if cur.fetchone()[0]:
                cur.execute("UPDATE issue_items SET trip_id = NULL WHERE trip_id = %s", [pk])

            cur.execute(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name='invoices' AND column_name='trip_id'"
            )
            if cur.fetchone()[0]:
                cur.execute("UPDATE invoices SET trip_id = NULL WHERE trip_id = %s", [pk])

            cur.execute("DELETE FROM trips WHERE id = %s", [pk])


class TripPreviewView(APIView):
    permission_classes = []

    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
