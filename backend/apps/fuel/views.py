"""apps/fuel/views.py"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import FuelLimit, FuelLog
from .serializers import FuelLimitSerializer, FuelLogSerializer, FuelPreviewSerializer


class FuelLimitListCreate(generics.ListCreateAPIView):
    queryset         = FuelLimit.objects.select_related('truck')
    serializer_class = FuelLimitSerializer


class FuelLimitDetail(generics.RetrieveUpdateAPIView):
    queryset         = FuelLimit.objects.all()
    serializer_class = FuelLimitSerializer


class FuelLogListCreate(generics.ListCreateAPIView):
    queryset         = FuelLog.objects.select_related('truck', 'trip')
    serializer_class = FuelLogSerializer
    filterset_fields = ('truck', 'date')
    search_fields    = ('truck__truck_number',)

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class FuelLogDetail(generics.RetrieveAPIView):
    queryset         = FuelLog.objects.all()
    serializer_class = FuelLogSerializer


class FuelPreviewView(APIView):
    def post(self, request):
        s = FuelPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
