"""apps/reports/views.py – Fixed report suite.
Bugs fixed:
  1. unit_cost -> unit_price  (StockLedger field is unit_price)
  2. MaintenanceRecord -> MaintenanceLog  (correct model name)
  3. rec.date -> rec.service_date
  4. rec.cost -> rec.total_cost
  5. rec.next_due_date -> rec.next_service_date
  6. rec.vendor removed (no such field; uses mechanic instead)
  7. vat_enabled -> vat_applicable  (Invoice field name)
  8. vat_percent -> vat_percentage  (Invoice field name)
  9. expiry_alerts() now includes truck_number in each alert dict
 10. Dashboard stock_value uses per-item available_value() correctly
"""
from io import BytesIO
from datetime import date, timedelta
from decimal import Decimal

from django.db.models import Sum, Count, Q
from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.response import Response


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_date_range(request, default_days=30):
    today = date.today()
    date_from = request.query_params.get('date_from') or str(today - timedelta(days=default_days))
    date_to   = request.query_params.get('date_to')   or str(today)
    return date_from, date_to


def _excel_response(filename):
    r = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    r['Content-Disposition'] = f'attachment; filename="{filename}"'
    return r


def _pdf_response(filename):
    r = HttpResponse(content_type='application/pdf')
    r['Content-Disposition'] = f'attachment; filename="{filename}"'
    return r


# ── Excel builder ─────────────────────────────────────────────────────────────

