"""
Migration: change Revenue.trip FK on_delete from SET_NULL → CASCADE.

Effect: when a Trip is deleted, all Revenue rows linked to that trip
are automatically deleted too — no more orphaned revenue inflating
the dashboard figures.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_revenue_extended_sources'),
        ('trips', '0003_trip_fuel_spare_costs'),
    ]

    operations = [
        migrations.AlterField(
            model_name='revenue',
            name='trip',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='revenue_entries',
                to='trips.trip',
            ),
        ),
    ]
