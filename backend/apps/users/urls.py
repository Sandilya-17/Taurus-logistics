from django.urls import path
from .views import (
    UserListCreateView, UserDetailView, MeView,
    BranchListCreateView, BranchDetailView,
    LoginView, LogoutView,
)

urlpatterns = [
    path('',                  UserListCreateView.as_view(), name='user-list'),
    path('me/',               MeView.as_view(),             name='user-me'),
    path('<int:pk>/',         UserDetailView.as_view(),     name='user-detail'),
    path('branches/',         BranchListCreateView.as_view(), name='branch-list'),
    path('branches/<int:pk>/', BranchDetailView.as_view(),   name='branch-detail'),
]
