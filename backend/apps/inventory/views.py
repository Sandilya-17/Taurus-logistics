"""apps/inventory/views.py

FIX SUMMARY
-----------
1. StockLedgerList  – now filters by branch directly on the ledger row
                      (old code joined via purchases which leaked cross-branch).
2. StockLedgerList  – SUPER_ADMIN sees all branches unless ?branch_id= is given.
3. ItemListCreate   – opening stock ledger entry now tagged with user's branch.
4. post_opening_stock – tagged with user's branch.
5. PurchaseService / IssueService calls in create() – branch is now passed through.
6. ClosingStockView – respects branch filtering.
7. available_stock  – respects branch filtering.
"""
import logging
from io import BytesIO
from decimal import Decimal, InvalidOperation
from django.db import transaction as db_transaction
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.decorators import api_view, permission_classes
from .models import Item, Location, StockLedger, Purchase, IssueItem
from .serializers import (ItemSerializer, LocationSerializer, StockLedgerSerializer,
                           PurchaseSerializer, IssueItemSerializer, PurchasePreviewSerializer)
from .services import PurchaseService, IssueService, StockService
from apps.core.models import Supplier
from apps.core.branch_mixin import BranchScopedQuerysetMixin
from apps.core.serializers import SupplierSerializer

logger = logging.getLogger(__name__)


# ── Permissions ────────────────────────────────────────────────────────────────

