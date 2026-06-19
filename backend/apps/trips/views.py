"""apps/trips/views.py – Trip API views."""
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.core.branch_mixin import BranchScopedQuerysetMixin
from .models import Trip
from .serializers import TripSerializer, TripPreviewSerializer


class TripListCreate(BranchScopedQuerysetMixin, generics.ListCreateAPIView):
    queryset         = Trip.objects.select_related('truck', 'driver', 'branch')
    serializer_class = TripSerializer
    filterset_fields = ('status', 'truck', 'driver')
    search_fields    = ('waybill_no', 'origin', 'destination', 'material_type')

    def perform_create(self, serializer):
        from apps.users.models import Branch
        user   = self.request.user
        kwargs = {}

        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            branch_id = (
                self.request.data.get('branch_id')
                or self.request.query_params.get('branch_id')
                or user.branch_id
            )
            if branch_id:
                try:
                    kwargs['branch'] = Branch.objects.get(pk=int(branch_id))
                except (Branch.DoesNotExist, ValueError, TypeError):
                    pass
        elif user.branch_id:
            kwargs['branch'] = user.branch

        if hasattr(user, 'pk') and user.is_authenticated:
            kwargs['created_by'] = user

        serializer.save(**kwargs)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TripDetail(BranchScopedQuerysetMixin, generics.RetrieveUpdateDestroyAPIView):
    queryset         = Trip.objects.select_related('truck', 'driver', 'branch')
    serializer_class = TripSerializer

    def update(self, request, *args, **kwargs):
        try:
            return super().update(request, *args, **kwargs)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)


class TripPreviewView(APIView):
    """Live calculation preview for the frontend (no DB write)."""
    def post(self, request):
        s = TripPreviewSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)
