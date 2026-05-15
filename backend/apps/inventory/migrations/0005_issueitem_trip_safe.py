"""
Migration 0005 – Safe re-application of the issue_items.trip_id column.

Migration 0004 added this column via Django ORM but may not have been
applied to the production database (Railway/PostgreSQL). This migration
uses raw SQL with IF NOT EXISTS so it is fully idempotent — safe to run
whether or not the column already exists.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0004_issueitem_trip'),
        ('trips', '0004_trip_fuel_spare_costs'),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
                ALTER TABLE issue_items
                ADD COLUMN IF NOT EXISTS trip_id BIGINT NULL
                    REFERENCES trips(id) ON DELETE SET NULL;

                CREATE INDEX IF NOT EXISTS issue_items_trip_id_idx
                    ON issue_items (trip_id);
            """,
            reverse_sql="""
                DROP INDEX IF EXISTS issue_items_trip_id_idx;
                ALTER TABLE issue_items DROP COLUMN IF EXISTS trip_id;
            """,
        ),
    ]