def build_excel(title, headers, rows, summary=None):
    try:
        import openpyxl
        from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
        from openpyxl.utils import get_column_letter
    except ImportError:
        raise ImportError("openpyxl is required: pip install openpyxl")

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Report"

    ws.merge_cells(f"A1:{get_column_letter(len(headers))}1")
    title_cell = ws["A1"]
    title_cell.value = title
    title_cell.font = Font(bold=True, size=13, color="FFFFFF")
    title_cell.fill = PatternFill("solid", fgColor="1a3a6e")
    title_cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 28

    header_fill = PatternFill("solid", fgColor="2563EB")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    thin = Side(border_style="thin", color="D1D5DB")

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=2, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = Border(bottom=thin)

    alt_fill = PatternFill("solid", fgColor="F8FAFC")
    for row_idx, row in enumerate(rows, 3):
        for col_idx, val in enumerate(row, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            if row_idx % 2 == 0:
                cell.fill = alt_fill
            if isinstance(val, (int, float)) and col_idx > 1:
                cell.number_format = '#,##0.00'
                cell.alignment = Alignment(horizontal="right")

    if summary:
        gap_row = len(rows) + 4
        ws.cell(row=gap_row, column=1, value="SUMMARY").font = Font(bold=True, size=11)
        for i, (k, v) in enumerate(summary.items()):
            r = gap_row + 1 + i
            ws.cell(row=r, column=1, value=k).font = Font(bold=True)
            cell = ws.cell(row=r, column=2, value=v)
            if isinstance(v, (int, float)):
                cell.number_format = '#,##0.00'

    for col_idx in range(1, len(headers) + 1):
        max_len = len(str(headers[col_idx - 1]))
        for row in rows:
            try:
                max_len = max(max_len, len(str(row[col_idx - 1])))
            except IndexError:
                pass
        ws.column_dimensions[get_column_letter(col_idx)].width = min(max_len + 4, 40)

    buf = BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ── PDF builder ───────────────────────────────────────────────────────────────

def build_pdf(title, headers, rows, summary=None):
    try:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import cm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    except ImportError:
        raise ImportError("reportlab is required: pip install reportlab")

    buf = BytesIO()
    page = landscape(A4) if len(headers) > 6 else A4
    doc = SimpleDocTemplate(buf, pagesize=page,
                            leftMargin=1.5*cm, rightMargin=1.5*cm,
                            topMargin=2*cm, bottomMargin=2*cm)

    styles = getSampleStyleSheet()
    brand  = colors.HexColor('#1a3a6e')
    accent = colors.HexColor('#2563EB')

    title_style = ParagraphStyle('TitleStyle', parent=styles['Title'],
                                 fontSize=16, textColor=brand, spaceAfter=6)
    sub_style   = ParagraphStyle('SubStyle', parent=styles['Normal'],
                                 fontSize=9, textColor=colors.grey, spaceAfter=12)

    story = [
        Paragraph("Taurus Trade & Logistics ERP", sub_style),
        Paragraph(title, title_style),
        Paragraph(f"Generated: {date.today().strftime('%d %B %Y')}", sub_style),
        Spacer(1, 0.3*cm),
    ]

    col_w = (page[0] - 3*cm) / len(headers)
    table_data = [headers] + [list(map(str, r)) for r in rows]
    tbl = Table(table_data, colWidths=[col_w] * len(headers), repeatRows=1)
    tbl.setStyle(TableStyle([
        ('BACKGROUND',     (0, 0), (-1, 0),  accent),
        ('TEXTCOLOR',      (0, 0), (-1, 0),  colors.white),
        ('FONTNAME',       (0, 0), (-1, 0),  'Helvetica-Bold'),
        ('FONTSIZE',       (0, 0), (-1, 0),  9),
        ('ALIGN',          (0, 0), (-1, 0),  'CENTER'),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')]),
        ('FONTSIZE',       (0, 1), (-1, -1), 8),
        ('GRID',           (0, 0), (-1, -1), 0.4, colors.HexColor('#E2E8F0')),
        ('TOPPADDING',     (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING',  (0, 0), (-1, -1), 5),
        ('LEFTPADDING',    (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)

    if summary:
        story.append(Spacer(1, 0.5*cm))
        story.append(Paragraph("Summary", ParagraphStyle(
            'SumHead', parent=styles['Heading2'], fontSize=11, textColor=brand)))
        sum_data = [[str(k), f"GH\u20b5 {float(v):,.2f}" if isinstance(v, (int, float)) else str(v)]
                    for k, v in summary.items()]
        stbl = Table(sum_data, colWidths=[8*cm, 5*cm])
        stbl.setStyle(TableStyle([
            ('BACKGROUND',  (0, 0), (0, -1), colors.HexColor('#EFF6FF')),
            ('FONTNAME',    (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE',    (0, 0), (-1, -1), 9),
            ('GRID',        (0, 0), (-1, -1), 0.4, colors.HexColor('#BFDBFE')),
            ('TOPPADDING',  (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING',(0, 0),(-1, -1), 5),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(stbl)

    doc.build(story)
    buf.seek(0)
    return buf


# ================================================================
# REPORT VIEWS
# ================================================================

class RevenueExpenditureReportView(APIView):
    def get(self, request):
        from apps.finance.models import Revenue, Expenditure
        date_from, date_to = _parse_date_range(request)

        rev_qs = (Revenue.objects.filter(date__range=[date_from, date_to])
                  .values('source').annotate(total=Sum('amount')).order_by('-total'))
        exp_qs = (Expenditure.objects.filter(date__range=[date_from, date_to])
                  .values('category').annotate(total=Sum('amount')).order_by('-total'))

        total_rev = sum(r['total'] or 0 for r in rev_qs)
        total_exp = sum(e['total'] or 0 for e in exp_qs)
        net = total_rev - total_exp
        revenue_by_source = {r['source']: float(r['total'] or 0) for r in rev_qs}

        headers = ['Category / Source', 'Type', 'Amount (GH\u20b5)']
        rows = []
        for r in rev_qs:
            rows.append([r['source'].replace('_', ' '), 'REVENUE', float(r['total'] or 0)])
        for e in exp_qs:
            rows.append([e['category'].replace('_', ' '), 'EXPENDITURE', float(e['total'] or 0)])

        summary = {
            'Total Revenue (GH\u20b5)':     float(total_rev),
            'Total Expenditure (GH\u20b5)': float(total_exp),
            'Net Profit / Loss (GH\u20b5)': float(net),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Revenue vs Expenditure  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'pnl_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'pnl_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary,
                         'revenue_by_source': revenue_by_source})


class FuelReportView(APIView):
    def get(self, request):
        from apps.fuel.models import FuelLog
        date_from, date_to = _parse_date_range(request)

        logs = (FuelLog.objects.select_related('truck', 'trip')
                .filter(date__range=[date_from, date_to]).order_by('-date'))

        headers = ['Date', 'Truck', 'Trip', 'Litres', 'Limit (L)',
                   'Excess (L)', 'Price/L', 'Total Cost', 'Excess Cost', 'Remark']
        rows = []
        total_litres = Decimal('0')
        total_cost   = Decimal('0')
        total_excess = Decimal('0')
        excess_events = 0

        for log in logs:
            excess_cost = log.excess_fuel * log.price_per_litre
            rows.append([
                str(log.date),
                log.truck.truck_number,
                log.trip.waybill_no if log.trip else '—',
                float(log.litres),
                float(log.fuel_limit),
                float(log.excess_fuel),
                float(log.price_per_litre),
                float(log.total_cost),
                float(excess_cost),
                log.remark or '—',
            ])
            total_litres += log.litres
            total_cost   += log.total_cost
            total_excess += log.excess_fuel
            if log.excess_fuel > 0:
                excess_events += 1

        summary = {
            'Total Litres Issued':    float(total_litres),
            'Total Fuel Cost (GH\u20b5)': float(total_cost),
            'Total Excess Litres':    float(total_excess),
            'Excess Incidents':       excess_events,
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Fuel Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'fuel_report_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'fuel_report_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class TripReportView(APIView):
    def get(self, request):
        from apps.trips.models import Trip
        date_from, date_to = _parse_date_range(request)

        trips = (Trip.objects.select_related('truck', 'driver')
                 .filter(loading_time__date__range=[date_from, date_to])
                 .order_by('-loading_time'))

        headers = ['Waybill', 'Date', 'Truck', 'Driver', 'Origin', 'Destination',
                   'Material', 'Loaded (t)', 'Delivered (t)', 'Diff (t)', 'Revenue (GH\u20b5)', 'Status']
        rows = []
        total_revenue = Decimal('0')
        total_loaded  = Decimal('0')

        for t in trips:
            rows.append([
                t.waybill_no,
                str(t.loading_time.date()),
                t.truck.truck_number,
                f"{t.driver.first_name} {t.driver.last_name}",
                t.origin,
                t.destination,
                t.material_type,
                float(t.loaded_qty),
                float(t.delivered_qty or 0),
                float(t.qty_difference or 0),
                float(t.trip_revenue),
                t.status,
            ])
            total_revenue += t.trip_revenue
            total_loaded  += t.loaded_qty

        summary = {
            'Total Trips':             len(rows),
            'Total Loaded (tonnes)':   float(total_loaded),
            'Total Revenue (GH\u20b5)': float(total_revenue),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Trip Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'trips_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'trips_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class StockReportView(APIView):
    def get(self, request):
        from apps.inventory.models import Item

        items = Item.objects.filter(deleted_at__isnull=True).order_by('item_type', 'name')

        headers = ['Item', 'Type', 'Unit', 'Qty in Stock', 'Stock Value (GH\u20b5)', 'Reorder Level', 'Status']
        rows = []
        total_value = Decimal('0')

        for item in items:
            qty   = item.available_qty()
            value = item.available_value()
            total_value += value
            status = 'LOW STOCK' if qty <= item.reorder_level and item.reorder_level > 0 else 'OK'
            rows.append([
                item.name,
                item.get_item_type_display(),
                item.unit,
                float(qty),
                float(value),
                float(item.reorder_level),
                status,
            ])

        summary = {
            'Total Items':              len(rows),
            'Total Stock Value (GH\u20b5)': float(total_value),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Stock Report \u2014 as of {date.today()}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'stock_{date.today()}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'stock_{date.today()}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class InvoiceReportView(APIView):
    def get(self, request):
        from apps.invoicing.models import Invoice
        date_from, date_to = _parse_date_range(request)

        invoices = (Invoice.objects.prefetch_related('lines').select_related('trip')
                    .filter(invoice_date__range=[date_from, date_to])
                    .order_by('-invoice_date'))

        headers = ['Invoice #', 'Date', 'Client', 'Trip', 'Qty', 'Subtotal', 'VAT', 'Total', 'Status']
        rows = []
        total_invoiced = Decimal('0')
        total_paid     = Decimal('0')

        for inv in invoices:
            qty = sum(l.quantity for l in inv.lines.all())
            rows.append([
                inv.invoice_number,
                str(inv.invoice_date),
                inv.client_name,
                inv.trip.waybill_no if inv.trip else '—',
                float(qty),
                float(inv.subtotal),
                float(inv.vat_amount),
                float(inv.total_amount),
                inv.status,
            ])
            total_invoiced += inv.total_amount
            if inv.status == 'PAID':
                total_paid += inv.total_amount

        summary = {
            'Total Invoiced (GH\u20b5)': float(total_invoiced),
            'Received (GH\u20b5)':       float(total_paid),
            'Outstanding (GH\u20b5)':    float(total_invoiced - total_paid),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Invoice Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'invoices_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'invoices_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class SparePartsReportView(APIView):
    def get(self, request):
        from apps.inventory.models import StockLedger
        date_from, date_to = _parse_date_range(request)

        ledger = (StockLedger.objects.select_related('item', 'location')
                  .filter(item__item_type='SPARE_PART',
                          created_at__date__range=[date_from, date_to])
                  .order_by('-created_at'))

        headers = ['Date', 'Item', 'Transaction', 'Qty', 'Unit Price', 'Amount (GH\u20b5)', 'Location', 'Reference']
        rows = []
        total_in  = Decimal('0')
        total_out = Decimal('0')

        for entry in ledger:
            rows.append([
                str(entry.created_at.date()),
                entry.item.name,
                entry.get_transaction_type_display(),
                float(entry.quantity),
                float(entry.unit_price or 0),
                float(entry.final_amount or 0),
                entry.location.name if entry.location else '—',
                entry.remark or '—',
            ])
            if entry.quantity > 0:
                total_in  += entry.final_amount or 0
            else:
                total_out += abs(entry.final_amount or 0)

        summary = {
            'Total Inward Value (GH\u20b5)': float(total_in),
            'Total Issued Value (GH\u20b5)': float(total_out),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Spare Parts Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'spare_parts_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'spare_parts_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class MaintenanceReportView(APIView):
    def get(self, request):
        from apps.maintenance.models import MaintenanceLog
        date_from, date_to = _parse_date_range(request)

        records = (MaintenanceLog.objects.select_related('truck', 'mechanic')
                   .filter(service_date__range=[date_from, date_to])
                   .order_by('-service_date'))

        headers = ['Date', 'Truck', 'Type', 'Description', 'Cost (GH\u20b5)', 'Mechanic', 'Next Service Date']
        rows = []
        total_cost = Decimal('0')

        for rec in records:
            rows.append([
                str(rec.service_date),
                rec.truck.truck_number,
                rec.maintenance_type,
                rec.description[:60] if rec.description else '—',
                float(rec.total_cost or 0),
                rec.mechanic.name if rec.mechanic else '—',
                str(rec.next_service_date) if rec.next_service_date else '—',
            ])
            total_cost += rec.total_cost or 0

        summary = {'Total Maintenance Cost (GH\u20b5)': float(total_cost)}

        fmt = request.query_params.get('export', 'json')
        report_title = f'Maintenance Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'maintenance_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'maintenance_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class VATReportView(APIView):
    def get(self, request):
        from apps.invoicing.models import Invoice
        date_from, date_to = _parse_date_range(request)

        invoices = (Invoice.objects
                    .filter(invoice_date__range=[date_from, date_to], vat_applicable=True)
                    .order_by('-invoice_date'))

        headers = ['Invoice #', 'Date', 'Client', 'Subtotal (GH\u20b5)', 'VAT %', 'VAT Amount (GH\u20b5)', 'Total (GH\u20b5)', 'Status']
        rows = []
        total_vat = Decimal('0')

        for inv in invoices:
            rows.append([
                inv.invoice_number,
                str(inv.invoice_date),
                inv.client_name,
                float(inv.subtotal),
                float(inv.vat_percentage or 0),
                float(inv.vat_amount),
                float(inv.total_amount),
                inv.status,
            ])
            total_vat += inv.vat_amount

        summary = {'Total VAT Collected (GH\u20b5)': float(total_vat)}

        fmt = request.query_params.get('export', 'json')
        report_title = f'VAT Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'vat_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'vat_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class TyreReportView(APIView):
    def get(self, request):
        from apps.inventory.models import StockLedger
        date_from, date_to = _parse_date_range(request)

        ledger = (StockLedger.objects.select_related('item', 'location')
                  .filter(item__item_type='TYRE',
                          created_at__date__range=[date_from, date_to])
                  .order_by('-created_at'))

        headers = ['Date', 'Item', 'Transaction', 'Qty', 'Unit Price', 'Amount (GH\u20b5)', 'Location']
        rows = []
        total_value = Decimal('0')

        for entry in ledger:
            rows.append([
                str(entry.created_at.date()),
                entry.item.name,
                entry.get_transaction_type_display(),
                float(entry.quantity),
                float(entry.unit_price or 0),
                float(entry.final_amount or 0),
                entry.location.name if entry.location else '—',
            ])
            total_value += abs(entry.final_amount or 0)

        summary = {'Total Tyre Value (GH\u20b5)': float(total_value)}

        fmt = request.query_params.get('export', 'json')
        report_title = f'Tyre Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'tyres_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'tyres_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class LubricantReportView(APIView):
    def get(self, request):
        from apps.inventory.models import StockLedger
        date_from, date_to = _parse_date_range(request)

        ledger = (StockLedger.objects.select_related('item', 'location')
                  .filter(item__item_type='LUBRICANT',
                          created_at__date__range=[date_from, date_to])
                  .order_by('-created_at'))

        headers = ['Date', 'Item', 'Transaction', 'Qty', 'Unit', 'Unit Price (GH\u20b5)', 'Amount (GH\u20b5)', 'Location', 'Reference']
        rows = []
        total_in  = Decimal('0')
        total_out = Decimal('0')

        for entry in ledger:
            rows.append([
                str(entry.created_at.date()),
                entry.item.name,
                entry.get_transaction_type_display(),
                float(entry.quantity),
                entry.item.unit,
                float(entry.unit_price or 0),
                float(entry.final_amount or 0),
                entry.location.name if entry.location else '—',
                entry.remark or '—',
            ])
            if entry.quantity > 0:
                total_in  += entry.final_amount or 0
            else:
                total_out += abs(entry.final_amount or 0)

        summary = {
            'Total Purchased Value (GH\u20b5)': float(total_in),
            'Total Issued Value (GH\u20b5)':    float(total_out),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Lubricant Report  {date_from} \u2192 {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'lubricants_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'lubricants_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


# ================================================================
# DASHBOARD
# ================================================================

class DashboardSummaryView(APIView):
    def get(self, request):
        from apps.trucks.models import Truck
        from apps.drivers.models import Driver
        from apps.trips.models import Trip
        from apps.finance.models import Revenue, Expenditure
        from apps.fuel.models import FuelLog
        from apps.inventory.models import Item
        from django.utils import timezone

        today       = timezone.now().date()
        month_start = today.replace(day=1)

        # Clean orphaned revenue rows (trip deleted but revenue survived)
        from apps.finance.models import Revenue as _Rev
        try:
            _Rev.objects.filter(source=_Rev.TRIP_REVENUE, trip__isnull=True).delete()
            _Rev.objects.filter(source=_Rev.HAULAGE, invoice__isnull=False, invoice__trip__isnull=True).delete()
        except Exception:
            pass

        completed_trips_this_month = Trip.objects.filter(
            loading_time__date__gte=month_start, status='COMPLETED'
        ).count()

        fuel_agg = (FuelLog.objects.filter(date__gte=month_start)
                    .aggregate(litres=Sum('litres'),
                               excess_events=Count('id', filter=Q(excess_fuel__gt=0))))

        items = Item.objects.filter(deleted_at__isnull=True)
        stock_value = sum(item.available_value() for item in items)
        stock_items_count = items.count()

        trucks = Truck.objects.filter(status='ACTIVE')
        expiry_alerts = []
        for truck in trucks:
            for alert in truck.expiry_alerts():
                alert['truck_number'] = truck.truck_number
                expiry_alerts.append(alert)
        expiry_alerts.sort(key=lambda a: a['days_remaining'])

        return Response({
            'fleet': {
                'active_trucks':  Truck.objects.filter(status='ACTIVE').count(),
                'active_drivers': Driver.objects.filter(status='ACTIVE').count(),
                'ongoing_trips':  Trip.objects.filter(status='EN_ROUTE').count(),
            },
            'this_month': {
                'revenue':            float(Revenue.objects.filter(date__gte=month_start).aggregate(t=Sum('amount'))['t'] or 0),
                'expenditure':        float(Expenditure.objects.filter(date__gte=month_start).aggregate(t=Sum('amount'))['t'] or 0),
                'trips':              completed_trips_this_month,
                'fuel_litres':        float(fuel_agg.get('litres') or 0),
                'fuel_excess_events': fuel_agg.get('excess_events') or 0,
            },
            'stock_value': float(stock_value),
            'stock_items': stock_items_count,
            'expiry_alerts': expiry_alerts,
        })


# ================================================================
# TRUCK-WISE REPORTS
# ================================================================

class TruckWiseSummaryView(APIView):
    """Complete per-truck summary: revenue, fuel cost, spare parts, net profit."""
    def get(self, request):
        from apps.trucks.models import Truck
        from apps.trips.models import Trip
        from apps.fuel.models import FuelLog
        from apps.inventory.models import IssueItem
        from apps.finance.models import Expenditure
        from django.db.models import Sum, Count, Q

        date_from, date_to = _parse_date_range(request, default_days=90)
        truck_id = request.query_params.get('truck')

        trucks_qs = Truck.objects.filter(deleted_at__isnull=True)
        if truck_id:
            trucks_qs = trucks_qs.filter(pk=truck_id)

        rows = []
        grand_rev = grand_fuel = grand_spare = grand_net = Decimal('0')

        for truck in trucks_qs:
            rev = (Trip.objects.filter(
                truck=truck, status='COMPLETED',
                loading_time__date__range=[date_from, date_to]
            ).aggregate(t=Sum('trip_revenue'))['t'] or Decimal('0'))

            fuel = (FuelLog.objects.filter(
                truck=truck, date__range=[date_from, date_to]
            ).aggregate(t=Sum('total_cost'))['t'] or Decimal('0'))

            spare = (IssueItem.objects.filter(
                truck=truck, issue_date__range=[date_from, date_to],
                item__item_type='SPARE_PART'
            ).aggregate(t=Sum('final_amount'))['t'] or Decimal('0'))

            other_exp = (Expenditure.objects.filter(
                truck=truck, date__range=[date_from, date_to]
            ).exclude(category__in=['FUEL', 'SPARE_PART'])
             .aggregate(t=Sum('amount'))['t'] or Decimal('0'))

            trip_count = Trip.objects.filter(
                truck=truck, loading_time__date__range=[date_from, date_to]
            ).count()

            net = rev - fuel - spare - other_exp

            rows.append([
                truck.truck_number,
                truck.model,
                trip_count,
                float(rev),
                float(fuel),
                float(spare),
                float(other_exp),
                float(net),
            ])

            grand_rev   += rev
            grand_fuel  += fuel
            grand_spare += spare
            grand_net   += (rev - fuel - spare - other_exp)

        headers = ['Truck #', 'Model', 'Trips', 'Revenue (GH₵)', 'Fuel Cost (GH₵)',
                   'Spare Parts (GH₵)', 'Other Exp (GH₵)', 'Net Profit (GH₵)']

        summary = {
            'Total Revenue (GH₵)':     float(grand_rev),
            'Total Fuel Cost (GH₵)':   float(grand_fuel),
            'Total Spare Parts (GH₵)': float(grand_spare),
            'Total Net Profit (GH₵)':  float(grand_net),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Truck-wise Summary  {date_from} → {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'truck_summary_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'truck_summary_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})


class TripDetailReportView(APIView):
    """Per-trip P&L: revenue, fuel cost, spare parts cost, net profit."""
    def get(self, request):
        from apps.trips.models import Trip
        date_from, date_to = _parse_date_range(request)
        truck_id = request.query_params.get('truck')

        trips_qs = (Trip.objects.select_related('truck', 'driver')
                    .filter(loading_time__date__range=[date_from, date_to])
                    .order_by('-loading_time'))
        if truck_id:
            trips_qs = trips_qs.filter(truck_id=truck_id)

        headers = ['Waybill', 'Date', 'Truck', 'Driver', 'Route',
                   'Loaded (t)', 'Delivered (t)', 'Revenue (GH₵)',
                   'Fuel Cost (GH₵)', 'Spare Parts (GH₵)', 'Net Profit (GH₵)', 'Status']
        rows = []
        total_rev = total_fuel = total_spare = total_net = Decimal('0')

        for t in trips_qs:
            net = t.net_profit
            rows.append([
                t.waybill_no,
                str(t.loading_time.date()),
                t.truck.truck_number,
                t.driver.name if hasattr(t.driver, 'name') else f"{t.driver.first_name} {t.driver.last_name}",
                f"{t.origin} → {t.destination}",
                float(t.loaded_qty),
                float(t.delivered_qty or 0),
                float(t.trip_revenue),
                float(t.fuel_cost),
                float(t.spare_parts_cost),
                float(net),
                t.status,
            ])
            total_rev   += t.trip_revenue
            total_fuel  += t.fuel_cost
            total_spare += t.spare_parts_cost
            total_net   += net

        summary = {
            'Total Revenue (GH₵)':     float(total_rev),
            'Total Fuel Cost (GH₵)':   float(total_fuel),
            'Total Spare Parts (GH₵)': float(total_spare),
            'Total Net Profit (GH₵)':  float(total_net),
        }

        fmt = request.query_params.get('export', 'json')
        report_title = f'Trip P&L Report  {date_from} → {date_to}'

        if fmt == 'excel':
            buf = build_excel(report_title, headers, rows, summary)
            resp = _excel_response(f'trip_pl_{date_from}_{date_to}.xlsx')
            resp.write(buf.read()); return resp
        if fmt == 'pdf':
            buf = build_pdf(report_title, headers, rows, summary)
            resp = _pdf_response(f'trip_pl_{date_from}_{date_to}.pdf')
            resp.write(buf.read()); return resp

        return Response({'headers': headers, 'rows': rows, 'summary': summary})

class CleanupOrphanedRevenueView(APIView):
    """DELETE /reports/cleanup-revenue/
    Removes Revenue rows whose trip was deleted (trip=NULL, source=TRIP_REVENUE)
    and Revenue rows whose invoice has no trip (invoice__trip=NULL, source=HAULAGE).
    Safe to call any time. Returns count of deleted records.
    """
    def delete(self, request):
        from apps.finance.models import Revenue
        deleted = 0
        # Orphaned trip revenue (trip deleted, revenue stayed)
        r1 = Revenue.objects.filter(source=Revenue.TRIP_REVENUE, trip__isnull=True).delete()
        deleted += r1[0]
        # Orphaned haulage revenue (invoice exists but its trip was deleted)
        r2 = Revenue.objects.filter(source=Revenue.HAULAGE, invoice__trip__isnull=True, invoice__isnull=False).delete()
        deleted += r2[0]
        return Response({'deleted': deleted, 'message': f'Removed {deleted} orphaned revenue record(s).'})
