"""apps/trucks/views.py"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.core.branch_mixin import BranchScopedQuerysetMixin
from .models import Truck, TruckDocument
from .serializers import TruckSerializer, TruckDocumentSerializer


class TruckListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = Truck.objects.prefetch_related('documents')
    serializer_class = TruckSerializer
    filterset_fields = ('status',)
    search_fields    = ('truck_number', 'model', 'make')


class TruckDetail(BranchScopedQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset         = Truck.objects.all()
    serializer_class = TruckSerializer


class TruckAlerts(APIView):
    def get(self, request):
        from apps.users.models import User
        qs = Truck.objects.filter(status=Truck.ACTIVE)
        if request.user.role != User.SUPER_ADMIN and request.user.branch_id:
            qs = qs.filter(branch=request.user.branch_id)
        all_alerts = []
        for t in qs:
            for a in t.expiry_alerts():
                a['truck_number'] = t.truck_number
                a['truck_id']     = t.pk
                all_alerts.append(a)
        return Response(all_alerts)
