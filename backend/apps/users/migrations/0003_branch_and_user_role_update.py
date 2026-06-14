"""Migration: Add Branch model, update User with branch FK and SUPER_ADMIN role."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_create_default_admin'),
    ]

    operations = [
        # 1. Create Branch table
        migrations.CreateModel(
            name='Branch',
            fields=[
                ('id',         models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name',       models.CharField(max_length=200, unique=True)),
                ('code',       models.CharField(max_length=20, unique=True)),
                ('address',    models.TextField(blank=True)),
                ('phone',      models.CharField(blank=True, max_length=20)),
                ('is_active',  models.BooleanField(default=True)),
            ],
            options={'db_table': 'branches'},
        ),

        # 2. Extend role max_length to 15 to fit 'SUPER_ADMIN'
        migrations.AlterField(
            model_name='user',
            name='role',
            field=models.CharField(
                choices=[
                    ('SUPER_ADMIN', 'Super Admin'),
                    ('ADMIN',       'Admin'),
                    ('MANAGER',     'Manager'),
                    ('EMPLOYEE',    'Employee'),
                ],
                default='EMPLOYEE',
                max_length=15,
            ),
        ),

        # 3. Add branch FK to User (nullable — SUPER_ADMIN has no branch)
        migrations.AddField(
            model_name='user',
            name='branch',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='users',
                to='users.branch',
            ),
        ),

        # 4. Create two default branches
        migrations.RunSQL(
            sql="""
                INSERT INTO branches (name, code, address, phone, is_active, created_at, updated_at)
                VALUES
                  ('Branch 1', 'BR1', '', '', 1, NOW(), NOW()),
                  ('Branch 2', 'BR2', '', '', 1, NOW(), NOW())
                ON DUPLICATE KEY UPDATE name=name;
            """,
            reverse_sql="DELETE FROM branches WHERE code IN ('BR1', 'BR2');"
        ),

        # 5. Promote default admin@taurus.com to SUPER_ADMIN (no branch)
        migrations.RunSQL(
            sql="""
                UPDATE users SET role='SUPER_ADMIN', branch_id=NULL
                WHERE email='admin@taurus.com';
            """,
            reverse_sql="""
                UPDATE users SET role='ADMIN'
                WHERE email='admin@taurus.com';
            """
        ),
    ]
