from django.urls import path
from .views import *

urlpatterns = [
    path('',                            TyreListCreate.as_view(),  name='tyre-list'),
    path('<int:pk>/',                   TyreDetail.as_view(),       name='tyre-detail'),
    path('assign/',                     TyreAssignView.as_view(),   name='tyre-assign'),
    path('remove/<int:assignment_id>/', TyreRemoveView.as_view(),   name='tyre-remove'),
    path('swap/',                       TyreSwapView.as_view(),     name='tyre-swap'),
    path('assignments/',                AssignmentList.as_view(),   name='assignment-list'),
    path('swaps/',                      SwapList.as_view(),         name='swap-list'),
]
