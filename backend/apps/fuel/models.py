"""apps/fuel/models.py – Fuel control with excess detection."""
from decimal import Decimal
from django.db import models
from apps.core.models import TimeStampedModel


class FuelLimit(TimeStampedModel):
    """Per-truck fuel limits."""
    truck      = models.OneToOneField('trucks.Truck', on_delete=models.CASCADE, related_name='fuel_limit')
    fuel_limit = models.DecimalField(max_digits=8, decimal_places=2, help_text='Max litres per fill')

    class Meta:
        db_table = 'fuel_limits'

    def __str__(self): return f"{self.truck.truck_number} – limit {self.fuel_limit}L"


class FuelLog(TimeStampedModel):
    """Every fuel fill-up.  excess_fuel is auto-calculated."""
    truck       = models.ForeignKey('trucks.Truck', on_delete=models.PROTECT, related_name='fuel_logs')
    trip        = models.ForeignKey('trips.Trip',   on_delete=models.SET_NULL, null=True, blank=True, related_name='fuel_logs')
    date        = models.DateField()
    litres      = models.DecimalField(max_digits=8, decimal_places=2)
    fuel_limit  = models.DecimalField(max_digits=8, decimal_places=2)

    # Auto-calculated
    excess_fuel = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    price_per_litre = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_cost      = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    odometer    = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    remark      = models.TextField(blank=True)
    created_by  = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'fuel_logs'
        ordering = ['-date']

    def save(self, *args, **kwargs):
        # Auto-calculate excess
        self.excess_fuel = max(Decimal('0'), self.litres - self.fuel_limit)
        # Mandatory remark if excess
        if self.excess_fuel > 0 and not self.remark.strip():
            raise ValueError('Remark is mandatory when fuel issued exceeds the limit.')
        # Auto-calculate total cost
        self.total_cost = self.litres * self.price_per_litre
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.truck.truck_number} | {self.date} | {self.litres}L"
