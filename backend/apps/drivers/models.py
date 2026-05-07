"""apps/drivers/models.py – Driver management."""
from django.db import models
from django.utils import timezone
from apps.core.models import SoftDeleteModel


class Driver(SoftDeleteModel):
    ACTIVE    = 'ACTIVE'
    SUSPENDED = 'SUSPENDED'
    RESIGNED  = 'RESIGNED'
    STATUS_CHOICES = [(ACTIVE,'Active'),(SUSPENDED,'Suspended'),(RESIGNED,'Resigned')]

    name            = models.CharField(max_length=150)
    phone           = models.CharField(max_length=20)
    ghana_card_no   = models.CharField(max_length=20, unique=True, help_text='GHA-XXXXXXXXX-X')
    date_of_birth   = models.DateField(null=True, blank=True)
    address         = models.TextField(blank=True)

    # Licence
    licence_number  = models.CharField(max_length=50, unique=True)
    licence_class   = models.CharField(max_length=10, default='C')
    licence_issue_date  = models.DateField(null=True, blank=True)
    licence_expiry_date = models.DateField()

    status           = models.CharField(max_length=10, choices=STATUS_CHOICES, default=ACTIVE)
    assigned_truck   = models.ForeignKey('trucks.Truck', null=True, blank=True, on_delete=models.SET_NULL, related_name='drivers')

    class Meta:
        db_table = 'drivers'
        ordering = ['name']

    def __str__(self): return f"{self.name} ({self.licence_number})"

    @property
    def licence_expired(self):
        return self.licence_expiry_date < timezone.now().date()

    @property
    def can_be_assigned(self):
        return self.status == self.ACTIVE and not self.licence_expired


class DriverDocument(models.Model):
    driver        = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=50)
    file          = models.FileField(upload_to='drivers/documents/')
    uploaded_at   = models.DateTimeField(auto_now_add=True)
    uploaded_by   = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'driver_documents'
