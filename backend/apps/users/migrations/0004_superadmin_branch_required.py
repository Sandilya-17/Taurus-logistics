"""Migration: Make Super Admin branch-scoped.

Previously SUPER_ADMIN had branch=NULL meaning they saw ALL branches.
Now ALL roles including SUPER_ADMIN must be assigned to a branch.
Super Admins retain full CRUD permissions, but only within their branch.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_branch_and_user_role_update'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                UPDATE users
                SET branch_id = (SELECT id FROM branches WHERE code = 'BR1' LIMIT 1)
                WHERE role = 'SUPER_ADMIN' AND branch_id IS NULL;
            """,
            reverse_sql="""
                UPDATE users
                SET branch_id = NULL
                WHERE role = 'SUPER_ADMIN';
            """
        ),
    ]
