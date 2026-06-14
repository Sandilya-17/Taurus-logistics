"""apps/core/branch_mixin.py – Reusable branch-scoping mixin for all views."""
from apps.users.models import User


class BranchScopedQuerysetMixin:
    """
    Mix into any ListAPIView / ModelViewSet to automatically filter
    the queryset by the logged-in user's branch.

    - SUPER_ADMIN: sees ALL records from all branches.
    - ADMIN / MANAGER / EMPLOYEE: only see records where branch == their branch.

    The model MUST have a `branch` ForeignKey field.
    Override `branch_field` if the FK name is different (default: 'branch').
    """
    branch_field = 'branch'

    def get_queryset(self):
        qs   = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.role == User.SUPER_ADMIN:
            return qs                          # Super Admin sees everything
        if user.branch_id:
            return qs.filter(**{self.branch_field: user.branch_id})
        return qs.none()

    def perform_create(self, serializer):
        """Auto-assign branch on create if the model has that field."""
        user = self.request.user
        if user.role != User.SUPER_ADMIN and user.branch_id:
            serializer.save(branch=user.branch)
        else:
            serializer.save()
