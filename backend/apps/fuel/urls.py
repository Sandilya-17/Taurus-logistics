from django.urls import path
from .views import *

urlpatterns = [
    path('limits/',          FuelLimitListCreate.as_view(), name='fuel-limit-list'),
    path('limits/<int:pk>/', FuelLimitDetail.as_view(),     name='fuel-limit-detail'),
    path('logs/',            FuelLogListCreate.as_view(),   name='fuel-log-list'),
    path('logs/<int:pk>/',   FuelLogDetail.as_view(),       name='fuel-log-detail'),
    path('preview/',         FuelPreviewView.as_view(),     name='fuel-preview'),
]
