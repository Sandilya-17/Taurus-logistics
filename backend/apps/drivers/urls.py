from django.urls import path
from .views import DriverListCreate, DriverDetail, DriverDocumentUpload

urlpatterns = [
    path('',           DriverListCreate.as_view(),    name='driver-list'),
    path('<int:pk>/',  DriverDetail.as_view(),         name='driver-detail'),
    path('documents/', DriverDocumentUpload.as_view(), name='driver-doc-upload'),
]
