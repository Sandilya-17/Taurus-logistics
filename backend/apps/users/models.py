"""apps/users/models.py – Custom User with role-based access + Branch isolation."""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from apps.core.models import TimeStampedModel


class Branch(TimeStampedModel):
    """Represents a company branch (e.g. Branch 1, Branch 2)."""

    # Currency choices – add more as needed
    GHS = 'GHS'  # Ghana Cedis  (GH₵)
    SLL = 'SLL'  # Sierra Leone Leone (Le)
    CURRENCY_CHOICES = [
        (GHS, 'Ghana Cedis (GH₵)'),
        (SLL, 'Sierra Leone Leone (Le)'),
    ]

    name      = models.CharField(max_length=200, unique=True)
    code      = models.CharField(max_length=20, unique=True)
    address   = models.TextField(blank=True)
    phone     = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    currency  = models.CharField(
        max_length=10,
        choices=CURRENCY_CHOICES,
        default=GHS,
        help_text='Currency used by this branch',
    )

    class Meta:
        db_table = 'branches'
        verbose_name_plural = 'branches'

    def __str__(self): return self.name


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra):
        if not email:
            raise ValueError('Email is required')
        email = self.normalize_email(email)
        user  = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault('is_staff', True)
        extra.setdefault('is_superuser', True)
        extra.setdefault('role', User.SUPER_ADMIN)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    SUPER_ADMIN = 'SUPER_ADMIN'
    ADMIN       = 'ADMIN'
    MANAGER     = 'MANAGER'
    EMPLOYEE    = 'EMPLOYEE'
    ROLE_CHOICES = [
        (SUPER_ADMIN, 'Super Admin'),
        (ADMIN,       'Admin'),
        (MANAGER,     'Manager'),
        (EMPLOYEE,    'Employee'),
    ]

    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    phone      = models.CharField(max_length=20, blank=True)
    role       = models.CharField(max_length=15, choices=ROLE_CHOICES, default=EMPLOYEE)

    # ADMIN / MANAGER / EMPLOYEE must have a branch.
    # SUPER_ADMIN: if branch is null → access to ALL branches.
    #              if branch is set → still has all-branch access (branch field is informational).
    branch     = models.ForeignKey(
        Branch, null=True, blank=True,
        on_delete=models.PROTECT, related_name='users'
    )

    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    module_permissions = models.JSONField(default=list, blank=True)

    objects   = UserManager()
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'

    def get_full_name(self): return f"{self.first_name} {self.last_name}"
    def __str__(self):       return self.email

    @property
    def is_super_admin(self): return self.role == self.SUPER_ADMIN
    @property
    def is_admin(self):       return self.role in (self.SUPER_ADMIN, self.ADMIN)
    @property
    def is_manager(self):     return self.role in (self.SUPER_ADMIN, self.ADMIN, self.MANAGER)
