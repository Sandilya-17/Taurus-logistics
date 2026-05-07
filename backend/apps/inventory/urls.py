from django.urls import path
from .views import *

urlpatterns = [
    path('suppliers/',              SupplierListCreate.as_view(),  name='supplier-list'),
    path('suppliers/<int:pk>/',     SupplierDetail.as_view(),      name='supplier-detail'),
    path('locations/',              LocationListCreate.as_view(),  name='location-list'),
    path('locations/<int:pk>/',     LocationDetail.as_view(),      name='location-detail'),
    path('items/',                  ItemListCreate.as_view(),       name='item-list'),
    path('items/<int:pk>/',         ItemDetail.as_view(),           name='item-detail'),
    path('ledger/',                 StockLedgerList.as_view(),      name='ledger-list'),
    path('closing-stock/',          ClosingStockView.as_view(),     name='closing-stock'),
    path('available-stock/',        available_stock,                name='available-stock'),
    path('purchases/',              PurchaseListCreate.as_view(),   name='purchase-list'),
    path('purchases/<int:pk>/',     PurchaseDetail.as_view(),       name='purchase-detail'),
    path('purchases/preview/',      PurchasePreviewView.as_view(),  name='purchase-preview'),
    path('issues/',                 IssueListCreate.as_view(),      name='issue-list'),
    path('issues/<int:pk>/',        IssueDetail.as_view(),          name='issue-detail'),
    path('opening-stock/',          post_opening_stock,             name='opening-stock'),
]
