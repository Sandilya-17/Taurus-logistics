"""apps/tyres/views.py"""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Tyre, TyreAssignment, TyreSwap
from .serializers import TyreSerializer, TyreAssignmentSerializer, TyreSwapSerializer
from .services import TyreService


class TyreListCreate(generics.ListCreateAPIView):
    queryset         = Tyre.objects.all()
    serializer_class = TyreSerializer
    filterset_fields = ('status', 'brand')
    search_fields    = ('serial_number', 'brand', 'model', 'size')


class TyreDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Tyre.objects.all()
    serializer_class = TyreSerializer


class TyreAssignView(APIView):
    def post(self, request):
        try:
            a = TyreService.assign_tyre(
                tyre_id=request.data['tyre_id'],
                truck_id=request.data['truck_id'],
                position=request.data['position'],
                odometer=request.data['odometer'],
                user=request.user,
            )
            return Response(TyreAssignmentSerializer(a).data, status=201)
        except (ValueError, Exception) as e:
            return Response({'error': str(e)}, status=400)


class TyreRemoveView(APIView):
    def post(self, request, assignment_id):
        try:
            a = TyreService.remove_tyre(assignment_id, request.data['odometer_remove'], request.data.get('reason',''))
            return Response(TyreAssignmentSerializer(a).data)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class TyreSwapView(APIView):
    def post(self, request):
        try:
            swap = TyreService.swap_tyre(
                tyre_id=request.data['tyre_id'],
                from_truck_id=request.data['from_truck_id'],
                to_truck_id=request.data.get('to_truck_id'),
                from_pos=request.data['from_position'],
                to_pos=request.data.get('to_position',''),
                odometer=request.data['odometer'],
                swap_date=request.data['swap_date'],
                user=request.user,
                remarks=request.data.get('remarks',''),
            )
            return Response(TyreSwapSerializer(swap).data, status=201)
        except Exception as e:
            return Response({'error': str(e)}, status=400)


class AssignmentList(generics.ListAPIView):
    queryset         = TyreAssignment.objects.select_related('tyre','truck')
    serializer_class = TyreAssignmentSerializer
    filterset_fields = ('truck', 'tyre')


class SwapList(generics.ListAPIView):
    queryset         = TyreSwap.objects.select_related('tyre','from_truck','to_truck')
    serializer_class = TyreSwapSerializer
    filterset_fields = ('tyre', 'from_truck')
