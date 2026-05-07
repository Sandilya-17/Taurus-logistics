"""apps/trucks/models.py – Truck fleet management."""
from django.db import models
from django.utils import timezone
from datetime import timedelta
from apps.core.models import SoftDeleteModel


class Truck(SoftDeleteModel):
    ACTIVE   = 'ACTIVE'
    INACTIVE = 'INACTIVE'
    STATUS_CHOICES = [(ACTIVE,'Active'),(INACTIVE,'Inactive')]

    truck_number    = models.CharField(max_length=20, unique=True)
    model           = models.CharField(max_length=100)
    make            = models.CharField(max_length=100, blank=True)
    year            = models.PositiveSmallIntegerField(null=True, blank=True)
    chassis_number  = models.CharField(max_length=50, blank=True)
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ACTIVE)
    inactive_reason = models.TextField(blank=True, help_text='Mandatory when status is INACTIVE')

    # Expiry dates
    insurance_expiry = models.DateField(null=True, blank=True)
    dvla_expiry      = models.DateField(null=True, blank=True)
    fitness_expiry   = models.DateField(null=True, blank=True)
    permit_expiry    = models.DateField(null=True, blank=True)

    # VIT – Vehicle Income Tax (every 3 months)
    vit_last_paid_date = models.DateField(null=True, blank=True)
    vit_next_due_date  = models.DateField(null=True, blank=True)

    current_odometer = models.DecimalField(max_digits=10, decimal_places=1, default=0)

    class Meta:
        db_table = 'trucks'
        ordering = ['truck_number']

    def __str__(self): return f"{self.truck_number} – {self.model}"

    def save(self, *args, **kwargs):
        # Auto-calculate VIT next due (last paid + 90 days)
        if self.vit_last_paid_date:
            self.vit_next_due_date = self.vit_last_paid_date + timedelta(days=90)
        # Enforce inactive reason
        if self.status == self.INACTIVE and not self.inactive_reason:
            raise ValueError('inactive_reason is mandatory when status is INACTIVE.')
        super().save(*args, **kwargs)

    def expiry_alerts(self):
        """Returns list of expiry warning dicts."""
        today  = timezone.now().date()
        alerts = []
        fields = {
            'Insurance': self.insurance_expiry,
            'DVLA':      self.dvla_expiry,
            'Fitness':   self.fitness_expiry,
            'Permit':    self.permit_expiry,
            'VIT':       self.vit_next_due_date,
        }
        for name, date in fields.items():
            if not date: continue
            days = (date - today).days
            if days <= 30:
                alerts.append({'name': name, 'date': date, 'days_remaining': days,
                                'level': 'DANGER' if days <= 7 else 'WARNING'})
        return alerts


class TruckDocument(models.Model):
    truck         = models.ForeignKey(Truck, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50)   # e.g. Insurance, DVLA
    file          = models.FileField(upload_to='trucks/documents/')
    uploaded_at   = models.DateTimeField(auto_now_add=True)
    uploaded_by   = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'truck_documents'
