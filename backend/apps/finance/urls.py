from django.urls import path
from .views import ExpenditureListCreate, ExpenditureDetail, RevenueListCreate, RevenueDetail

urlpatterns = [
    path('expenditure/',          ExpenditureListCreate.as_view(), name='expenditure-list'),
    path('expenditure/<int:pk>/', ExpenditureDetail.as_view(),     name='expenditure-detail'),
    path('revenue/',              RevenueListCreate.as_view(),     name='revenue-list'),
    path('revenue/<int:pk>/',     RevenueDetail.as_view(),         name='revenue-detail'),
]
