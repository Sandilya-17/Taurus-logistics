"""
Migration 0005 – Safe re-application of the issue_items.trip_id column.

Migration 0004 added this column via Django ORM but may not have been
applied to the production database (Railway/MySQL). This migration uses
RunPython with a raw cursor to check and add the column only if missing —
fully idempotent and MySQL-compatible.
"""
from django.db import migrations, connection


def add_trip_id_column(apps, schema_editor):
    db = connection.settings_dict['NAME']
    with connection.cursor() as cursor:
        # Check if column already exists
        cursor.execute("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME   = 'issue_items'
              AND COLUMN_NAME  = 'trip_id'
        """, [db])
        exists = cursor.fetchone()[0]

        if not exists:
            cursor.execute("""
                ALTER TABLE `issue_items`
                ADD COLUMN `trip_id` BIGINT NULL,
                ADD INDEX `issue_items_trip_id_idx` (`trip_id`),
                ADD CONSTRAINT `issue_items_trip_id_fk`
                    FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`)
                    ON DELETE SET NULL
            """)


def remove_trip_id_column(apps, schema_editor):
    db = connection.settings_dict['NAME']
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = %s
              AND TABLE_NAME   = 'issue_items'
              AND COLUMN_NAME  = 'trip_id'
        """, [db])
        exists = cursor.fetchone()[0]

        if exists:
            cursor.execute("""
                ALTER TABLE `issue_items`
                DROP FOREIGN KEY `issue_items_trip_id_fk`,
                DROP INDEX `issue_items_trip_id_idx`,
                DROP COLUMN `trip_id`
            """)


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_issueitem_trip'),
        ('trips', '0004_trip_fuel_spare_costs'),
    ]

    operations = [
        migrations.RunPython(
            add_trip_id_column,
            reverse_code=remove_trip_id_column,
        ),
    ]
