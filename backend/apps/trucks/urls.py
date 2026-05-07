from django.urls import path
from .views import TruckListCreate, TruckDetail, TruckAlerts, TruckDocumentUpload

urlpatterns = [
    path('',              TruckListCreate.as_view(),    name='truck-list'),
    path('<int:pk>/',     TruckDetail.as_view(),         name='truck-detail'),
    path('alerts/',       TruckAlerts.as_view(),         name='truck-alerts'),
    path('documents/',    TruckDocumentUpload.as_view(), name='truck-doc-upload'),
]
