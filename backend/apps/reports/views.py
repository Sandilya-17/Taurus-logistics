"""apps/reports/views.py – Dashboard summary + all report endpoints."""
from decimal import Decimal
from datetime import date, timedelta
import io

from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.http import HttpResponse

from rest_framework.views import APIView
from rest_framework.response import Response

from apps.trucks.models import Truck
from apps.drivers.models import Driver
from apps.trips.models import Trip
from apps.fuel.models import FuelLog
from apps.finance.models import Revenue, Expenditure
from apps.inventory.models import Item, StockLedger
from apps.invoicing.models import Invoice
from apps.maintenance.models import MaintenanceLog
from apps.tyres.models import Tyre, TyreAssignment


# ── Helpers ─────────────────────────────────────────────────────────────

def _parse_dates(request):
    today = timezone.now().date()
    try:
        date_from = date.fromisoformat(request.query_params.get('date_from', ''))
    except (ValueError, TypeError):
        date_from = today.replace(day=1)
    try:
        date_to = date.fromisoformat(request.query_params.get('date_to', ''))
    except (ValueError, TypeError):
        date_to = today
    return date_from, date_to


def _fmt(val):
    if val is None:
        return 0
    return float(round(Decimal(str(val)), 2))


def _export_excel(headers, rows, sheet_name='Report'):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = sheet_name
        ws.append(headers)
        for cell in ws[1]:
            cell.font = Font(bold=True, color='FFFFFF')
            cell.fill = PatternFill('solid', fgColor='1a56db')
            cell.alignment = Alignment(horizontal='center')
        for row in rows:
            ws.append(list(row))
        buf = io.BytesIO()
        wb.save(buf)
        buf.seek(0)
        resp = HttpResponse(
            buf.read(),
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        resp['Content-Disposition'] = f'attachment; filename="{sheet_name}.xlsx"'
        return resp
    except ImportError:
        return HttpResponse('openpyxl not installed', status=500)


def _export_pdf(headers, rows, title='Report'):
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
        from reportlab.lib.styles import getSampleStyleSheet

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                                leftMargin=20, rightMargin=20,
                                topMargin=30, bottomMargin=30)
        styles = getSampleStyleSheet()
        elements = [Paragraph(title, styles['Title'])]
        data = [headers] + [list(r) for r in rows]
        tbl = Table(data, repeatRows=1)
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a56db')),
            ('TEXTCOLOR',  (0, 0), (-1, 0), colors.white),
            ('FONTNAME',   (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE',   (0, 0), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f3f4f6')]),
            ('GRID', (0, 0), (-1, -1), 0.3, colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))
        elements.append(tbl)
        doc.build(elements)
        buf.seek(0)
        resp = HttpResponse(buf.read(), content_type='application/pdf')
        resp['Content-Disposition'] = f'attachment; filename="{title}.pdf"'
        return resp
    except ImportError:
        return HttpResponse('reportlab not installed', status=500)


def _respond(request, headers, rows, summary=None, sheet_name='Report'):
    export = request.query_params.get('export', 'json')
    if export == 'excel':
        return _export_excel(headers, rows, sheet_name)
    if export == 'pdf':
        return _export_pdf(headers, rows, sheet_name)
    return Response({
        'headers': headers,
        'rows': rows,
        'summary': summary or {},
    })


# ── Dashboard ────────────────────────────────────────────────────────────

