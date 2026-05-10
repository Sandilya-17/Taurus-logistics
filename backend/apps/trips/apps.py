from django.apps import AppConfig


class TripsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.trips'
    label = 'trips'

    def ready(self):
        from django.db.models.signals import pre_delete
        from django.dispatch import receiver
        from apps.trips.models import Trip

        @receiver(pre_delete, sender=Trip)
        def delete_trip_revenue(sender, instance, **kwargs):
            """Delete all Revenue entries linked to this trip before it is removed."""
            from apps.finance.models import Revenue
            # 1. Direct trip revenue (created when trip status -> COMPLETED)
            Revenue.objects.filter(trip=instance).delete()
            # 2. Invoice-linked revenue (created when invoice marked PAID)
            Revenue.objects.filter(invoice__trip=instance).delete()
