"""apps/core/urls.py – Audit logs, system alerts, suppliers, vendors."""
from django.urls import path
from .views import (
    SupplierListCreateView, SupplierDetailView,
    VendorListCreateView, VendorDetailView,
    SystemAlertListView, SystemAlertMarkReadView,
    AuditLogListView,
)

urlpatterns = [
    # Suppliers
    path('suppliers/',          SupplierListCreateView.as_view(), name='supplier-list'),
    path('suppliers/<int:pk>/', SupplierDetailView.as_view(),     name='supplier-detail'),

    # Vendors
    path('vendors/',            VendorListCreateView.as_view(),   name='vendor-list'),
    path('vendors/<int:pk>/',   VendorDetailView.as_view(),       name='vendor-detail'),

    # System alerts
    path('alerts/',             SystemAlertListView.as_view(),    name='alert-list'),
    path('alerts/mark-read/',   SystemAlertMarkReadView.as_view(), name='alert-mark-read'),

    # Audit log (admin-only read)
    path('audit/',              AuditLogListView.as_view(),       name='audit-log'),
]