class DashboardSummaryView(APIView):
    def get(self, request):
        today = timezone.now().date()
        month_start = today.replace(day=1)

        active_trucks  = Truck.objects.filter(status=Truck.ACTIVE).count()
        active_drivers = Driver.objects.filter(status=Driver.ACTIVE).count()
        ongoing_trips  = Trip.objects.filter(
            status__in=[Trip.EN_ROUTE, Trip.PLANNED]
        ).count()

        # Trips this month — count by loading_time date
        trips_this_month = Trip.objects.filter(
            loading_time__date__gte=month_start,
            loading_time__date__lte=today,
        ).count()

        monthly_revenue = Revenue.objects.filter(
            date__gte=month_start, date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        monthly_expenditure = Expenditure.objects.filter(
            date__gte=month_start, date__lte=today
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0')

        fuel_agg = FuelLog.objects.filter(
            date__gte=month_start, date__lte=today
        ).aggregate(
            litres=Sum('litres'),
            excess_events=Count('id', filter=Q(excess_fuel__gt=0)),
        )
        fuel_litres        = fuel_agg['litres'] or Decimal('0')
        fuel_excess_events = fuel_agg['excess_events'] or 0

        # Sum ALL ledger rows — issued rows have negative final_amount,
        # so SUM(final_amount) gives the true closing stock value.
        # Filtering quantity__gt=0 would skip issued rows and inflate the total.
        stock_value = StockLedger.objects.aggregate(
            total=Sum('final_amount')
        )['total'] or Decimal('0')

        stock_items = Item.objects.count()

        alerts = []
        for truck in Truck.objects.filter(status=Truck.ACTIVE):
            alerts.extend(truck.expiry_alerts())
        alerts.sort(key=lambda a: a['days_remaining'])

        return Response({
            'fleet': {
                'active_trucks':  active_trucks,
                'active_drivers': active_drivers,
                'ongoing_trips':  ongoing_trips,
            },
            'this_month': {
                'trips':              trips_this_month,
                'revenue':            str(_fmt(monthly_revenue)),
                'expenditure':        str(_fmt(monthly_expenditure)),
                'fuel_litres':        _fmt(fuel_litres),
                'fuel_excess_events': fuel_excess_events,
            },
            'stock_value': _fmt(stock_value),
            'stock_items': stock_items,
            'expiry_alerts': alerts,
        })


# ── Revenue vs Expenditure ───────────────────────────────────────────────

class RevenueExpenditureReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)

        revenues     = Revenue.objects.filter(date__gte=date_from, date__lte=date_to)
        expenditures = Expenditure.objects.filter(date__gte=date_from, date__lte=date_to)

        total_rev = revenues.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        total_exp = expenditures.aggregate(t=Sum('amount'))['t'] or Decimal('0')
        net       = total_rev - total_exp

        headers = ['Date', 'Type', 'Category / Source', 'Description', 'Reference', 'Amount (GH\u20b5)']
        rows = []
        for r in revenues.order_by('date'):
            rows.append([str(r.date), 'Revenue', r.get_source_display(),
                         r.description or '', r.reference or '', _fmt(r.amount)])
        for e in expenditures.order_by('date'):
            rows.append([str(e.date), 'Expenditure', e.get_category_display(),
                         e.description or '', e.reference or '', _fmt(e.amount)])
        rows.sort(key=lambda x: x[0])

        summary = {
            'Total Revenue':     _fmt(total_rev),
            'Total Expenditure': _fmt(total_exp),
            'Net Profit / Loss': _fmt(net),
        }
        return _respond(request, headers, rows, summary, 'Revenue vs Expenditure')


# ── Fuel Report ──────────────────────────────────────────────────────────

class FuelReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        logs = FuelLog.objects.filter(
            date__gte=date_from, date__lte=date_to
        ).select_related('truck', 'trip').order_by('date')

        headers = ['Date', 'Truck', 'Trip / Waybill', 'Litres', 'Limit', 'Excess',
                   'Price/L (GH\u20b5)', 'Total Cost (GH\u20b5)', 'Remark']
        rows = []
        for fl in logs:
            rows.append([
                str(fl.date), fl.truck.truck_number,
                fl.trip.waybill_no if fl.trip else '\u2014',
                _fmt(fl.litres), _fmt(fl.fuel_limit), _fmt(fl.excess_fuel),
                _fmt(fl.price_per_litre), _fmt(fl.total_cost), fl.remark or '',
            ])

        agg = logs.aggregate(
            total_litres=Sum('litres'), total_excess=Sum('excess_fuel'), total_cost=Sum('total_cost'),
        )
        summary = {
            'Total Litres':     _fmt(agg['total_litres']),
            'Total Excess (L)': _fmt(agg['total_excess']),
            'Total Cost (GH\u20b5)': _fmt(agg['total_cost']),
            'Excess Events':    logs.filter(excess_fuel__gt=0).count(),
        }
        return _respond(request, headers, rows, summary, 'Fuel Report')


# ── Trip Report ──────────────────────────────────────────────────────────

class TripReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        truck_id = request.query_params.get('truck')
        qs = Trip.objects.filter(
            loading_time__date__gte=date_from,
            loading_time__date__lte=date_to,
        ).select_related('truck', 'driver')
        if truck_id:
            qs = qs.filter(truck_id=truck_id)
        qs = qs.order_by('loading_time')

        headers = ['Waybill', 'Truck', 'Driver', 'Origin', 'Destination', 'Material',
                   'Loaded (t)', 'Delivered (t)', 'Status', 'Revenue (GH\u20b5)', 'Loading Date']
        rows = []
        for t in qs:
            rows.append([
                t.waybill_no, t.truck.truck_number, t.driver.name,
                t.origin, t.destination, t.material_type,
                _fmt(t.loaded_qty),
                _fmt(t.delivered_qty) if t.delivered_qty is not None else '\u2014',
                t.get_status_display(), _fmt(t.trip_revenue),
                str(t.loading_time.date()),
            ])

        agg = qs.aggregate(
            total_rev=Sum('trip_revenue'),
            total_loaded=Sum('loaded_qty'),
            total_delivered=Sum('delivered_qty'),
        )
        summary = {
            'Total Trips':         qs.count(),
            'Total Revenue (GH\u20b5)': _fmt(agg['total_rev']),
            'Total Loaded (t)':    _fmt(agg['total_loaded']),
            'Total Delivered (t)': _fmt(agg['total_delivered']),
        }
        return _respond(request, headers, rows, summary, 'Trip Report')


# ── Trip P&L Report ──────────────────────────────────────────────────────

class TripDetailReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        truck_id = request.query_params.get('truck')
        qs = Trip.objects.filter(
            loading_time__date__gte=date_from,
            loading_time__date__lte=date_to,
        ).select_related('truck', 'driver')
        if truck_id:
            qs = qs.filter(truck_id=truck_id)
        qs = qs.order_by('loading_time')

        headers = ['Waybill', 'Truck', 'Driver', 'Route',
                   'Revenue (GH\u20b5)', 'Fuel Cost (GH\u20b5)', 'Spare Parts (GH\u20b5)', 'Net Profit (GH\u20b5)']
        rows = []
        for t in qs:
            rows.append([
                t.waybill_no, t.truck.truck_number, t.driver.name,
                f'{t.origin} \u2192 {t.destination}',
                _fmt(t.trip_revenue), _fmt(t.fuel_cost),
                _fmt(t.spare_parts_cost), _fmt(t.net_profit),
            ])

        summary = {
            'Total Revenue (GH\u20b5)':     round(sum(float(r[4]) for r in rows), 2),
            'Total Fuel Cost (GH\u20b5)':   round(sum(float(r[5]) for r in rows), 2),
            'Total Spare Parts (GH\u20b5)': round(sum(float(r[6]) for r in rows), 2),
            'Net Profit (GH\u20b5)':        round(sum(float(r[7]) for r in rows), 2),
        }
        return _respond(request, headers, rows, summary, 'Trip P&L')


# ── Truck-wise Summary ───────────────────────────────────────────────────

class TruckWiseSummaryView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        truck_id = request.query_params.get('truck')
        qs = Truck.objects.filter(status=Truck.ACTIVE)
        if truck_id:
            qs = qs.filter(id=truck_id)

        headers = ['Truck', 'Model', 'Trips', 'Revenue (GH\u20b5)',
                   'Fuel Cost (GH\u20b5)', 'Spare Parts (GH\u20b5)', 'Net Profit (GH\u20b5)']
        rows = []
        for truck in qs:
            trips = Trip.objects.filter(
                truck=truck,
                loading_time__date__gte=date_from,
                loading_time__date__lte=date_to,
            )
            agg   = trips.aggregate(rev=Sum('trip_revenue'), fuel=Sum('fuel_cost'), spare=Sum('spare_parts_cost'))
            rev   = _fmt(agg['rev'])
            fuel  = _fmt(agg['fuel'])
            spare = _fmt(agg['spare'])
            net   = round(rev - fuel - spare, 2)
            rows.append([truck.truck_number, truck.model, trips.count(), rev, fuel, spare, net])

        summary = {
            'Total Revenue (GH\u20b5)':     round(sum(float(r[3]) for r in rows), 2),
            'Total Fuel Cost (GH\u20b5)':   round(sum(float(r[4]) for r in rows), 2),
            'Total Spare Parts (GH\u20b5)': round(sum(float(r[5]) for r in rows), 2),
            'Net Profit (GH\u20b5)':        round(sum(float(r[6]) for r in rows), 2),
        }
        return _respond(request, headers, rows, summary, 'Truck-wise Summary')


# ── Stock Report ─────────────────────────────────────────────────────────

class StockReportView(APIView):
    def get(self, request):
        items = Item.objects.all().order_by('item_type', 'name')
        headers = ['Item', 'Type', 'Unit', 'Qty in Stock', 'Stock Value (GH\u20b5)', 'Reorder Level']
        rows = []
        total_value = Decimal('0')
        for item in items:
            qty   = item.available_qty()
            value = item.available_value()
            total_value += value
            rows.append([item.name, item.get_item_type_display(), item.unit,
                         _fmt(qty), _fmt(value), _fmt(item.reorder_level)])

        summary = {
            'Total Items':       len(rows),
            'Total Value (GH\u20b5)': _fmt(total_value),
            'Low Stock Items':   sum(1 for r in rows if float(r[3]) <= float(r[5]) and float(r[5]) > 0),
        }
        return _respond(request, headers, rows, summary, 'Stock Report')


# ── Invoice Report ───────────────────────────────────────────────────────

class InvoiceReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        invoices = Invoice.objects.filter(
            invoice_date__gte=date_from, invoice_date__lte=date_to
        ).order_by('invoice_date')

        headers = ['Invoice #', 'Client', 'Date', 'Status', 'Subtotal (GH\u20b5)',
                   'VAT (GH\u20b5)', 'Total (GH\u20b5)', 'Paid (GH\u20b5)', 'Balance (GH\u20b5)']
        rows = []
        for inv in invoices:
            rows.append([
                inv.invoice_number, inv.client_name, str(inv.invoice_date),
                inv.get_status_display(),
                _fmt(inv.subtotal), _fmt(inv.vat_amount), _fmt(inv.total_amount),
                _fmt(inv.paid_amount), _fmt(inv.balance_due),
            ])

        agg = invoices.aggregate(
            total=Sum('total_amount'), paid=Sum('paid_amount'),
            balance=Sum('balance_due'), vat=Sum('vat_amount'),
        )
        summary = {
            'Total Invoiced (GH\u20b5)': _fmt(agg['total']),
            'Total Paid (GH\u20b5)':     _fmt(agg['paid']),
            'Balance Due (GH\u20b5)':    _fmt(agg['balance']),
            'Total VAT (GH\u20b5)':      _fmt(agg['vat']),
        }
        return _respond(request, headers, rows, summary, 'Invoice Report')


# ── Spare Parts Report ───────────────────────────────────────────────────

class SparePartsReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        ledger = StockLedger.objects.filter(
            item__item_type='SPARE_PART',
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        ).select_related('item', 'location').order_by('created_at')

        headers = ['Date', 'Item', 'Transaction', 'Qty', 'Unit Cost (GH\u20b5)', 'Total (GH\u20b5)', 'Location', 'Reference']
        rows = []
        for entry in ledger:
            rows.append([
                str(entry.created_at.date()), entry.item.name,
                entry.get_transaction_type_display(),
                _fmt(entry.quantity), _fmt(entry.unit_price), _fmt(entry.final_amount),
                entry.location.name if entry.location else '\u2014',
                entry.reference or '',
            ])
        return _respond(request, headers, rows, {}, 'Spare Parts Report')


# ── Maintenance Report ───────────────────────────────────────────────────

class MaintenanceReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        logs = MaintenanceLog.objects.filter(
            service_date__gte=date_from, service_date__lte=date_to
        ).select_related('truck', 'mechanic').order_by('service_date')

        headers = ['Date', 'Truck', 'Type', 'Description', 'Mechanic',
                   'Labour Cost (GH\u20b5)', 'Parts Cost (GH\u20b5)', 'Total (GH\u20b5)', 'Status']
        rows = []
        for log in logs:
            mtype  = log.get_maintenance_type_display() if hasattr(log, 'get_maintenance_type_display') else (log.maintenance_type or '')
            status = log.get_status_display()           if hasattr(log, 'get_status_display')           else (log.status or '')
            rows.append([
                str(log.service_date), log.truck.truck_number,
                mtype, log.description or '',
                log.mechanic.name if log.mechanic else '\u2014',
                _fmt(getattr(log, 'labour_cost', 0)),
                _fmt(getattr(log, 'parts_cost',  0)),
                _fmt(getattr(log, 'total_cost',  0)),
                status,
            ])

        summary = {'Total Records': len(rows)}
        return _respond(request, headers, rows, summary, 'Maintenance Report')


# ── VAT Report ───────────────────────────────────────────────────────────

class VATReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        invoices = Invoice.objects.filter(
            invoice_date__gte=date_from, invoice_date__lte=date_to,
            vat_applicable=True,
        ).order_by('invoice_date')

        headers = ['Invoice #', 'Client', 'Date', 'Subtotal (GH\u20b5)', 'VAT %', 'VAT Amount (GH\u20b5)', 'Total (GH\u20b5)']
        rows = []
        for inv in invoices:
            rows.append([
                inv.invoice_number, inv.client_name, str(inv.invoice_date),
                _fmt(inv.subtotal), _fmt(inv.vat_percentage),
                _fmt(inv.vat_amount), _fmt(inv.total_amount),
            ])

        total_vat = invoices.aggregate(t=Sum('vat_amount'))['t'] or Decimal('0')
        summary   = {'Total VAT Collected (GH\u20b5)': _fmt(total_vat)}
        return _respond(request, headers, rows, summary, 'VAT Report')


# ── Tyre Report ──────────────────────────────────────────────────────────

class TyreReportView(APIView):
    def get(self, request):
        tyres = Tyre.objects.all().order_by('status', 'serial_number')

        headers = ['Serial #', 'Brand', 'Model', 'Size', 'Status',
                   'Unit Cost (GH\u20b5)', 'Truck Fitted', 'Position', 'KM Used']
        rows = []
        for tyre in tyres:
            asgn = tyre.current_assignment
            rows.append([
                tyre.serial_number, tyre.brand, tyre.model, tyre.size,
                tyre.get_status_display(), _fmt(tyre.unit_cost),
                asgn.truck.truck_number if asgn else '\u2014',
                asgn.position          if asgn else '\u2014',
                _fmt(asgn.km_used)     if asgn and asgn.km_used else '\u2014',
            ])

        summary = {
            'Total Tyres': len(rows),
            'Fitted':      sum(1 for t in tyres if t.status == Tyre.FITTED),
            'In Store':    sum(1 for t in tyres if t.status == Tyre.STORE),
            'Condemned':   sum(1 for t in tyres if t.status == Tyre.CONDEMNED),
        }
        return _respond(request, headers, rows, summary, 'Tyre Report')


# ── Lubricant Report ─────────────────────────────────────────────────────

class LubricantReportView(APIView):
    def get(self, request):
        date_from, date_to = _parse_dates(request)
        ledger = StockLedger.objects.filter(
            item__item_type='LUBRICANT',
            created_at__date__gte=date_from,
            created_at__date__lte=date_to,
        ).select_related('item', 'location').order_by('created_at')

        headers = ['Date', 'Item', 'Transaction', 'Qty', 'Unit', 'Unit Cost (GH\u20b5)', 'Total (GH\u20b5)', 'Location']
        rows = []
        for entry in ledger:
            rows.append([
                str(entry.created_at.date()), entry.item.name,
                entry.get_transaction_type_display(),
                _fmt(entry.quantity), entry.item.unit,
                _fmt(entry.unit_price), _fmt(entry.final_amount),
                entry.location.name if entry.location else '\u2014',
            ])
        return _respond(request, headers, rows, {}, 'Lubricant Report')


# ── Utility views ────────────────────────────────────────────────────────

class CleanupOrphanedRevenueView(APIView):
    def post(self, request):
        deleted, _ = Revenue.objects.filter(
            trip__isnull=False, trip__status=Trip.CANCELLED
        ).delete()
        return Response({'deleted': deleted})


class PurgePhantomTripsView(APIView):
    def post(self, request):
        cutoff = timezone.now().date() - timedelta(days=90)
        qs = Trip.objects.filter(
            status=Trip.PLANNED,
            loading_time__date__lt=cutoff,
            revenue_entries__isnull=True,
        )
        count = qs.count()
        qs.delete()
        return Response({'purged': count})
