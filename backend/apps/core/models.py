"""apps/core/models.py – Base models, soft-delete, audit log, alerts."""
from django.db import models
from django.conf import settings
from django.utils import timezone


# ── BASE MODELS ───────────────────────────────────────────────────────────────

class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        abstract = True


class SoftDeleteQuerySet(models.QuerySet):
    def alive(self):  return self.filter(deleted_at__isnull=True)
    def dead(self):   return self.filter(deleted_at__isnull=False)
    def delete(self): return self.update(deleted_at=timezone.now())
    def hard_delete(self): return super().delete()


class SoftDeleteManager(models.Manager):
    def get_queryset(self): return SoftDeleteQuerySet(self.model, using=self._db).alive()
    def all_with_deleted(self): return SoftDeleteQuerySet(self.model, using=self._db)


class SoftDeleteModel(TimeStampedModel):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    objects    = SoftDeleteManager()

    def delete(self, using=None, keep_parents=False):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])

    def hard_delete(self): super().delete()

    @property
    def is_deleted(self): return self.deleted_at is not None

    class Meta:
        abstract = True


# ── AUDIT LOG ─────────────────────────────────────────────────────────────────

class AuditLog(TimeStampedModel):
    CREATE = 'CREATE'; UPDATE = 'UPDATE'; DELETE = 'DELETE'
    VIEW   = 'VIEW';   LOGIN  = 'LOGIN';  LOGOUT = 'LOGOUT'
    ACTION_CHOICES = [
        (CREATE,'Create'),(UPDATE,'Update'),(DELETE,'Delete'),
        (VIEW,'View'),(LOGIN,'Login'),(LOGOUT,'Logout'),
    ]
    user          = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='audit_logs')
    action        = models.CharField(max_length=10, choices=ACTION_CHOICES)
    model_name    = models.CharField(max_length=100)
    object_id     = models.BigIntegerField(null=True, blank=True)
    object_repr   = models.CharField(max_length=255, blank=True)
    changes       = models.JSONField(default=dict, blank=True)
    ip_address    = models.GenericIPAddressField(null=True, blank=True)
    user_agent    = models.CharField(max_length=512, blank=True)
    endpoint      = models.CharField(max_length=255, blank=True)
    http_method   = models.CharField(max_length=10, blank=True)
    response_code = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']
        indexes  = [
            models.Index(fields=['model_name', 'object_id']),
            models.Index(fields=['user', 'created_at']),
        ]

    def __str__(self):
        return f"{self.user} | {self.action} | {self.model_name}:{self.object_id}"


# ── SYSTEM ALERTS ─────────────────────────────────────────────────────────────

class SystemAlert(TimeStampedModel):
    INFO    = 'INFO'; WARNING = 'WARNING'; DANGER = 'DANGER'
    LEVEL_CHOICES = [(INFO,'Info'),(WARNING,'Warning'),(DANGER,'Danger')]

    title          = models.CharField(max_length=200)
    message        = models.TextField()
    level          = models.CharField(max_length=10, choices=LEVEL_CHOICES, default=WARNING)
    is_read        = models.BooleanField(default=False)
    alert_type     = models.CharField(max_length=50)
    reference_type = models.CharField(max_length=50, blank=True)
    reference_id   = models.BigIntegerField(null=True, blank=True)

    class Meta:
        db_table = 'system_alerts'
        ordering = ['-created_at']
        indexes  = [models.Index(fields=['alert_type', 'is_read'])]

    def __str__(self): return f"[{self.level}] {self.title}"


# ── SUPPLIER / VENDOR ─────────────────────────────────────────────────────────

class Supplier(SoftDeleteModel):
    name    = models.CharField(max_length=200)
    contact = models.CharField(max_length=100, blank=True)
    phone   = models.CharField(max_length=20, blank=True)
    email   = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    tin     = models.CharField(max_length=50, blank=True, verbose_name='TIN Number')

    class Meta:
        db_table = 'suppliers'

    def __str__(self): return self.name


class Vendor(SoftDeleteModel):
    name    = models.CharField(max_length=200)
    contact = models.CharField(max_length=100, blank=True)
    phone   = models.CharField(max_length=20, blank=True)
    email   = models.EmailField(blank=True)
    address = models.TextField(blank=True)

    class Meta:
        db_table = 'vendors'

    def __str__(self): return self.name
