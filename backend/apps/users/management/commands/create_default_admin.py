from django.core.management.base import BaseCommand
from apps.users.models import User, Branch


class Command(BaseCommand):
    help = 'Creates default Super Admin, branch admins, and branches if they do not exist'

    def handle(self, *args, **kwargs):
        # ── Create Branches ──────────────────────────────────────────────────
        branch1, _ = Branch.objects.get_or_create(
            code='BR1', defaults={'name': 'Branch 1', 'is_active': True}
        )
        branch2, _ = Branch.objects.get_or_create(
            code='BR2', defaults={'name': 'Branch 2', 'is_active': True}
        )
        self.stdout.write(self.style.SUCCESS('Branches ready: Branch 1, Branch 2'))

        # ── Super Admin (no branch) ──────────────────────────────────────────
        if not User.objects.filter(email='superadmin@taurus.com').exists():
            User.objects.create_user(
                email='superadmin@taurus.com',
                password='superadmin1234',
                first_name='Super',
                last_name='Admin',
                role=User.SUPER_ADMIN,
                is_staff=True,
                is_superuser=True,
                branch=None,
            )
            self.stdout.write(self.style.SUCCESS('Super Admin created: superadmin@taurus.com / superadmin1234'))
        else:
            # Make sure existing admin@taurus.com is SUPER_ADMIN
            User.objects.filter(email='admin@taurus.com').update(role=User.SUPER_ADMIN, branch=None)
            self.stdout.write('Super Admin already exists')

        # ── Admin for Branch 1 ───────────────────────────────────────────────
        if not User.objects.filter(email='admin1@taurus.com').exists():
            User.objects.create_user(
                email='admin1@taurus.com',
                password='admin1234',
                first_name='Admin',
                last_name='Branch1',
                role=User.ADMIN,
                is_staff=True,
                branch=branch1,
            )
            self.stdout.write(self.style.SUCCESS('Branch 1 Admin created: admin1@taurus.com / admin1234'))
        else:
            self.stdout.write('Branch 1 Admin already exists')

        # ── Admin for Branch 2 ───────────────────────────────────────────────
        if not User.objects.filter(email='admin2@taurus.com').exists():
            User.objects.create_user(
                email='admin2@taurus.com',
                password='admin1234',
                first_name='Admin',
                last_name='Branch2',
                role=User.ADMIN,
                is_staff=True,
                branch=branch2,
            )
            self.stdout.write(self.style.SUCCESS('Branch 2 Admin created: admin2@taurus.com / admin1234'))
        else:
            self.stdout.write('Branch 2 Admin already exists')
