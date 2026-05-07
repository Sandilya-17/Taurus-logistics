from django.urls import path
from .views import TripListCreate, TripDetail, TripPreviewView

urlpatterns = [
    path('',            TripListCreate.as_view(),  name='trip-list'),
    path('<int:pk>/',   TripDetail.as_view(),       name='trip-detail'),
    path('preview/',    TripPreviewView.as_view(),  name='trip-preview'),
]
