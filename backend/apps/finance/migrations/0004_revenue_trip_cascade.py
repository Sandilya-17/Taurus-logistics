"""
Migration: change Revenue.trip and Revenue.invoice FK on_delete to CASCADE.
"""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_revenue_extended_sources'),
        ('trips', '0003_trip_fuel_spare_costs'),
        ('invoicing', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='revenue',
            name='trip',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='revenue_entries',
                to='trips.trip',
            ),
        ),
        migrations.AlterField(
            model_name='revenue',
            name='invoice',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='revenue_entries',
                to='invoicing.invoice',
            ),
        ),
    ]
