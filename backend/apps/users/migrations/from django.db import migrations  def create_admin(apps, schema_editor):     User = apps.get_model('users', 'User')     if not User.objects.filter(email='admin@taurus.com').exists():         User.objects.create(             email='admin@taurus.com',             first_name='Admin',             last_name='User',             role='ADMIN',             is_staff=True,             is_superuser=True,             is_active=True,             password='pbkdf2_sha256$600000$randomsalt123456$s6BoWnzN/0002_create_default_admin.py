from django.db import migrations

def create_admin(apps, schema_editor):
    User = apps.get_model('users', 'User')
    if not User.objects.filter(email='admin@taurus.com').exists():
        User.objects.create(
            email='admin@taurus.com',
            first_name='Admin',
            last_name='User',
            role='ADMIN',
            is_staff=True,
            is_superuser=True,
            is_active=True,
            password='pbkdf2_sha256$600000$randomsalt123456$s6BoWnzN/TJ5OUV9xfUF968dsy+0WrX6U3+nUMdYA2U=',
        )

class Migration(migrations.Migration):
    dependencies = [('users', '0001_initial')]
    operations = [migrations.RunPython(create_admin)]
