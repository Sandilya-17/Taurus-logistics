from django.apps import AppConfig

class TripsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.trips'
    label = 'trips'

    def ready(self):
        import apps.trips.signals  # noqa: F401
