from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trips', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='trip',
            name='fuel_cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
        migrations.AddField(
            model_name='trip',
            name='spare_parts_cost',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=14),
        ),
    ]
