"""apps/core/branch_mixin.py – Reusable branch-scoping mixin for all views."""


class BranchScopedQuerysetMixin:
    """
    ALL roles (including SUPER_ADMIN) are scoped to their assigned branch.
    SUPER_ADMIN has full read/write/delete within their branch only.

    The model MUST have a `branch` ForeignKey field.
    Override `branch_field` if the FK name differs (default: 'branch').
    """
    branch_field = 'branch'

    def get_queryset(self):
        qs   = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()
        if user.branch_id:
            return qs.filter(**{self.branch_field: user.branch_id})
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch_id:
            serializer.save(branch=user.branch)
        else:
            serializer.save()
