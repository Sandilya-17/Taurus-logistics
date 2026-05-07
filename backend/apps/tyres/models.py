"""apps/tyres/models.py – Tyre tracking as inventory asset + fitted asset."""
from decimal import Decimal
from django.db import models
from apps.core.models import SoftDeleteModel, TimeStampedModel


class Tyre(SoftDeleteModel):
    STORE     = 'STORE'
    FITTED    = 'FITTED'
    WORKSHOP  = 'WORKSHOP'
    CONDEMNED = 'CONDEMNED'
    STATUS_CHOICES = [(STORE,'In Store'),(FITTED,'Fitted'),(WORKSHOP,'Workshop'),(CONDEMNED,'Condemned')]

    serial_number = models.CharField(max_length=50, unique=True)
    brand         = models.CharField(max_length=100)
    model         = models.CharField(max_length=100)
    size          = models.CharField(max_length=30)
    unit_cost     = models.DecimalField(max_digits=12, decimal_places=2)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STORE)

    # Links to inventory item (for stock ledger)
    inventory_item = models.ForeignKey('inventory.Item', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'tyres'
        ordering = ['serial_number']

    def __str__(self): return f"{self.serial_number} ({self.brand} {self.size})"

    @property
    def current_assignment(self):
        return self.assignments.filter(removed_at__isnull=True).first()


class TyreAssignment(TimeStampedModel):
    """Active fitting of a tyre to a truck position."""
    tyre         = models.ForeignKey(Tyre,           on_delete=models.PROTECT, related_name='assignments')
    truck        = models.ForeignKey('trucks.Truck', on_delete=models.PROTECT, related_name='tyre_assignments')
    position     = models.CharField(max_length=10)   # FL, FR, RL1, RL2, RR1, RR2…
    fitted_at    = models.DateTimeField(auto_now_add=True)
    odometer_fit = models.DecimalField(max_digits=10, decimal_places=1, default=0)

    # Removal
    removed_at     = models.DateTimeField(null=True, blank=True)
    odometer_remove = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    km_used         = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    removal_reason  = models.TextField(blank=True)

    class Meta:
        db_table = 'tyre_assignments'
        ordering = ['-fitted_at']

    def close(self, odometer_remove, reason=''):
        from django.utils import timezone
        self.removed_at      = timezone.now()
        self.odometer_remove = odometer_remove
        self.km_used         = Decimal(str(odometer_remove)) - self.odometer_fit
        self.removal_reason  = reason
        self.save()
        self.tyre.status = Tyre.STORE
        self.tyre.save(update_fields=['status'])


class TyreSwap(TimeStampedModel):
    """History of every tyre swap / rotation."""
    tyre           = models.ForeignKey(Tyre,           on_delete=models.PROTECT, related_name='swaps')
    from_truck     = models.ForeignKey('trucks.Truck', on_delete=models.PROTECT, related_name='swaps_from')
    to_truck       = models.ForeignKey('trucks.Truck', on_delete=models.PROTECT, related_name='swaps_to', null=True, blank=True)
    from_position  = models.CharField(max_length=10)
    to_position    = models.CharField(max_length=10, blank=True)
    swap_date      = models.DateField()
    odometer       = models.DecimalField(max_digits=10, decimal_places=1)
    remarks        = models.TextField(blank=True)
    performed_by   = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'tyre_swaps'
        ordering = ['-swap_date']
