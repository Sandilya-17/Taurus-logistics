"""apps/maintenance/models.py – Service logs and preventive maintenance."""
from django.db import models
from apps.core.models import TimeStampedModel


class Mechanic(TimeStampedModel):
    name  = models.CharField(max_length=150)
    phone = models.CharField(max_length=20, blank=True)
    specialty = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'mechanics'

    def __str__(self): return self.name


class MaintenanceLog(TimeStampedModel):
    PREVENTIVE  = 'PREVENTIVE'
    CORRECTIVE  = 'CORRECTIVE'
    BREAKDOWN   = 'BREAKDOWN'
    TYPE_CHOICES = [(PREVENTIVE,'Preventive'),(CORRECTIVE,'Corrective'),(BREAKDOWN,'Breakdown')]

    PENDING     = 'PENDING'
    IN_PROGRESS = 'IN_PROGRESS'
    DONE        = 'DONE'
    STATUS_CHOICES = [(PENDING,'Pending'),(IN_PROGRESS,'In Progress'),(DONE,'Done')]

    truck           = models.ForeignKey('trucks.Truck', on_delete=models.PROTECT, related_name='maintenance_logs')
    mechanic        = models.ForeignKey(Mechanic, null=True, blank=True, on_delete=models.SET_NULL)
    maintenance_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    description     = models.TextField()
    odometer_at_service = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    service_date    = models.DateField()
    next_service_date = models.DateField(null=True, blank=True)
    next_service_odometer = models.DecimalField(max_digits=10, decimal_places=1, null=True, blank=True)
    labour_cost     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    parts_cost      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_cost      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status          = models.CharField(max_length=15, choices=STATUS_CHOICES, default=PENDING)
    remark          = models.TextField(blank=True)
    created_by      = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'maintenance_logs'
        ordering = ['-service_date']

    def save(self, *args, **kwargs):
        self.total_cost = self.labour_cost + self.parts_cost
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.truck.truck_number} | {self.maintenance_type} | {self.service_date}"


class MaintenancePart(TimeStampedModel):
    """Spare parts consumed in a maintenance job."""
    maintenance = models.ForeignKey(MaintenanceLog, on_delete=models.CASCADE, related_name='parts_used')
    item        = models.ForeignKey('inventory.Item', on_delete=models.PROTECT)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'maintenance_parts'

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)
