"""apps/inventory/models.py – Items, Locations, Stock Ledger (transaction-based)."""
from decimal import Decimal
from django.db import models
from django.db.models import Sum
from apps.core.models import SoftDeleteModel, TimeStampedModel


class Location(SoftDeleteModel):
    STORE     = 'STORE'
    WORKSHOP  = 'WORKSHOP'
    BREAKDOWN = 'BREAKDOWN'
    TYPE_CHOICES = [(STORE,'Store'),(WORKSHOP,'Workshop'),(BREAKDOWN,'Breakdown')]

    name          = models.CharField(max_length=100)
    location_type = models.CharField(max_length=15, choices=TYPE_CHOICES)
    address       = models.TextField(blank=True)

    class Meta:
        db_table = 'locations'

    def __str__(self): return f"{self.name} ({self.location_type})"


class Item(SoftDeleteModel):
    SPARE_PART = 'SPARE_PART'
    TYRE       = 'TYRE'
    MATERIAL   = 'MATERIAL'
    LUBRICANT  = 'LUBRICANT'
    TYPE_CHOICES = [(SPARE_PART,'Spare Part'),(TYRE,'Tyre'),(MATERIAL,'Material'),(LUBRICANT,'Lubricant')]

    name        = models.CharField(max_length=200, unique=True)
    item_type   = models.CharField(max_length=15, choices=TYPE_CHOICES)
    unit        = models.CharField(max_length=30, default='pcs', help_text='e.g. pcs, litres, kg')
    description = models.TextField(blank=True)
    reorder_level = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        db_table = 'items'

    def __str__(self): return self.name

    def available_qty(self, location=None, as_of=None):
        """Dynamically calculate current stock from ledger."""
        qs = StockLedger.objects.filter(item=self)
        if location:
            qs = qs.filter(location=location)
        if as_of:
            qs = qs.filter(created_at__lte=as_of)
        result = qs.aggregate(total=Sum('quantity'))['total']
        return result or Decimal('0')

    def available_value(self, location=None, as_of=None):
        """Dynamically calculate current stock value from ledger."""
        qs = StockLedger.objects.filter(item=self)
        if location:
            qs = qs.filter(location=location)
        if as_of:
            qs = qs.filter(created_at__lte=as_of)
        result = qs.aggregate(total=Sum('final_amount'))['total']
        return result or Decimal('0')


class StockLedger(TimeStampedModel):
    """
    TRANSACTION-BASED stock ledger.
    ─ Inward  : positive quantity (OPENING, PURCHASE, TRANSFER_IN)
    ─ Outward : negative quantity (ISSUE, TRANSFER_OUT)

    Closing stock = SUM(quantity)
    Closing value = SUM(final_amount)

    NEVER store closing stock as a field. Always compute dynamically.
    """
    OPENING      = 'OPENING'
    PURCHASE     = 'PURCHASE'
    ISSUE        = 'ISSUE'
    TRANSFER_IN  = 'TRANSFER_IN'
    TRANSFER_OUT = 'TRANSFER_OUT'
    ADJUSTMENT   = 'ADJUSTMENT'

    TRANSACTION_CHOICES = [
        (OPENING,      'Opening Balance'),
        (PURCHASE,     'Purchase'),
        (ISSUE,        'Issue'),
        (TRANSFER_IN,  'Transfer In'),
        (TRANSFER_OUT, 'Transfer Out'),
        (ADJUSTMENT,   'Adjustment'),
    ]

    item             = models.ForeignKey(Item,     on_delete=models.PROTECT, related_name='ledger_entries')
    location         = models.ForeignKey(Location, on_delete=models.PROTECT, related_name='ledger_entries')
    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_CHOICES)

    # Quantity: positive = inward, negative = outward
    quantity         = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # VAT fields
    vat_applicable   = models.BooleanField(default=False)
    vat_percentage   = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    vat_amount       = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Computed (stored for reporting performance)
    base_amount      = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    final_amount     = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    # Reference to originating transaction
    reference_type   = models.CharField(max_length=50, blank=True)
    reference_id     = models.BigIntegerField(null=True, blank=True)
    remark           = models.TextField(blank=True)

    created_by       = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='stock_ledger_entries'
    )

    class Meta:
        db_table = 'stock_ledger'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['item', 'location', 'created_at']),
            models.Index(fields=['transaction_type', 'created_at']),
        ]

    def save(self, *args, **kwargs):
        # ── Auto-calculate amounts before saving ──
        self.base_amount = abs(self.quantity) * self.unit_price
        if self.vat_applicable and self.vat_percentage:
            self.vat_amount  = self.base_amount * (self.vat_percentage / 100)
        else:
            self.vat_amount  = Decimal('0')
            self.vat_percentage = Decimal('0')
        self.final_amount = self.base_amount + self.vat_amount
        # Preserve sign of quantity in final_amount
        if self.quantity < 0:
            self.final_amount = -self.final_amount
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.transaction_type} | {self.item.name} | qty={self.quantity}"


class Purchase(TimeStampedModel):
    """Purchase order – creates a StockLedger entry on save."""
    supplier    = models.ForeignKey('core.Supplier', on_delete=models.PROTECT, related_name='purchases')
    item        = models.ForeignKey(Item,            on_delete=models.PROTECT, related_name='purchases')
    location    = models.ForeignKey(Location,        on_delete=models.PROTECT)
    quantity    = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=2)

    vat_applicable  = models.BooleanField(default=False)
    vat_percentage  = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    vat_amount      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    base_amount     = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    final_amount    = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    invoice_number  = models.CharField(max_length=100, blank=True)
    purchase_date   = models.DateField()
    remark          = models.TextField(blank=True)
    ledger_entry    = models.OneToOneField(StockLedger, null=True, blank=True, on_delete=models.SET_NULL, related_name='purchase')
    created_by      = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'purchases'
        ordering = ['-purchase_date']

    def __str__(self): return f"PUR-{self.pk} | {self.item.name} | {self.quantity}"


class IssueItem(TimeStampedModel):
    """Issue – reduces stock via negative StockLedger entry."""
    TRUCK     = 'TRUCK'
    WORKSHOP  = 'WORKSHOP'
    BREAKDOWN = 'BREAKDOWN'
    ISSUE_TYPE_CHOICES = [(TRUCK,'Truck'),(WORKSHOP,'Workshop'),(BREAKDOWN,'Breakdown')]

    item         = models.ForeignKey(Item,     on_delete=models.PROTECT, related_name='issues')
    location     = models.ForeignKey(Location, on_delete=models.PROTECT)
    truck        = models.ForeignKey('trucks.Truck', null=True, blank=True, on_delete=models.SET_NULL, related_name='issues')
    issue_type   = models.CharField(max_length=15, choices=ISSUE_TYPE_CHOICES)
    quantity     = models.DecimalField(max_digits=12, decimal_places=3)
    unit_price   = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    final_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    issue_date   = models.DateField()
    remark       = models.TextField(blank=True)
    ledger_entry = models.OneToOneField(StockLedger, null=True, blank=True, on_delete=models.SET_NULL, related_name='issue')
    created_by   = models.ForeignKey('users.User', null=True, blank=True, on_delete=models.SET_NULL)

    class Meta:
        db_table = 'issue_items'
        ordering = ['-issue_date']

    def __str__(self): return f"ISS-{self.pk} | {self.item.name} | {self.quantity}"