class IsAdminOrReadOnly(permissions.BasePermission):
    """Read for all authenticated; write/delete for ADMIN or SUPER_ADMIN."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, 'role', None) in ('ADMIN', 'SUPER_ADMIN')


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    getattr(request.user, 'role', None) in ('ADMIN', 'SUPER_ADMIN'))


# ── Helper: resolve the acting branch ─────────────────────────────────────────

def _resolve_branch(user, request_data=None, query_params=None):
    """
    Return the Branch object to tag a new record with.
    - SUPER_ADMIN: uses branch_id from POST body or ?branch_id= param; falls
                   back to their own branch.
    - Everyone else: always their own branch.
    """
    if getattr(user, 'role', None) == 'SUPER_ADMIN':
        branch_id = None
        if request_data:
            branch_id = request_data.get('branch_id')
        if not branch_id and query_params:
            branch_id = query_params.get('branch_id')
        if branch_id:
            from apps.users.models import Branch
            try:
                return Branch.objects.get(pk=branch_id)
            except Branch.DoesNotExist:
                pass
    return user.branch if user.branch_id else None


# ── Suppliers ──────────────────────────────────────────────────────────────────

class SupplierListCreate(generics.ListCreateAPIView):
    queryset         = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields    = ('name',)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class SupplierDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Supplier.objects.all()
    serializer_class   = SupplierSerializer
    permission_classes = [IsAdmin]


# ── Locations (global – shared across branches intentionally) ──────────────────

class LocationListCreate(generics.ListCreateAPIView):
    queryset         = Location.objects.all()
    serializer_class = LocationSerializer


class LocationDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Location.objects.all()
    serializer_class = LocationSerializer


# ── Items (global catalogue – branch isolation is at ledger level) ─────────────

class ItemListCreate(generics.ListCreateAPIView):
    queryset         = Item.objects.all()
    serializer_class = ItemSerializer
    search_fields    = ('name', 'item_type')
    filterset_fields = ('item_type',)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]

    def create(self, request, *args, **kwargs):
        import logging
        from django.db import transaction as db_transaction
        logger = logging.getLogger(__name__)

        data = request.data.copy()
        if hasattr(data, 'dict'):
            data = data.dict()

        opening_qty_raw = data.pop('opening_qty', None)
        unit_price_raw  = data.pop('unit_price',  None)
        location_id     = data.pop('location_id', None)
        data.pop('quantity', None)

        def _scalar(v):
            if isinstance(v, (list, tuple)):
                v = v[0] if v else None
            return v

        opening_qty_raw = _scalar(opening_qty_raw)
        unit_price_raw  = _scalar(unit_price_raw)
        location_id     = _scalar(location_id)

        try:
            opening_qty = Decimal(str(opening_qty_raw)) if opening_qty_raw not in (None, '', '0', 0, '0.0') else None
        except (InvalidOperation, TypeError):
            opening_qty = None
        try:
            unit_price = Decimal(str(unit_price_raw)) if unit_price_raw not in (None, '', '0', 0, '0.0') else None
        except (InvalidOperation, TypeError):
            unit_price = None

        if 'reorder_level' not in data or data.get('reorder_level') in (None, ''):
            data['reorder_level'] = 0

        try:
            with db_transaction.atomic():
                item_name = data.get('name', '').strip()
                existing_item = Item.objects.filter(name=item_name).first()
                if existing_item:
                    item = existing_item
                else:
                    serializer = self.get_serializer(data=data)
                    if not serializer.is_valid():
                        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    item = serializer.save()

                if opening_qty and opening_qty > 0 and unit_price and unit_price > 0:
                    loc = None
                    if location_id:
                        loc = Location.objects.filter(id=location_id).first()
                    if loc is None:
                        loc = Location.objects.filter(deleted_at__isnull=True).first()
                    if loc is None:
                        loc, _ = Location.objects.get_or_create(
                            name='Main Store',
                            defaults={'location_type': 'STORE', 'address': ''}
                        )

                    branch = _resolve_branch(request.user, request.data, request.query_params)

                    already_has_opening = StockLedger.objects.filter(
                        item=item,
                        transaction_type=StockLedger.OPENING,
                        branch=branch,
                    ).exists()

                    if not already_has_opening:
                        StockLedger.objects.create(
                            item=item,
                            location=loc,
                            branch=branch,
                            transaction_type=StockLedger.OPENING,
                            quantity=opening_qty,
                            unit_price=unit_price,
                            created_by=request.user if request.user.is_authenticated else None,
                            remark='Initial Opening Stock',
                        )

        except Exception as ex:
            logger.exception("Failed to create inventory item: %s", ex)
            return Response(
                {'error': f'Failed to save item: {str(ex)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        headers = self.get_success_headers(ItemSerializer(item).data)
        return Response(ItemSerializer(item).data, status=status.HTTP_201_CREATED, headers=headers)



class ItemDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Item.objects.all()
    serializer_class   = ItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        StockLedger.objects.filter(item=instance).delete()
        return super().destroy(request, *args, **kwargs)


# ── Stock Ledger ───────────────────────────────────────────────────────────────

class StockLedgerList(generics.ListAPIView):
    """
    FIX: Now filters directly on StockLedger.branch instead of the broken
    join-via-purchases approach that leaked cross-branch data.

    SUPER_ADMIN sees all branches unless ?branch_id= is supplied.
    """
    serializer_class = StockLedgerSerializer
    filterset_fields = ('item', 'location', 'transaction_type')
    search_fields    = ('item__name', 'reference_type')
    ordering_fields  = ('created_at',)

    def get_queryset(self):
        user = self.request.user
        qs   = StockLedger.objects.select_related('item', 'location', 'created_by', 'branch')
        if not user.is_authenticated:
            return qs.none()

        # SUPER_ADMIN: all branches (or narrowed by ?branch_id=)
        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                return qs.filter(branch_id=branch_id)
            return qs  # all data

        # Everyone else: strictly their own branch
        if user.branch_id:
            return qs.filter(branch_id=user.branch_id)
        return qs.none()


class StockLedgerDetail(generics.RetrieveUpdateAPIView):
    queryset          = StockLedger.objects.all()
    serializer_class  = StockLedgerSerializer
    http_method_names = ['get', 'patch', 'head', 'options']

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.transaction_type != StockLedger.OPENING:
            return Response({'error': 'Only OPENING entries can be edited.'}, status=status.HTTP_400_BAD_REQUEST)
        qty_raw   = request.data.get('quantity')
        price_raw = request.data.get('unit_price')
        try:
            if qty_raw is not None:
                qty = Decimal(str(qty_raw))
                if qty <= 0:
                    return Response({'error': 'Quantity must be > 0'}, status=400)
                instance.quantity = qty
            if price_raw is not None:
                price = Decimal(str(price_raw))
                if price <= 0:
                    return Response({'error': 'Unit price must be > 0'}, status=400)
                instance.unit_price = price
            instance.save()
        except (InvalidOperation, TypeError, ValueError):
            return Response({'error': 'Invalid quantity or unit_price'}, status=400)
        return Response(StockLedgerSerializer(instance).data)


class ClosingStockView(APIView):
    """
    FIX: Respects branch isolation.
    SUPER_ADMIN can pass ?branch_id= to narrow; otherwise sees all.
    Other roles are restricted to their branch automatically.
    """
    def get(self, request):
        user        = request.user
        item_id     = request.query_params.get('item')
        location_id = request.query_params.get('location')
        as_of       = request.query_params.get('as_of')

        # Determine branch scope
        branch_id = None
        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            branch_id = request.query_params.get('branch_id')  # optional for super admin
        else:
            branch_id = user.branch_id  # mandatory for all others

        data = StockService.get_closing_stock(item_id, location_id, as_of, branch_id=branch_id)
        return Response(list(data))


# ── Purchases ──────────────────────────────────────────────────────────────────

class PurchaseListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = Purchase.objects.select_related('supplier', 'item', 'location', 'branch')
    serializer_class = PurchaseSerializer
    filterset_fields = ('supplier', 'item', 'location', 'purchase_date')
    search_fields    = ('invoice_number', 'item__name', 'supplier__name')

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            supplier_name = data.get('supplier_name', '').strip()
            if supplier_name and not data.get('supplier_id'):
                supplier, _ = Supplier.objects.get_or_create(
                    name__iexact=supplier_name,
                    defaults={'name': supplier_name}
                )
                data['supplier_id'] = supplier.pk

            # ── FIX: resolve branch and pass to service ──
            branch = _resolve_branch(request.user, request.data, request.query_params)
            purchase = PurchaseService.create_purchase(data, user=request.user, branch=branch)
            return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PurchaseDetail(BranchScopedQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset           = Purchase.objects.all()
    serializer_class   = PurchaseSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.ledger_entry_id:
            StockLedger.objects.filter(id=instance.ledger_entry_id).delete()
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


class PurchasePreviewView(APIView):
    def post(self, request):
        s = PurchasePreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)


# ── Issues ────────────────────────────────────────────────────────────────────

class IssueListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = IssueItem.objects.select_related('item', 'location', 'truck', 'trip', 'branch')
    serializer_class = IssueItemSerializer
    filterset_fields = ('item', 'location', 'issue_type', 'truck', 'trip')

    def create(self, request, *args, **kwargs):
        import logging
        logger = logging.getLogger(__name__)
        try:
            # ── FIX: resolve branch and pass to service ──
            branch = _resolve_branch(request.user, request.data, request.query_params)
            issue = IssueService.create_issue(request.data, user=request.user, branch=branch)
            return Response(IssueItemSerializer(issue).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except KeyError as e:
            return Response({'error': f'Missing required field: {e}'}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.exception("Failed to record issue: %s", e)
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IssueDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset           = IssueItem.objects.all()
    serializer_class   = IssueItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        trip = instance.trip
        if instance.ledger_entry_id:
            StockLedger.objects.filter(id=instance.ledger_entry_id).delete()
        result = super().destroy(request, *args, **kwargs)
        if trip:
            trip.recalculate_costs()
        return result


# ── Utility endpoints ─────────────────────────────────────────────────────────

@api_view(['GET'])
def available_stock(request):
    """
    FIX: Scopes available stock to the caller's branch.
    SUPER_ADMIN can pass ?branch_id= to query a specific branch.
    """
    user        = request.user
    item_id     = request.query_params.get('item')
    location_id = request.query_params.get('location')
    if not item_id:
        return Response({'error': 'item param required'}, status=400)

    # Resolve branch scope
    branch_id = None
    if getattr(user, 'role', None) == 'SUPER_ADMIN':
        branch_id = request.query_params.get('branch_id')
    else:
        branch_id = user.branch_id

    qty = StockService.get_available_qty(item_id, location_id, branch_id=branch_id)
    return Response({'available_qty': float(qty)})


@api_view(['GET'])
def fifo_stock_breakdown(request):
    item_id     = request.query_params.get('item')
    location_id = request.query_params.get('location')
    if not item_id:
        return Response({'error': 'item param required'}, status=400)

    user      = request.user
    branch_id = None
    if getattr(user, 'role', None) == 'SUPER_ADMIN':
        branch_id = request.query_params.get('branch_id')
    else:
        branch_id = user.branch_id

    batches = StockService.get_fifo_batches(item_id, location_id, branch_id=branch_id)
    total_available = sum(b['remaining'] for b in batches)
    return Response({
        'total_available': float(total_available),
        'batches': [
            {'ledger_id': b['ledger_id'], 'unit_price': float(b['unit_price']), 'remaining': float(b['remaining'])}
            for b in batches
        ],
    })


@api_view(['POST'])
def post_opening_stock(request):
    """FIX: Tags the opening stock ledger entry with the user's branch."""
    item_id     = request.data.get('item_id')
    qty_raw     = request.data.get('quantity')
    price_raw   = request.data.get('unit_price')
    location_id = request.data.get('location_id')
    if not item_id:
        return Response({'error': 'item_id is required'}, status=400)
    try:
        qty   = Decimal(str(qty_raw))
        price = Decimal(str(price_raw))
    except (InvalidOperation, TypeError, ValueError):
        return Response({'error': 'Invalid quantity or unit_price'}, status=400)
    if qty <= 0:
        return Response({'error': 'Quantity must be greater than 0'}, status=400)
    if price <= 0:
        return Response({'error': 'Unit price must be greater than 0'}, status=400)
    try:
        item = Item.objects.get(pk=item_id)
    except Item.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)
    if location_id:
        try:
            loc = Location.objects.get(pk=location_id)
        except Location.DoesNotExist:
            loc = None
    else:
        loc = None

    # Always guarantee a location exists
    if loc is None:
        loc = Location.objects.filter(deleted_at__isnull=True).first()
    if loc is None:
        loc, _ = Location.objects.get_or_create(
            name='Main Store',
            defaults={'location_type': 'STORE', 'address': ''}
        )

    # ── FIX: tag with branch ──
    branch = _resolve_branch(request.user, request.data, request.query_params)

    entry = StockLedger.objects.create(
        item=item, location=loc,
        branch=branch,          # ← NEW
        transaction_type=StockLedger.OPENING,
        quantity=qty, unit_price=price,
        created_by=request.user if request.user.is_authenticated else None,
        remark='Opening Stock',
    )
    return Response({
        'id': entry.pk,
        'item': item.name,
        'location': loc.name,
        'branch': branch.name if branch else None,
        'quantity': float(qty),
        'unit_price': float(price),
        'final_amount': float(entry.final_amount),
        'message': f'Opening stock of {qty} units posted for {item.name}',
    }, status=201)


