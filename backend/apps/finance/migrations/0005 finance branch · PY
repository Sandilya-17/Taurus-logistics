from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('finance', '0004_revenue_trip_cascade'),
        ('users',   '0003_branch_and_user_role_update'),
    ]

    operations = [
        migrations.AddField(
            model_name='expenditure',
            name='branch',
            field=models.ForeignKey(
                blank=True, null=True, db_index=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='+', to='users.branch',
            ),
        ),
        migrations.AddField(
            model_name='revenue',
            name='branch',
            field=models.ForeignKey(
                blank=True, null=True, db_index=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='+', to='users.branch',
            ),
        ),
    ]
