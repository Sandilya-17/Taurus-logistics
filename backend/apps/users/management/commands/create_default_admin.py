from django.core.management.base import BaseCommand
from apps.users.models import User

class Command(BaseCommand):
    help = 'Creates default admin user if none exists'

    def handle(self, *args, **kwargs):
        if not User.objects.filter(email='admin@taurus.com').exists():
            User.objects.create_user(
                email='admin@taurus.com',
                password='admin1234',
                first_name='Admin',
                last_name='User',
                role=User.ADMIN,
                is_staff=True,
                is_superuser=True,
            )
            self.stdout.write(self.style.SUCCESS('Admin created successfully'))
        else:
            self.stdout.write('Admin already exists')
