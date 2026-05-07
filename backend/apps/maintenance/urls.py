from django.urls import path
from .views import *

urlpatterns = [
    path('mechanics/',          MechanicListCreate.as_view(),       name='mechanic-list'),
    path('mechanics/<int:pk>/', MechanicDetail.as_view(),           name='mechanic-detail'),
    path('logs/',               MaintenanceLogListCreate.as_view(), name='maintenance-list'),
    path('logs/<int:pk>/',      MaintenanceLogDetail.as_view(),     name='maintenance-detail'),
    path('parts/',              MaintenancePartCreate.as_view(),    name='maintenance-part-create'),
]
