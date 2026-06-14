"""apps/users/serializers.py – Branch-aware serializers."""
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User, Branch


class BranchSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Branch
        fields = ('id', 'name', 'code', 'address', 'phone', 'is_active', 'created_at')
        read_only_fields = ('created_at',)


class UserSerializer(serializers.ModelSerializer):
    full_name   = serializers.SerializerMethodField()
    branch_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ('id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
                  'role', 'branch', 'branch_name', 'module_permissions', 'is_active', 'created_at')
        read_only_fields = ('created_at',)

    def get_full_name(self, obj):   return obj.get_full_name()
    def get_branch_name(self, obj): return obj.branch.name if obj.branch else None


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ('email', 'first_name', 'last_name', 'phone', 'role',
                  'branch', 'module_permissions', 'is_active', 'password')

    def validate(self, data):
        request = self.context.get('request')
        role    = data.get('role', User.EMPLOYEE)
        branch  = data.get('branch')

        if request and request.user.is_authenticated:
            actor = request.user

            # ADMIN can only create MANAGER or EMPLOYEE — not another ADMIN / SUPER_ADMIN
            if actor.role == User.ADMIN:
                if role in (User.SUPER_ADMIN, User.ADMIN):
                    raise serializers.ValidationError('Admins can only create Managers or Employees.')
                # Admin can only create users in their own branch
                if branch and branch != actor.branch:
                    raise serializers.ValidationError('You can only create users in your own branch.')
                if not branch:
                    data['branch'] = actor.branch

        # SUPER_ADMIN users must NOT have a branch
        if role == User.SUPER_ADMIN and branch:
            raise serializers.ValidationError('Super Admin must not be assigned to a branch.')
        # Non-SUPER_ADMIN must have a branch
        if role != User.SUPER_ADMIN and not branch and not data.get('branch'):
            raise serializers.ValidationError('A branch must be assigned for this role.')

        return data

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
                  'branch', 'module_permissions', 'is_active', 'password')

    def validate(self, data):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            actor = request.user
            role   = data.get('role', self.instance.role if self.instance else User.EMPLOYEE)
            branch = data.get('branch', self.instance.branch if self.instance else None)

            if actor.role == User.ADMIN:
                # Admin cannot promote to ADMIN or SUPER_ADMIN
                if role in (User.SUPER_ADMIN, User.ADMIN):
                    raise serializers.ValidationError('Admins cannot assign Admin or Super Admin role.')
                # Admin cannot move user to a different branch
                if branch and branch != actor.branch:
                    raise serializers.ValidationError('You can only manage users in your own branch.')
        return data

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
