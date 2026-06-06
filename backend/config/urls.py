"""Taurus Trade & Logistics – Root URL Configuration (Enterprise Edition)"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.utils import timezone
from rest_framework_simplejwt.views import TokenRefreshView
from apps.users.views import LoginView, LogoutView


# ── Health-check endpoint (used by Railway/Docker/K8s probes) ───────────────
def health_check(request):
    """Lightweight liveness + readiness probe."""
    from django.db import connection
    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    status = 200 if db_ok else 503
    return JsonResponse({
        'status': 'ok' if db_ok else 'degraded',
        'db': 'ok' if db_ok else 'error',
        'timestamp': timezone.now().isoformat(),
    }, status=status)


urlpatterns = [
    # ── Internal probes ────────────────────────────────────────────────────
    path('health/', health_check, name='health-check'),

    # ── Django admin ───────────────────────────────────────────────────────
    path('admin/', admin.site.urls),

    # ── Auth ───────────────────────────────────────────────────────────────
    path('api/auth/login/',   LoginView.as_view(),        name='login'),
    path('api/auth/logout/',  LogoutView.as_view(),       name='logout'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Core (suppliers, vendors, audit logs, system alerts) ───────────────
    path('api/core/',        include('apps.core.urls')),

    # ── Modules ────────────────────────────────────────────────────────────
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
