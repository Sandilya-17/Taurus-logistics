"""Migration: add currency field to Branch model.

Default = GHS (Ghana Cedis) for all existing branches.
Set Branch 2 (or any branch) to SLL via Django admin or a data migration.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0004_superadmin_branch_required'),
    ]

    operations = [
        migrations.AddField(
            model_name='branch',
            name='currency',
            field=models.CharField(
                max_length=10,
                choices=[
                    ('GHS', 'Ghana Cedis (GH₵)'),
                    ('SLL', 'Sierra Leone Leone (Le)'),
                ],
                default='GHS',
                help_text='Currency used by this branch',
            ),
        ),
    ]
