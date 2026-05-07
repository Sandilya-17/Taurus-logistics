"""apps/users/models.py – Custom User with role-based access."""
from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from apps.core.models import TimeStampedModel


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
        extra.setdefault('role', User.ADMIN)
        return self.create_user(email, password, **extra)


class User(AbstractBaseUser, PermissionsMixin, TimeStampedModel):
    ADMIN    = 'ADMIN'
    MANAGER  = 'MANAGER'
    EMPLOYEE = 'EMPLOYEE'
    ROLE_CHOICES = [(ADMIN,'Admin'),(MANAGER,'Manager'),(EMPLOYEE,'Employee')]

    email      = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name  = models.CharField(max_length=100)
    phone      = models.CharField(max_length=20, blank=True)
    role       = models.CharField(max_length=10, choices=ROLE_CHOICES, default=EMPLOYEE)
    is_active  = models.BooleanField(default=True)
    is_staff   = models.BooleanField(default=False)

    # Module-level permissions (stored as JSON list of module names)
    module_permissions = models.JSONField(default=list, blank=True)

    objects   = UserManager()
    USERNAME_FIELD  = 'email'
    REQUIRED_FIELDS = ['first_name', 'last_name']

    class Meta:
        db_table = 'users'

    def get_full_name(self): return f"{self.first_name} {self.last_name}"
    def __str__(self):       return self.email

    @property
    def is_admin(self):   return self.role == self.ADMIN
    @property
    def is_manager(self): return self.role in (self.ADMIN, self.MANAGER)
