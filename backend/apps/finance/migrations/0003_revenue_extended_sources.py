"""Migration: Add extended Revenue source choices."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0002_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='revenue',
            name='source',
            field=models.CharField(
                choices=[
                    ('HAULAGE',      'Haulage (Invoice)'),
                    ('TRIP_REVENUE', 'Trip Revenue'),
                    ('TRUCK_RENTAL', 'Truck Rental'),
                    ('SPARE_SALE',   'Spare Parts Sale'),
                    ('FUEL_REBATE',  'Fuel Rebate'),
                    ('COMMISSION',   'Commission'),
                    ('INSURANCE',    'Insurance Recovery'),
                    ('OTHER',        'Other Income'),
                ],
                default='HAULAGE',
                max_length=20,
            ),
        ),
    ]
