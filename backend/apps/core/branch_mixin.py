"""apps/core/branch_mixin.py – Reusable branch-scoping mixin for all views.

FIX: SUPER_ADMIN can now view/manage ALL branches, or filter to a specific
branch by passing ?branch_id=<id> as a query parameter.
Branch admins (ADMIN role) are strictly scoped to their own branch only.
"""


class BranchScopedQuerysetMixin:
    """
    - ADMIN / MANAGER / EMPLOYEE  → strictly scoped to their assigned branch.
    - SUPER_ADMIN                 → sees ALL branches by default.
                                    Pass ?branch_id=<id> to narrow to one branch.

    The model MUST have a `branch` ForeignKey field.
    Override `branch_field` if the FK name differs (default: 'branch').
    """
    branch_field = 'branch'

    def get_queryset(self):
        qs   = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()

        # SUPER_ADMIN: can see all, optionally filtered by branch_id param
        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                return qs.filter(**{self.branch_field: branch_id})
            return qs  # all branches

        # All other roles: scoped to their own branch
        if user.branch_id:
            return qs.filter(**{self.branch_field: user.branch_id})
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user

        # SUPER_ADMIN: use branch_id from request body if provided, else their own branch
        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            branch_id = (
                self.request.data.get('branch_id')
                or self.request.query_params.get('branch_id')
                or user.branch_id
            )
            if branch_id:
                from apps.users.models import Branch
                try:
                    branch = Branch.objects.get(pk=branch_id)
                    serializer.save(branch=branch)
                    return
                except Branch.DoesNotExist:
                    pass
            serializer.save()
            return

        # All other roles: always write to their own branch
        if user.branch_id:
            serializer.save(branch=user.branch)
        else:
            serializer.save()
