from django.apps import AppConfig


class TripsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.trips'
    label = 'trips'

    def ready(self):
        # Connect the pre_delete signal using explicit connect() — more reliable
        # than @receiver inside ready() which can fire multiple times.
        from django.db.models.signals import pre_delete
        from apps.trips.models import Trip

        pre_delete.connect(_delete_trip_revenue, sender=Trip, dispatch_uid='trips.delete_revenue')


def _delete_trip_revenue(sender, instance, **kwargs):
    """
    Before a Trip is deleted, remove ALL Revenue rows linked to it so the
    dashboard figures stay accurate:
      1. Revenue.trip = this trip  (auto-created when trip → COMPLETED)
      2. Revenue.invoice.trip = this trip  (auto-created when invoice → PAID)
    """
    from apps.finance.models import Revenue
    Revenue.objects.filter(trip=instance).delete()
    Revenue.objects.filter(invoice__trip=instance).delete()