# ── Bulk Excel Import (Opening Stock) ───────────────────────────────────────────

class ImportOpeningStockView(APIView):
    """
    Bulk-import Items + Opening Stock from an uploaded .xlsx workbook.

    Expected header row (any column order, case-insensitive), matching the
    standard "opening_stock_with_unit_price.xlsx" export:

        S/N | ITEM DESCRIPTION | OPENING STOCK | UNIT PRICE

    Optional columns also honoured if present: ITEM TYPE, UNIT.

    Behaviour
    ---------
    - Item matched by name (case-insensitive). If missing, it's created.
    - If the item already has an OPENING ledger entry for this branch, that
      entry is UPDATED with the new qty/unit price (safe to re-import the
      same sheet after edits — no duplicate opening rows are ever created).
    - Rows with zero/blank qty or price still create the Item (so it shows
      up in the Stock Ledger with "No Stock") but post no ledger entry.
    - Because this writes directly to the same Item / StockLedger tables
      used everywhere else (Purchases, Issues, Closing Stock, Dashboard,
      Reports/Exports), every imported row is immediately reflected across
      the whole app — no extra wiring needed downstream.
    """
    parser_classes     = [MultiPartParser, FormParser]
    permission_classes = [IsAdmin]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'No file uploaded. Attach an .xlsx file under the "file" field.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not file_obj.name.lower().endswith(('.xlsx', '.xlsm')):
            return Response({'error': 'Only .xlsx / .xlsm files are supported.'}, status=400)

        item_type_default = str(request.data.get('item_type', Item.SPARE_PART)).upper()
        if item_type_default not in dict(Item.TYPE_CHOICES):
            item_type_default = Item.SPARE_PART

        location_id = request.data.get('location_id')
        loc = None
        if location_id:
            loc = Location.objects.filter(id=location_id).first()
        if loc is None:
            loc = Location.objects.filter(deleted_at__isnull=True).first()
        if loc is None:
            loc, _ = Location.objects.get_or_create(
                name='Main Store', defaults={'location_type': 'STORE', 'address': ''}
            )

        branch = _resolve_branch(request.user, request.data, request.query_params)

        try:
            import openpyxl
            wb = openpyxl.load_workbook(BytesIO(file_obj.read()), data_only=True, read_only=True)
            ws = wb.active
        except Exception as ex:
            logger.exception('Failed to read uploaded stock workbook: %s', ex)
            return Response({'error': f'Could not read Excel file: {ex}'}, status=400)

        rows = list(ws.iter_rows(values_only=True))
        if not rows:
            return Response({'error': 'The sheet is empty.'}, status=400)

        header = [str(c).strip().upper() if c is not None else '' for c in rows[0]]

        def find_col(*keywords):
            for i, h in enumerate(header):
                if any(k in h for k in keywords):
                    return i
            return None

        col_name  = find_col('ITEM DESCRIPTION', 'ITEM NAME', 'DESCRIPTION', 'NAME')
        col_qty   = find_col('OPENING STOCK', 'OPENING QTY', 'QUANTITY', 'QTY')
        col_price = find_col('UNIT PRICE', 'PRICE', 'RATE', 'COST')
        col_unit  = find_col('UNIT OF MEASURE', 'UOM', 'UNIT')
        col_type  = find_col('ITEM TYPE', 'TYPE')

        if col_name is None:
            return Response(
                {'error': 'Could not find an "ITEM DESCRIPTION" / "Item Name" column in row 1 of the sheet.'},
                status=400
            )

        created, updated, skipped_no_stock, errors = 0, 0, 0, []
        data_rows = rows[1:]

        for idx, row in enumerate(data_rows, start=2):  # Excel row numbers start at 2 for data
            name = '?'
            try:
                # Each row gets its OWN transaction/savepoint. If this row
                # fails (e.g. a duplicate-name race, bad data, etc.) only
                # this row is rolled back — it can no longer poison every
                # row that comes after it.
                with db_transaction.atomic():
                    raw_name = row[col_name] if col_name < len(row) else None
                    name = str(raw_name).strip() if raw_name is not None else ''
                    if not name:
                        continue  # blank row, silently skip

                    qty_raw   = row[col_qty]   if (col_qty   is not None and col_qty   < len(row)) else None
                    price_raw = row[col_price] if (col_price is not None and col_price < len(row)) else None
                    unit_raw  = row[col_unit]  if (col_unit  is not None and col_unit  < len(row)) else None
                    type_raw  = row[col_type]  if (col_type  is not None and col_type  < len(row)) else None

                    try:
                        qty = Decimal(str(qty_raw)) if qty_raw not in (None, '') else Decimal('0')
                    except (InvalidOperation, TypeError):
                        qty = Decimal('0')
                    try:
                        price = Decimal(str(price_raw)) if price_raw not in (None, '') else Decimal('0')
                    except (InvalidOperation, TypeError):
                        price = Decimal('0')

                    item_type = item_type_default
                    if type_raw:
                        candidate = str(type_raw).strip().upper().replace(' ', '_')
                        if candidate in dict(Item.TYPE_CHOICES):
                            item_type = candidate

                    unit = str(unit_raw).strip() if unit_raw else ('litres' if item_type == Item.LUBRICANT else 'pcs')

                    # Look up INCLUDING soft-deleted items, not just Item.objects
                    # (which silently hides deleted rows). Otherwise a
                    # previously-deleted item with the same name causes a
                    # real database duplicate-key error on .create().
                    item = Item.objects.all_with_deleted().filter(name__iexact=name).first()
                    if item is None:
                        item = Item.objects.create(name=name, item_type=item_type, unit=unit)
                        created += 1
                    elif item.is_deleted:
                        item.deleted_at = None
                        item.save(update_fields=['deleted_at'])
                        created += 1

                    if qty > 0 and price > 0:
                        existing = StockLedger.objects.filter(
                            item=item, transaction_type=StockLedger.OPENING, branch=branch,
                        ).first()
                        if existing:
                            existing.quantity   = qty
                            existing.unit_price = price
                            existing.save()
                        else:
                            StockLedger.objects.create(
                                item=item, location=loc, branch=branch,
                                transaction_type=StockLedger.OPENING,
                                quantity=qty, unit_price=price,
                                created_by=request.user if request.user.is_authenticated else None,
                                remark=f'Imported from {file_obj.name}',
                            )
                        updated += 1
                    else:
                        skipped_no_stock += 1

            except Exception as row_ex:
                logger.exception('Import row %s failed: %s', idx, row_ex)
                errors.append(f'Row {idx} ("{name}"): {row_ex}')

        total_rows = len(data_rows)
        return Response({
            'message': (
                f'Import complete — {created} new item(s) created, '
                f'{updated} opening stock entr{"y" if updated == 1 else "ies"} posted, '
                f'{skipped_no_stock} row(s) skipped (no qty/price).'
            ),
            'created':          created,
            'opening_posted':   updated,
            'skipped_no_stock': skipped_no_stock,
            'errors':           errors,
            'total_rows':       total_rows,
            'branch':           branch.name if branch else None,
        }, status=status.HTTP_200_OK)
