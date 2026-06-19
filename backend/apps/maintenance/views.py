"""apps/maintenance/views.py – Branch-scoped maintenance management."""
from rest_framework import generics
from .models import Mechanic, MaintenanceLog, MaintenancePart
from .serializers import MechanicSerializer, MaintenanceLogSerializer, MaintenancePartSerializer


def _apply_truck_branch(qs, request, truck_field='truck__branch_id'):
    """Apply branch filter via truck relationship."""
    user = request.user
    if not user.is_authenticated:
        return qs.none()
    if getattr(user, 'role', None) == 'SUPER_ADMIN':
        branch_id = request.query_params.get('branch_id')
        if branch_id:
            try:
                return qs.filter(**{truck_field: int(branch_id)})
            except (ValueError, TypeError):
                pass
        return qs
    if user.branch_id:
        return qs.filter(**{truck_field: user.branch_id})
    return qs.none()


class MechanicListCreate(generics.ListCreateAPIView):
    queryset         = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class MechanicDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Mechanic.objects.all()
    serializer_class = MechanicSerializer


class MaintenanceLogListCreate(generics.ListCreateAPIView):
    serializer_class = MaintenanceLogSerializer
    filterset_fields = ('truck', 'status', 'maintenance_type', 'service_date')
    search_fields    = ('description', 'truck__truck_number')

    def get_queryset(self):
        qs = MaintenanceLog.objects.select_related('truck', 'mechanic').prefetch_related('parts_used')
        return _apply_truck_branch(qs, self.request)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class MaintenanceLogDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MaintenanceLogSerializer

    def get_queryset(self):
        qs = MaintenanceLog.objects.all()
        return _apply_truck_branch(qs, self.request)


class MaintenancePartCreate(generics.CreateAPIView):
    queryset         = MaintenancePart.objects.all()
    serializer_class = MaintenancePartSerializer
