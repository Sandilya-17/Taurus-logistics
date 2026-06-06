"""apps/users/views.py – Enterprise user management with throttled login."""
import logging
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer

logger = logging.getLogger('apps.users')


class LoginThrottle(AnonRateThrottle):
    """Dedicated throttle for the login endpoint: 10 attempts/minute per IP."""
    rate = '10/min'
    scope = 'auth'


class IsAdminUser(permissions.BasePermission):
    """Allow access only to users with role=ADMIN."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ADMIN)


class IsManagerOrAdmin(permissions.BasePermission):
    """Allow access to MANAGER or ADMIN roles."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_manager)


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes   = (LoginThrottle,)

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)

        # Log successful login
        user_data = s.validated_data.get('user', {})
        logger.info(
            'User login: %s from %s',
            user_data.get('email', '?'),
            self._get_ip(request)
        )
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


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.all().order_by('role', 'first_name')

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == 'POST' else UserSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminUser()]
        return [permissions.IsAuthenticated()]


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [IsAdminUser()]

    def partial_update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Prevent admin from deleting themselves."""
        instance = self.get_object()
        if instance == request.user:
            return Response(
                {'error': True, 'message': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        logger.warning(
            'User deleted: %s by admin=%s', instance.email, request.user.email
        )
        return super().destroy(request, *args, **kwargs)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        """Allow any authenticated user to update their own profile (not role/permissions)."""
        allowed_fields = {'first_name', 'last_name', 'phone'}
        data = {k: v for k, v in request.data.items() if k in allowed_fields}
        serializer = UserSerializer(request.user, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def put(self, request):
        """Allow changing own password."""
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
