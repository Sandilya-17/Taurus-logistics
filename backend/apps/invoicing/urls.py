from django.urls import path
from .views import InvoiceListCreate, InvoiceDetail, InvoiceLineCreate, InvoicePreviewView, InvoicePDFView

urlpatterns = [
    path('',                    InvoiceListCreate.as_view(),  name='invoice-list'),
    path('<int:pk>/',           InvoiceDetail.as_view(),       name='invoice-detail'),
    path('lines/',              InvoiceLineCreate.as_view(),   name='invoice-line-create'),
    path('preview/',            InvoicePreviewView.as_view(),  name='invoice-preview'),
    path('<int:pk>/pdf/',       InvoicePDFView.as_view(),      name='invoice-pdf'),
]
