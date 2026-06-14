"""apps/trucks/views.py"""
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from apps.core.branch_mixin import BranchScopedQuerysetMixin
from .models import Truck, TruckDocument
from .serializers import TruckSerializer, TruckDocumentSerializer


class TruckListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = Truck.objects.prefetch_related('documents')
    serializer_class = TruckSerializer
    filterset_fields = ('status',)
    search_fields    = ('truck_number', 'model', 'make')


class TruckDetail(BranchScopedQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset         = Truck.objects.all()
    serializer_class = TruckSerializer


class TruckAlerts(APIView):
    def get(self, request):
        qs = Truck.objects.filter(status=Truck.ACTIVE)
        if request.user.branch_id:
            qs = qs.filter(branch=request.user.branch_id)
        else:
            qs = qs.none()
        all_alerts = []
        for t in qs:
            for a in t.expiry_alerts():
                a['truck_number'] = t.truck_number
                a['truck_id']     = t.pk
                all_alerts.append(a)
        return Response(all_alerts)


class TruckDocumentUpload(APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        truck_id = request.query_params.get('truck')
        qs = TruckDocument.objects.all()
        if truck_id:
            qs = qs.filter(truck_id=truck_id)
        serializer = TruckDocumentSerializer(qs, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TruckDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        doc_id = request.query_params.get('id')
        if not doc_id:
            return Response({'error': 'id required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            doc = TruckDocument.objects.get(pk=doc_id)
            doc.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except TruckDocument.DoesNotExist:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
