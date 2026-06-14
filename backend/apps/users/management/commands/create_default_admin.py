from django.core.management.base import BaseCommand
from apps.users.models import User, Branch


class Command(BaseCommand):
    help = 'Creates default Super Admins (branch-scoped), admins, and branches'

    def handle(self, *args, **kwargs):
        branch1, _ = Branch.objects.get_or_create(
            code='BR1', defaults={'name': 'Branch 1', 'is_active': True}
        )
        branch2, _ = Branch.objects.get_or_create(
            code='BR2', defaults={'name': 'Branch 2', 'is_active': True}
        )
        self.stdout.write(self.style.SUCCESS('Branches ready: Branch 1, Branch 2'))

        # Super Admin — scoped to Branch 1
        if not User.objects.filter(email='superadmin@taurus.com').exists():
            User.objects.create_user(
                email='superadmin@taurus.com',
                password='superadmin1234',
                first_name='Super', last_name='Admin',
                role=User.SUPER_ADMIN,
                is_staff=True, is_superuser=True,
                branch=branch1,
            )
            self.stdout.write(self.style.SUCCESS('Super Admin created: superadmin@taurus.com'))
        else:
            User.objects.filter(email='superadmin@taurus.com', branch__isnull=True).update(
                role=User.SUPER_ADMIN, branch=branch1, is_staff=True, is_superuser=True
            )
            self.stdout.write('Super Admin already exists')

        # Admin — Branch 1
        if not User.objects.filter(email='admin1@taurus.com').exists():
            User.objects.create_user(
                email='admin1@taurus.com', password='admin1234',
                first_name='Admin', last_name='Branch1',
                role=User.ADMIN, is_staff=True, branch=branch1,
            )
            self.stdout.write(self.style.SUCCESS('Branch 1 Admin created: admin1@taurus.com'))
        else:
            User.objects.filter(email='admin1@taurus.com').update(
                role=User.ADMIN, branch=branch1, is_staff=True
            )

        # Admin — Branch 2
        if not User.objects.filter(email='admin2@taurus.com').exists():
            User.objects.create_user(
                email='admin2@taurus.com', password='admin1234',
                first_name='Admin', last_name='Branch2',
                role=User.ADMIN, is_staff=True, branch=branch2,
            )
            self.stdout.write(self.style.SUCCESS('Branch 2 Admin created: admin2@taurus.com'))
        else:
            User.objects.filter(email='admin2@taurus.com').update(
                role=User.ADMIN, branch=branch2, is_staff=True
            )

        # Migrate legacy admin@taurus.com
        legacy = User.objects.filter(email='admin@taurus.com').first()
        if legacy:
            legacy.role = User.SUPER_ADMIN
            if not legacy.branch_id:
                legacy.branch = branch1
            legacy.is_staff = True
            legacy.is_superuser = True
            legacy.save(update_fields=['role', 'branch', 'is_staff', 'is_superuser'])
            self.stdout.write(self.style.WARNING(
                f'Migrated admin@taurus.com → SUPER_ADMIN (branch: {legacy.branch})'
            ))

        self.stdout.write(self.style.SUCCESS('\nSetup complete.'))
        self.stdout.write('  superadmin@taurus.com / superadmin1234  (Super Admin – Branch 1)')
        self.stdout.write('  admin1@taurus.com     / admin1234        (Admin – Branch 1)')
        self.stdout.write('  admin2@taurus.com     / admin1234        (Admin – Branch 2)')
