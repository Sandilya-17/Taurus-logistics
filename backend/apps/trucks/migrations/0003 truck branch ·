from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('trucks', '0002_initial'),
        ('users',  '0003_branch_and_user_role_update'),
    ]

    operations = [
        migrations.AddField(
            model_name='truck',
            name='branch',
            field=models.ForeignKey(
                blank=True, null=True, db_index=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='trucks', to='users.branch',
            ),
        ),
    ]
