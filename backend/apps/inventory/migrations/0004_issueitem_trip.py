from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0003_alter_item_item_type'),
        ('trips', '0004_trip_fuel_spare_costs'),
    ]

    operations = [
        migrations.AddField(
            model_name='issueitem',
            name='trip',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='spare_issues',
                to='trips.trip',
            ),
        ),
    ]
