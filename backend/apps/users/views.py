"""apps/users/views.py – Branch-isolated, role-based user management."""
import logging
from rest_framework import generics, status, permissions, filters
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, Branch
from .serializers import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    LoginSerializer, BranchSerializer,
)

logger = logging.getLogger('apps.users')


class LoginThrottle(AnonRateThrottle):
    rate  = '10/min'
    scope = 'auth'


class IsSuperAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == User.SUPER_ADMIN)


class IsAdminOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in (User.ADMIN, User.SUPER_ADMIN))


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


class BranchScopedMixin:
    """
    SUPER_ADMIN sees ALL branches (optionally filtered by ?branch_id=).
    All other roles see only their assigned branch.
    """
    def get_branch_queryset(self, qs):
        user = self.request.user
        if getattr(user, 'role', None) == User.SUPER_ADMIN:
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                return qs.filter(branch_id=branch_id)
            return qs  # all branches
        if user.branch_id:
            return qs.filter(branch=user.branch)
        return qs.none()


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes   = (LoginThrottle,)

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        user_data = s.validated_data.get('user', {})
        logger.info('User login: %s from %s', user_data.get('email', '?'), self._get_ip(request))
        return Response(s.validated_data)

    @staticmethod
    def _get_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
            logger.info('User logout: %s', getattr(request.user, 'email', '?'))
        except Exception:
            pass
        return Response({'detail': 'Logged out.'})


class UserListCreateView(BranchScopedMixin, generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields   = ['email', 'first_name', 'last_name']
    ordering_fields = ['role', 'first_name', 'created_at']

    def get_queryset(self):
        qs = User.objects.all().order_by('role', 'first_name')
        return self.get_branch_queryset(qs)

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrAbove()]
        return [permissions.IsAuthenticated()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


class UserDetailView(BranchScopedMixin, generics.RetrieveUpdateDestroyAPIView):
    def get_queryset(self):
        qs = User.objects.all()
        return self.get_branch_queryset(qs)

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminOrAbove()]

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {'error': True, 'message': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if request.user.role == User.ADMIN and instance.role in (User.ADMIN, User.SUPER_ADMIN):
            return Response(
                {'error': True, 'message': 'You do not have permission to delete this user.'},
                status=status.HTTP_403_FORBIDDEN
            )
        if request.user.role != User.SUPER_ADMIN and instance.branch != request.user.branch:
            return Response(
                {'error': True, 'message': 'You can only manage users in your own branch.'},
                status=status.HTTP_403_FORBIDDEN
            )
        logger.warning('User deleted: %s by %s', instance.email, request.user.email)
        return super().destroy(request, *args, **kwargs)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        allowed_fields = {'first_name', 'last_name', 'phone'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UserSerializer(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        old_password = request.data.get('old_password', '')
        new_password = request.data.get('new_password', '')
        if not old_password or not new_password:
            return Response(
                {'error': True, 'message': 'old_password and new_password are required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not request.user.check_password(old_password):
            return Response(
                {'error': True, 'message': 'Current password is incorrect.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {'error': True, 'message': 'New password must be at least 8 characters.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        request.user.set_password(new_password)
        request.user.save(update_fields=['password'])
        logger.info('Password changed for user: %s', request.user.email)
        return Response({'detail': 'Password updated successfully.'})


class BranchListCreateView(generics.ListCreateAPIView):
    serializer_class = BranchSerializer

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == User.SUPER_ADMIN:
            return Branch.objects.all().order_by('name')
        if user.branch_id:
            return Branch.objects.filter(id=user.branch_id)
        return Branch.objects.none()

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsSuperAdmin()]
        return [IsAdminOrAbove()]


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = BranchSerializer
    permission_classes = [IsSuperAdmin]

    def get_queryset(self):
        user = self.request.user
        if getattr(user, 'role', None) == User.SUPER_ADMIN:
            return Branch.objects.all()
        if user.branch_id:
            return Branch.objects.filter(id=user.branch_id)
        return Branch.objects.none()

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.users.filter(is_active=True).exists():
            return Response(
                {'error': True, 'message': 'Cannot delete a branch that has active users.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
