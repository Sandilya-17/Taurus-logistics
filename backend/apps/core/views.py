"""apps/core/views.py – Suppliers, Vendors, System Alerts, Audit Log."""
import logging
from rest_framework import generics, status, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from apps.users.models import User
from .models import Supplier, Vendor, SystemAlert, AuditLog
from .serializers import (
    SupplierSerializer, VendorSerializer,
    SystemAlertSerializer, AuditLogSerializer,
)

logger = logging.getLogger('apps.core')


class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in (User.ADMIN, User.SUPER_ADMIN))


class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


class SupplierListCreateView(generics.ListCreateAPIView):
    serializer_class = SupplierSerializer
    filter_backends  = [filters.SearchFilter, filters.OrderingFilter]
    search_fields    = ['name', 'contact', 'email', 'tin']
    ordering_fields  = ['name', 'created_at']

    def get_queryset(self):
        return Supplier.objects.all().order_by('name')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]


class SupplierDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Supplier.objects.all()
    serializer_class = SupplierSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAdmin()]


class VendorListCreateView(generics.ListCreateAPIView):
    serializer_class = VendorSerializer
    filter_backends  = [filters.SearchFilter]
    search_fields    = ['name', 'contact', 'email']

    def get_queryset(self):
        return Vendor.objects.all().order_by('name')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]


class VendorDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Vendor.objects.all()
    serializer_class = VendorSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsManagerOrAdmin()]


class SystemAlertListView(generics.ListAPIView):
    serializer_class = SystemAlertSerializer
    filter_backends  = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['level', 'is_read', 'alert_type']
    ordering_fields  = ['created_at', 'level']

    def get_queryset(self):
        qs = SystemAlert.objects.all()
        if self.request.query_params.get('unread', '').lower() == 'true':
            qs = qs.filter(is_read=False)
        return qs


class SystemAlertMarkReadView(APIView):
    def post(self, request):
        if request.data.get('all'):
            count = SystemAlert.objects.filter(is_read=False).update(is_read=True)
            return Response({'marked_read': count})
        ids = request.data.get('ids', [])
        if not isinstance(ids, list):
            return Response({'error': True, 'message': 'ids must be a list.'}, status=400)
        count = SystemAlert.objects.filter(id__in=ids).update(is_read=True)
        return Response({'marked_read': count})


class AuditLogListView(generics.ListAPIView):
    """
    Audit Log access rules:
    - SUPER_ADMIN: sees audit logs for ALL branches (optionally filtered by ?branch_id=)
    - ADMIN: sees audit logs for their own branch only
    - Others: not permitted (IsAdminUser permission class blocks them)
    """
    serializer_class   = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filter_backends    = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields   = ['action', 'model_name', 'http_method']
    search_fields      = ['user__email', 'endpoint', 'object_repr']
    ordering_fields    = ['created_at']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs       = AuditLog.objects.select_related('user').order_by('-created_at')
        req_user = self.request.user

        if req_user.role == User.SUPER_ADMIN:
            # SUPER_ADMIN sees all branches, with optional ?branch_id= filter
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                try:
                    qs = qs.filter(user__branch_id=int(branch_id))
                except (ValueError, TypeError):
                    pass
            # else: return all audit logs across all branches
        else:
            # ADMIN: strictly scoped to their own branch
            if req_user.branch_id:
                qs = qs.filter(user__branch=req_user.branch)
            else:
                qs = qs.none()

        user_id = self.request.query_params.get('user')
        if user_id:
            qs = qs.filter(user_id=user_id)
        return qs
