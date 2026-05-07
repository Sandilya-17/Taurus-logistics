"""apps/users/views.py – Enhanced user management with admin-only CRUD and permission control."""
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User
from .serializers import UserSerializer, UserCreateSerializer, UserUpdateSerializer, LoginSerializer


class IsAdminUser(permissions.BasePermission):
    """Allow access only to users with role=ADMIN."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == User.ADMIN)


class LoginView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        s = LoginSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        return Response(s.validated_data)


class LogoutView(APIView):
    def post(self, request):
        try:
            token = RefreshToken(request.data['refresh'])
            token.blacklist()
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
