"""apps/reports/urls.py"""
from django.urls import path
from .views import (
    DashboardSummaryView,
    RevenueExpenditureReportView,
    FuelReportView,
    TripReportView,
    StockReportView,
    InvoiceReportView,
    SparePartsReportView,
    MaintenanceReportView,
    VATReportView,
    TyreReportView,
    LubricantReportView,
)

urlpatterns = [
    path('dashboard/',            DashboardSummaryView.as_view(),          name='dashboard'),
    path('revenue-expenditure/',  RevenueExpenditureReportView.as_view(),  name='report-rev-exp'),
    path('fuel/',                 FuelReportView.as_view(),                name='report-fuel'),
    path('trips/',                TripReportView.as_view(),                name='report-trips'),
    path('stock/',                StockReportView.as_view(),               name='report-stock'),
    path('invoices/',             InvoiceReportView.as_view(),             name='report-invoices'),
    path('spare-parts/',          SparePartsReportView.as_view(),          name='report-spare-parts'),
    path('maintenance/',          MaintenanceReportView.as_view(),         name='report-maintenance'),
    path('vat/',                  VATReportView.as_view(),                 name='report-vat'),
    path('tyres/',                TyreReportView.as_view(),                name='report-tyres'),
    path('lubricants/',           LubricantReportView.as_view(),           name='report-lubricants'),
]
