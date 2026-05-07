"""apps/invoicing/models.py – Invoice generation."""
from decimal import Decimal
from django.db import models
from apps.core.models import TimeStampedModel


class Invoice(TimeStampedModel):
    DRAFT   = 'DRAFT'
    SENT    = 'SENT'
    PAID    = 'PAID'
    OVERDUE = 'OVERDUE'
    STATUS_CHOICES = [(DRAFT,'Draft'),(SENT,'Sent'),(PAID,'Paid'),(OVERDUE,'Overdue')]

    invoice_number = models.CharField(max_length=30, unique=True)
    client_name    = models.CharField(max_length=200)
    client_address = models.TextField(blank=True)
    client_phone   = models.CharField(max_length=20, blank=True)
    invoice_date   = models.DateField()
    due_date       = models.DateField(null=True, blank=True)
    trip           = models.ForeignKey('trips.Trip', null=True, blank=True, on_delete=models.SET_NULL, related_name='invoices')
    status         = models.CharField(max_length=10, choices=STATUS_CHOICES, default=DRAFT)

    vat_applicable = models.BooleanField(default=False)
    vat_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=15)

    # Auto-calculated totals
    subtotal     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    vat_amount   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    paid_amount  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    balance_due  = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    notes      = models.TextField(blank=True)
    created_by = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'invoices'
        ordering = ['-invoice_date']

    def __str__(self): return f"{self.invoice_number} – {self.client_name}"

    def recalculate(self):
        """Recalculate totals from line items."""
        lines    = self.lines.all()
        subtotal = sum(l.line_total for l in lines)
        vat_amt  = (subtotal * self.vat_percentage / 100) if self.vat_applicable else Decimal('0')
        total    = subtotal + vat_amt
        self.subtotal     = subtotal
        self.vat_amount   = vat_amt
        self.total_amount = total
        self.balance_due  = total - self.paid_amount
        self.save(update_fields=['subtotal','vat_amount','total_amount','balance_due'])

    @classmethod
    def generate_number(cls):
        from django.utils import timezone
        year  = timezone.now().year
        count = cls.objects.filter(invoice_date__year=year).count() + 1
        return f"INV-{year}-{count:04d}"


class InvoiceLine(TimeStampedModel):
    invoice     = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='lines')
    description = models.CharField(max_length=300)
    quantity    = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=2)
    line_total  = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'invoice_lines'

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_price
        super().save(*args, **kwargs)
        self.invoice.recalculate()
