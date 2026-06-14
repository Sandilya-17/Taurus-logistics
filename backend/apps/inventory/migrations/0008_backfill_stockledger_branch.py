"""
Data migration: backfill StockLedger.branch from the linked Purchase/IssueItem.

For OPENING entries with no Purchase link, they'll stay NULL (you can manually
assign via Django admin or a management command if needed).
Run AFTER migration 0007_stockledger_branch.
"""
from django.db import migrations


def backfill_ledger_branch(apps, schema_editor):
    StockLedger = apps.get_model('inventory', 'StockLedger')
    Purchase    = apps.get_model('inventory', 'Purchase')
    IssueItem   = apps.get_model('inventory', 'IssueItem')

    # 1. Backfill from Purchase rows that have a branch
    for p in Purchase.objects.filter(branch__isnull=False, ledger_entry__isnull=False):
        StockLedger.objects.filter(pk=p.ledger_entry_id, branch__isnull=True).update(
            branch_id=p.branch_id
        )

    # 2. Backfill from IssueItem rows that have a branch
    for i in IssueItem.objects.filter(branch__isnull=False, ledger_entry__isnull=False):
        StockLedger.objects.filter(pk=i.ledger_entry_id, branch__isnull=True).update(
            branch_id=i.branch_id
        )


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0007_stockledger_branch'),
    ]

    operations = [
        migrations.RunPython(backfill_ledger_branch, migrations.RunPython.noop),
    ]
