"""apps/trips/signals.py

When a Trip is deleted, clean up all Revenue records linked to it:
  1. Revenue rows where revenue.trip = this trip (TRIP_REVENUE source)
  2. Revenue rows where revenue.invoice.trip = this trip (HAULAGE from invoice)

This keeps the dashboard counts and totals accurate after trip deletion.
"""
from django.db.models.signals import pre_delete
from django.dispatch import receiver


@receiver(pre_delete, sender='trips.Trip')
def delete_trip_revenue(sender, instance, **kwargs):
    """Delete all Revenue entries associated with this trip before it is removed."""
    from apps.finance.models import Revenue

    # 1. Direct trip-linked revenue (auto-created when trip status → COMPLETED)
    Revenue.objects.filter(trip=instance).delete()

    # 2. Invoice-linked revenue (auto-created when invoice marked PAID)
    #    The invoice stays (it's a financial record), but its revenue entry is removed.
    Revenue.objects.filter(invoice__trip=instance).delete()
