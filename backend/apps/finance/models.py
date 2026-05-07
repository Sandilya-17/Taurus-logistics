"""apps/finance/models.py – Revenue and Expenditure tracking."""
from decimal import Decimal
from django.db import models
from apps.core.models import TimeStampedModel


class Expenditure(TimeStampedModel):
    FUEL        = 'FUEL'
    MAINTENANCE = 'MAINTENANCE'
    TYRE        = 'TYRE'
    SPARE_PART  = 'SPARE_PART'
    DRIVER_WAGE = 'DRIVER_WAGE'
    TOLL        = 'TOLL'
    ADMIN       = 'ADMIN'
    OTHER       = 'OTHER'

    CATEGORY_CHOICES = [
        (FUEL,        'Fuel'),
        (MAINTENANCE, 'Maintenance'),
        (TYRE,        'Tyre'),
        (SPARE_PART,  'Spare Part'),
        (DRIVER_WAGE, 'Driver Wage'),
        (TOLL,        'Toll'),
        (ADMIN,       'Admin'),
        (OTHER,       'Other'),
    ]

    truck       = models.ForeignKey(
        'trucks.Truck', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='expenditures'
    )
    vendor      = models.ForeignKey(
        'core.Vendor', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='expenditures'
    )
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    description = models.TextField(blank=True)
    amount      = models.DecimalField(max_digits=14, decimal_places=2)
    date        = models.DateField()
    reference   = models.CharField(max_length=100, blank=True)
    receipt     = models.FileField(upload_to='finance/receipts/', null=True, blank=True)
    created_by  = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        db_table = 'expenditures'
        ordering = ['-date']

    def __str__(self):
        return f"{self.category} | GH₵ {self.amount} | {self.date}"


class Revenue(TimeStampedModel):
    # Core sources
    HAULAGE      = 'HAULAGE'
    OTHER        = 'OTHER'

    # Extended sources
    TRIP_REVENUE = 'TRIP_REVENUE'
    TRUCK_RENTAL = 'TRUCK_RENTAL'
    SPARE_SALE   = 'SPARE_SALE'
    FUEL_REBATE  = 'FUEL_REBATE'
    COMMISSION   = 'COMMISSION'
    INSURANCE    = 'INSURANCE'

    SOURCE_CHOICES = [
        (HAULAGE,      'Haulage (Invoice)'),
        (TRIP_REVENUE, 'Trip Revenue'),
        (TRUCK_RENTAL, 'Truck Rental'),
        (SPARE_SALE,   'Spare Parts Sale'),
        (FUEL_REBATE,  'Fuel Rebate'),
        (COMMISSION,   'Commission'),
        (INSURANCE,    'Insurance Recovery'),
        (OTHER,        'Other Income'),
    ]

    invoice = models.ForeignKey(
        'invoicing.Invoice', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='revenue_entries'
    )
    trip = models.ForeignKey(
        'trips.Trip', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='revenue_entries'
    )
    source = models.CharField(
        max_length=20, choices=SOURCE_CHOICES, default=HAULAGE
    )
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=14, decimal_places=2)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True)
    created_by = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        db_table = 'revenues'
        ordering = ['-date']

    def __str__(self):
        return f"{self.source} | GH₵ {self.amount} | {self.date}"