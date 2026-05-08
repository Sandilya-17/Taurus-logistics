"""Taurus Trade & Logistics – Root URL Configuration"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views import LoginView, LogoutView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/login/',   LoginView.as_view(),        name='login'),
    path('api/auth/logout/',  LogoutView.as_view(),       name='logout'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Modules
    path('api/users/',       include('apps.users.urls')),
    path('api/inventory/',   include('apps.inventory.urls')),
    path('api/trucks/',      include('apps.trucks.urls')),
    path('api/drivers/',     include('apps.drivers.urls')),
    path('api/trips/',       include('apps.trips.urls')),
    path('api/fuel/',        include('apps.fuel.urls')),
    path('api/tyres/',       include('apps.tyres.urls')),
    path('api/maintenance/', include('apps.maintenance.urls')),
    path('api/finance/',     include('apps.finance.urls')),
    path('api/invoicing/',   include('apps.invoicing.urls')),
    path('api/reports/',     include('apps.reports.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
