"""apps/finance/views.py"""
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from .models import Expenditure, Revenue
from .serializers import ExpenditureSerializer, RevenueSerializer


class ExpenditureListCreate(generics.ListCreateAPIView):
    queryset         = Expenditure.objects.select_related('truck', 'vendor')
    serializer_class = ExpenditureSerializer
    filterset_fields = ('category', 'truck', 'date')
    search_fields    = ('description', 'reference', 'truck__truck_number')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ExpenditureDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Expenditure.objects.all()
    serializer_class = ExpenditureSerializer


class RevenueListCreate(generics.ListCreateAPIView):
    queryset         = Revenue.objects.select_related('invoice', 'trip')
    serializer_class = RevenueSerializer
    filterset_fields = ('source', 'date')
    search_fields    = ('description', 'reference')

    def perform_create(self, serializer):
        # Prevent manual entry for invoice-linked haulage — those are auto-created
        # when an invoice is marked PAID in invoicing/views.py
        if serializer.validated_data.get('invoice') or serializer.validated_data.get('trip'):
            raise ValidationError(
                "Revenue for haulage jobs is recorded automatically when an invoice is marked PAID. "
                "Use this form only for cash jobs, rental income, or other income without an invoice."
            )
        serializer.save(created_by=self.request.user)


class RevenueDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Revenue.objects.all()
    serializer_class = RevenueSerializer