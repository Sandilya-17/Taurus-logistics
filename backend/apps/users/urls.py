from django.urls import path
from .views import UserListCreateView, UserDetailView, MeView

urlpatterns = [
    path('',         UserListCreateView.as_view(), name='user-list'),
    path('me/',      MeView.as_view(),             name='user-me'),
    path('<int:pk>/', UserDetailView.as_view(),    name='user-detail'),
]
