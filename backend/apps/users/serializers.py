"""apps/users/serializers.py – With UserUpdateSerializer for admin edits."""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
                  'role', 'module_permissions', 'is_active', 'created_at')
        read_only_fields = ('created_at',)

    def get_full_name(self, obj): return obj.get_full_name()


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'role',
                  'module_permissions', 'is_active', 'password')

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Used for admin PATCH/PUT – password is optional."""
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model  = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'role',
                  'module_permissions', 'is_active', 'password')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('Invalid email or password.')
        if not user.is_active:
            raise serializers.ValidationError('Account is inactive.')
        refresh = RefreshToken.for_user(user)
        return {
            'access':  str(refresh.access_token),
            'refresh': str(refresh),
            'user':    UserSerializer(user).data,
        }
