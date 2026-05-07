"""apps/invoicing/views.py"""
from io import BytesIO
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from .models import Invoice, InvoiceLine
from .serializers import InvoiceSerializer, InvoiceLineSerializer, InvoicePreviewSerializer


class InvoiceListCreate(generics.ListCreateAPIView):
    queryset         = Invoice.objects.prefetch_related('lines').select_related('trip')
    serializer_class = InvoiceSerializer
    filterset_fields = ('status', 'client_name')
    search_fields    = ('invoice_number', 'client_name')

    def get_serializer_context(self):
        return {'request': self.request}


class InvoiceDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Invoice.objects.all()
    serializer_class = InvoiceSerializer

    def get_serializer_context(self):
        return {'request': self.request}

    def update(self, request, *args, **kwargs):
        old_status = self.get_object().status          # status BEFORE update
        response   = super().update(request, *args, **kwargs)
        invoice    = self.get_object()                 # fresh from DB after save

        # Auto-create Revenue only on first transition to PAID
        if old_status != Invoice.PAID and invoice.status == Invoice.PAID:
            from apps.finance.models import Revenue
            from django.utils import timezone

            already_exists = Revenue.objects.filter(invoice=invoice).exists()
            if not already_exists:
                Revenue.objects.create(
                    invoice     = invoice,
                    trip        = invoice.trip,
                    source      = Revenue.HAULAGE,
                    description = f"Payment received – {invoice.invoice_number} ({invoice.client_name})",
                    amount      = invoice.total_amount,
                    date        = timezone.now().date(),
                    reference   = invoice.invoice_number,
                    created_by  = request.user,
                )

        return response


class InvoiceLineCreate(generics.CreateAPIView):
    queryset         = InvoiceLine.objects.all()
    serializer_class = InvoiceLineSerializer


class InvoicePreviewView(APIView):
    def post(self, request):
        s = InvoicePreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)


class InvoicePDFView(APIView):
    """Generate PDF invoice using ReportLab."""
    def get(self, request, pk):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import cm

            invoice = Invoice.objects.prefetch_related('lines').get(pk=pk)
            buffer  = BytesIO()
            doc     = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=2*cm, leftMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm)
            styles  = getSampleStyleSheet()
            story   = []

            # Header
            title_style = ParagraphStyle('title', parent=styles['Title'], fontSize=20, textColor=colors.HexColor('#006ba6'))
            story.append(Paragraph("TAURUS TRADE & LOGISTICS", title_style))
            story.append(Spacer(1, 0.3*cm))
            story.append(Paragraph(f"<b>INVOICE</b> {invoice.invoice_number}", styles['Heading2']))
            story.append(Spacer(1, 0.5*cm))

            # Invoice info table
            info_data = [
                ['Client:', invoice.client_name,    'Invoice Date:', str(invoice.invoice_date)],
                ['Phone:',  invoice.client_phone,   'Status:',       invoice.status],
                ['Trip:',   invoice.trip.waybill_no if invoice.trip else '—', 'Due Date:', str(invoice.due_date or '—')],
            ]
            info_tbl = Table(info_data, colWidths=[3*cm, 7*cm, 3.5*cm, 3.5*cm])
            info_tbl.setStyle(TableStyle([
                ('FONTNAME',  (0,0),(-1,-1), 'Helvetica'),
                ('FONTSIZE',  (0,0),(-1,-1), 9),
                ('FONTNAME',  (0,0),(0,-1),  'Helvetica-Bold'),
                ('FONTNAME',  (2,0),(2,-1),  'Helvetica-Bold'),
            ]))
            story.append(info_tbl)
            story.append(Spacer(1, 0.5*cm))

            # Line items
            line_header = ['#', 'Description', 'Qty', 'Unit Price (GH₵)', 'Total (GH₵)']
            line_data   = [line_header]
            for i, line in enumerate(invoice.lines.all(), 1):
                line_data.append([str(i), line.description, str(line.quantity), f"{line.unit_price:,.2f}", f"{line.line_total:,.2f}"])

            line_tbl = Table(line_data, colWidths=[1*cm, 9*cm, 2*cm, 3.5*cm, 3.5*cm])
            line_tbl.setStyle(TableStyle([
                ('BACKGROUND',  (0,0),(-1,0),  colors.HexColor('#006ba6')),
                ('TEXTCOLOR',   (0,0),(-1,0),  colors.white),
                ('FONTNAME',    (0,0),(-1,0),  'Helvetica-Bold'),
                ('FONTSIZE',    (0,0),(-1,-1), 9),
                ('ROWBACKGROUNDS', (0,1),(-1,-1), [colors.white, colors.HexColor('#f0f4f8')]),
                ('GRID',        (0,0),(-1,-1), 0.5, colors.HexColor('#e1e8f0')),
                ('ALIGN',       (2,0),(-1,-1), 'RIGHT'),
            ]))
            story.append(line_tbl)
            story.append(Spacer(1, 0.5*cm))

            # Totals
            totals_data = [
                ['Subtotal:', f"GH₵ {invoice.subtotal:,.2f}"],
                [f"VAT ({invoice.vat_percentage}%):", f"GH₵ {invoice.vat_amount:,.2f}"],
                ['TOTAL DUE:', f"GH₵ {invoice.total_amount:,.2f}"],
            ]
            totals_tbl = Table(totals_data, colWidths=[13*cm, 4*cm])
            totals_tbl.setStyle(TableStyle([
                ('FONTNAME',    (0,0),(-1,-1), 'Helvetica'),
                ('FONTSIZE',    (0,0),(-1,-1), 10),
                ('FONTNAME',    (0,2),(-1,2),  'Helvetica-Bold'),
                ('FONTSIZE',    (0,2),(-1,2),  12),
                ('TEXTCOLOR',   (0,2),(-1,2),  colors.HexColor('#006ba6')),
                ('ALIGN',       (1,0),(1,-1),  'RIGHT'),
                ('LINEABOVE',   (0,2),(-1,2),  1, colors.HexColor('#006ba6')),
            ]))
            story.append(totals_tbl)
            story.append(Spacer(1, cm))
            story.append(Paragraph("Thank you for your business. — Taurus Trade & Logistics", styles['Normal']))

            doc.build(story)
            buffer.seek(0)
            return HttpResponse(buffer.read(), content_type='application/pdf',
                                headers={'Content-Disposition': f'attachment; filename="{invoice.invoice_number}.pdf"'})
        except Invoice.DoesNotExist:
            return Response({'error': 'Invoice not found'}, status=404)
        except ImportError:
            return Response({'error': 'ReportLab not installed'}, status=500)