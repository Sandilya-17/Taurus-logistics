"""apps/trips/models.py – Trip management."""
from decimal import Decimal
from django.db import models
from django.db.models import Sum
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

    # Auto-aggregated from fuel logs and spare part issues linked to this trip
    fuel_cost        = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                                           help_text='Auto-summed from fuel logs linked to this trip')
    spare_parts_cost = models.DecimalField(max_digits=14, decimal_places=2, default=0,
                                           help_text='Auto-summed from spare part issues linked to this trip')

    remark         = models.TextField(blank=True)
    created_by     = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'trips'
        ordering = ['-loading_time']

    def __str__(self): return f"{self.waybill_no} | {self.origin} → {self.destination}"

    @property
    def net_profit(self):
        return self.trip_revenue - self.fuel_cost - self.spare_parts_cost

    @property
    def duration_display(self):
        if not self.trip_duration_minutes:
            return None
        h, m = divmod(self.trip_duration_minutes, 60)
        return f"{h}h {m}m" if h else f"{m}m"

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

        # When trip is completed → auto-create Revenue and Expenditure entries
        if self.status == self.COMPLETED:
            self._sync_finance()

    def _sync_finance(self):
        """On completion: upsert Revenue and Expenditure records for this trip.

        Revenue  → keyed by (trip, source)         — Revenue has a trip FK.
        Expenditure → keyed by (truck, category, reference=waybill_no)
                      — Expenditure has NO trip FK, only truck FK.
        """
        from apps.finance.models import Revenue, Expenditure

        trip_date = self.unloading_time.date() if self.unloading_time else self.loading_time.date()

        # ── Revenue ──
        if self.trip_revenue and self.trip_revenue > 0:
            Revenue.objects.update_or_create(
                trip=self,
                source=Revenue.TRIP_REVENUE,
                defaults=dict(
                    amount=self.trip_revenue,
                    date=trip_date,
                    description=f"Trip {self.waybill_no} Revenue",
                ),
            )

        # ── Expenditure: Fuel ──
        # Expenditure has no trip FK; use truck + category + reference (waybill_no) as upsert key.
        if self.fuel_cost and self.fuel_cost > 0:
            Expenditure.objects.update_or_create(
                truck=self.truck,
                category=Expenditure.FUEL,
                reference=self.waybill_no,
                defaults=dict(
                    amount=self.fuel_cost,
                    date=trip_date,
                    description=f"Trip {self.waybill_no} Fuel Cost",
                ),
            )

        # ── Expenditure: Spare Parts ──
        if self.spare_parts_cost and self.spare_parts_cost > 0:
            Expenditure.objects.update_or_create(
                truck=self.truck,
                category=Expenditure.SPARE_PART,
                reference=self.waybill_no,
                defaults=dict(
                    amount=self.spare_parts_cost,
                    date=trip_date,
                    description=f"Trip {self.waybill_no} Spare Parts Cost",
                ),
            )

    def recalculate_costs(self):
        """Re-aggregate fuel_cost and spare_parts_cost from linked records, then save.

        Guards against the case where issue_items.trip_id has not yet been
        migrated on the live database by catching OperationalError / ProgrammingError.
        """
        from django.db import OperationalError, ProgrammingError
        from apps.fuel.models import FuelLog
        from apps.inventory.models import IssueItem

        fuel_total = FuelLog.objects.filter(trip=self).aggregate(
            t=Sum('total_cost'))['t'] or Decimal('0')

        try:
            spare_total = IssueItem.objects.filter(trip=self).aggregate(
                t=Sum('final_amount'))['t'] or Decimal('0')
        except (OperationalError, ProgrammingError):
            # Column issue_items.trip_id not yet in DB — skip spare parts calc
            spare_total = Decimal('0')

        Trip.objects.filter(pk=self.pk).update(
            fuel_cost=fuel_total,
            spare_parts_cost=spare_total,
        )
        self.fuel_cost        = fuel_total
        self.spare_parts_cost = spare_total
