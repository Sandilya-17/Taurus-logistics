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


# ── Throttle ──────────────────────────────────────────────────────────────────

class LoginThrottle(AnonRateThrottle):
    rate  = '10/min'
    scope = 'auth'


# ── Permissions ───────────────────────────────────────────────────────────────

class IsSuperAdmin(permissions.BasePermission):
    """Only the Super Admin."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == User.SUPER_ADMIN)


class IsAdminOrAbove(permissions.BasePermission):
    """ADMIN or SUPER_ADMIN."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role in (User.ADMIN, User.SUPER_ADMIN))


class IsManagerOrAbove(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


# ── Branch queryset mixin ──────────────────────────────────────────────────────

class BranchScopedMixin:
    """
    Restrict queryset to the current user's branch.
    Super Admin sees everything.
    """
    def get_branch_queryset(self, qs):
        user = self.request.user
        if user.is_super_admin:
            return qs
        if user.branch_id:
            return qs.filter(branch=user.branch)
        return qs.none()


# ── Auth ──────────────────────────────────────────────────────────────────────

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


# ── Users ─────────────────────────────────────────────────────────────────────

class UserListCreateView(BranchScopedMixin, generics.ListCreateAPIView):
    """
    GET  – list users visible to the current user (branch-scoped for ADMIN).
    POST – create a user; ADMIN can only create in their branch with lower roles.
    """
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
    """ADMIN can manage users only in their own branch; SUPER_ADMIN can manage all."""

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
        # Admin cannot delete another Admin or Super Admin
        if request.user.role == User.ADMIN and instance.role in (User.ADMIN, User.SUPER_ADMIN):
            return Response(
                {'error': True, 'message': 'You do not have permission to delete this user.'},
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


# ── Branch management (Super Admin only) ──────────────────────────────────────

class BranchListCreateView(generics.ListCreateAPIView):
    queryset         = Branch.objects.all().order_by('name')
    serializer_class = BranchSerializer
    permission_classes = [IsSuperAdmin]


class BranchDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsSuperAdmin]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.users.filter(is_active=True).exists():
            return Response(
                {'error': True, 'message': 'Cannot delete a branch that has active users.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)
