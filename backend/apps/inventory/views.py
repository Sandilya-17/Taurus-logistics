"""apps/inventory/views.py"""
from decimal import Decimal, InvalidOperation
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from .models import Item, Location, StockLedger, Purchase, IssueItem
from .serializers import (ItemSerializer, LocationSerializer, StockLedgerSerializer,
                           PurchaseSerializer, IssueItemSerializer, PurchasePreviewSerializer)
from .services import PurchaseService, IssueService, StockService
from apps.core.models import Supplier
from apps.core.serializers import SupplierSerializer


# ── Permission helpers ────────────────────────────────────────────────────────
class IsAdminOrReadOnly(permissions.BasePermission):
    """Read access for all authenticated users; write/delete for ADMIN only."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in permissions.SAFE_METHODS:
            return True
        return getattr(request.user, 'role', None) == 'ADMIN'


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and
                    getattr(request.user, 'role', None) == 'ADMIN')


# ── Suppliers ─────────────────────────────────────────────────────────────────
class SupplierListCreate(generics.ListCreateAPIView):
    queryset         = Supplier.objects.all()
    serializer_class = SupplierSerializer
    search_fields    = ('name',)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.IsAuthenticated()]
        return [IsAdmin()]


class SupplierDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAdmin]


# ── Locations ─────────────────────────────────────────────────────────────────
class LocationListCreate(generics.ListCreateAPIView):
    queryset         = Location.objects.all()
    serializer_class = LocationSerializer


class LocationDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Location.objects.all()
    serializer_class = LocationSerializer


# ── Items ─────────────────────────────────────────────────────────────────────
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
        data = request.data.copy()
        if hasattr(data, 'dict'):
            data = data.dict()

        opening_qty_raw = data.pop('opening_qty', None)
        unit_price_raw  = data.pop('unit_price',  None)
        location_id     = data.pop('location_id', None)

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

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()

        if opening_qty and opening_qty > 0 and unit_price and unit_price > 0:
            try:
                if location_id:
                    loc = Location.objects.get(id=location_id)
                else:
                    loc = Location.objects.filter(deleted_at__isnull=True).first()
                    if not loc:
                        loc = Location.objects.create(
                            name='Main Store',
                            location_type='STORE',
                        )
                StockLedger.objects.create(
                    item=item,
                    location=loc,
                    transaction_type=StockLedger.OPENING,
                    quantity=opening_qty,
                    unit_price=unit_price,
                    created_by=request.user if request.user.is_authenticated else None,
                    remark='Initial Opening Stock',
                )
            except Exception as ex:
                import logging
                logging.getLogger(__name__).error(
                    "Failed to create opening stock ledger for item %s: %s", item.pk, ex
                )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ItemDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        StockLedger.objects.filter(item=instance).delete()
        return super().destroy(request, *args, **kwargs)


# ── Stock Ledger (read-only list) ─────────────────────────────────────────────
class StockLedgerList(generics.ListAPIView):
    queryset         = StockLedger.objects.select_related('item', 'location', 'created_by')
    serializer_class = StockLedgerSerializer
    filterset_fields = ('item', 'location', 'transaction_type')
    search_fields    = ('item__name', 'reference_type')
    ordering_fields  = ('created_at',)


# ── Closing Stock Report ──────────────────────────────────────────────────────
class ClosingStockView(APIView):
    def get(self, request):
        item_id     = request.query_params.get('item')
        location_id = request.query_params.get('location')
        as_of       = request.query_params.get('as_of')
        data = StockService.get_closing_stock(item_id, location_id, as_of)
        return Response(list(data))


# ── Purchase ──────────────────────────────────────────────────────────────────
class PurchaseListCreate(generics.ListCreateAPIView):
    queryset         = Purchase.objects.select_related('supplier', 'item', 'location')
    serializer_class = PurchaseSerializer
    filterset_fields = ('supplier', 'item', 'location', 'purchase_date')
    search_fields    = ('invoice_number', 'item__name', 'supplier__name')

    def create(self, request, *args, **kwargs):
        try:
            data = request.data.copy()
            # Handle manual supplier name: create or get supplier by name
            supplier_name = data.get('supplier_name', '').strip()
            if supplier_name and not data.get('supplier_id'):
                supplier, _ = Supplier.objects.get_or_create(
                    name__iexact=supplier_name,
                    defaults={'name': supplier_name}
                )
                data['supplier_id'] = supplier.pk
            purchase = PurchaseService.create_purchase(data, user=request.user)
            return Response(PurchaseSerializer(purchase).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class PurchaseDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Purchase.objects.all()
    serializer_class = PurchaseSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.ledger_entry_id:
            StockLedger.objects.filter(id=instance.ledger_entry_id).delete()
        return super().destroy(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)


# ── Purchase Preview (auto-calc endpoint) ─────────────────────────────────────
class PurchasePreviewView(APIView):
    def post(self, request):
        s = PurchasePreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)


# ── Issue ─────────────────────────────────────────────────────────────────────
class IssueListCreate(generics.ListCreateAPIView):
    queryset         = IssueItem.objects.select_related('item', 'location', 'truck')
    serializer_class = IssueItemSerializer
    filterset_fields = ('item', 'location', 'issue_type', 'truck')

    def create(self, request, *args, **kwargs):
        try:
            issue = IssueService.create_issue(request.data, user=request.user)
            return Response(IssueItemSerializer(issue).data, status=status.HTTP_201_CREATED)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class IssueDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = IssueItem.objects.all()
    serializer_class = IssueItemSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.ledger_entry_id:
            StockLedger.objects.filter(id=instance.ledger_entry_id).delete()
        return super().destroy(request, *args, **kwargs)


# ── Available Stock Check ─────────────────────────────────────────────────────
@api_view(['GET'])
def available_stock(request):
    item_id     = request.query_params.get('item')
    location_id = request.query_params.get('location')
    if not item_id:
        return Response({'error': 'item param required'}, status=400)
    qty = StockService.get_available_qty(item_id, location_id)
    return Response({'available_qty': float(qty)})


# ── Opening Stock (standalone endpoint) ──────────────────────────────────────
@api_view(['POST'])
def post_opening_stock(request):
    from decimal import Decimal, InvalidOperation

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
            return Response({'error': 'Location not found'}, status=404)
    else:
        loc = Location.objects.filter(deleted_at__isnull=True).first()
        if not loc:
            loc = Location.objects.create(name='Main Store', location_type='STORE')

    entry = StockLedger.objects.create(
        item=item,
        location=loc,
        transaction_type=StockLedger.OPENING,
        quantity=qty,
        unit_price=price,
        created_by=request.user if request.user.is_authenticated else None,
        remark='Opening Stock',
    )

    return Response({
        'id': entry.pk,
        'item': item.name,
        'location': loc.name,
        'quantity': float(qty),
        'unit_price': float(price),
        'final_amount': float(entry.final_amount),
        'message': f'Opening stock of {qty} units posted for {item.name}',
    }, status=201)
