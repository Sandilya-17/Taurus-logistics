
"""apps/trips/signals.py"""
from django.db.models.signals import pre_delete
from django.dispatch import receiver


@receiver(pre_delete, sender='trips.Trip')
def delete_trip_revenue(sender, instance, **kwargs):
    from apps.finance.models import Revenue
    Revenue.objects.filter(trip=instance).delete()
    Revenue.objects.filter(invoice__trip=instance).delete()
