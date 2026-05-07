"""apps/trips/models.py – Trip management."""
from decimal import Decimal
from django.db import models
from apps.core.models import TimeStampedModel


class Trip(TimeStampedModel):
    PLANNED   = 'PLANNED'
    EN_ROUTE  = 'EN_ROUTE'
    DELAYED   = 'DELAYED'
    COMPLETED = 'COMPLETED'
    CANCELLED = 'CANCELLED'
    STATUS_CHOICES = [
        (PLANNED,'Planned'),(EN_ROUTE,'En Route'),
        (DELAYED,'Delayed'),(COMPLETED,'Completed'),(CANCELLED,'Cancelled'),
    ]

    truck         = models.ForeignKey('trucks.Truck',   on_delete=models.PROTECT, related_name='trips')
    driver        = models.ForeignKey('drivers.Driver', on_delete=models.PROTECT, related_name='trips')
    waybill_no    = models.CharField(max_length=50, unique=True)
    origin        = models.CharField(max_length=150)
    destination   = models.CharField(max_length=150)
    material_type = models.CharField(max_length=100)
    loaded_qty    = models.DecimalField(max_digits=10, decimal_places=3)
    delivered_qty = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)

    # Auto-calculated
    qty_difference = models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)

    loading_time    = models.DateTimeField()
    unloading_time  = models.DateTimeField(null=True, blank=True)

    # Auto-calculated (stored for reporting)
    trip_duration_minutes = models.IntegerField(null=True, blank=True)

    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default=PLANNED)
    rate_per_ton   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    trip_revenue   = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    remark         = models.TextField(blank=True)
    created_by     = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'trips'
        ordering = ['-loading_time']

    def __str__(self): return f"{self.waybill_no} | {self.origin} → {self.destination}"

    def save(self, *args, **kwargs):
        # Auto-calculate quantity difference
        if self.delivered_qty is not None:
            self.qty_difference = self.loaded_qty - self.delivered_qty

        # Auto-calculate trip duration
        if self.unloading_time and self.loading_time:
            delta = self.unloading_time - self.loading_time
            self.trip_duration_minutes = int(delta.total_seconds() / 60)

        # Auto-calculate revenue
        if self.delivered_qty and self.rate_per_ton:
            self.trip_revenue = self.delivered_qty * self.rate_per_ton

        # Validate driver can be assigned
        if self.driver.licence_expired:
            raise ValueError(f"Driver {self.driver.name} has an expired licence.")
        if self.truck.status != 'ACTIVE':
            raise ValueError(f"Truck {self.truck.truck_number} is not active.")

        super().save(*args, **kwargs)

    @property
    def duration_display(self):
        if not self.trip_duration_minutes:
            return None
        h = self.trip_duration_minutes // 60
        m = self.trip_duration_minutes % 60
        return f"{h}h {m}m"
