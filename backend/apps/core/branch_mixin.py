"""apps/core/branch_mixin.py – Reusable branch-scoping mixin for all views.

ACCESS RULES:
  SUPER_ADMIN  → sees ALL branches by default.
                 Pass ?branch_id=<id> to narrow to one branch.
                 Can create data in any branch by passing branch_id in body or params.

  ADMIN        → strictly scoped to their OWN assigned branch only.
                 Cannot view or write data from other branches.

  MANAGER /
  EMPLOYEE     → strictly scoped to their OWN assigned branch only.

The model MUST have a `branch` ForeignKey field.
Override `branch_field` if the FK name differs (default: 'branch').
"""


class BranchScopedQuerysetMixin:
    branch_field = 'branch'

    def get_queryset(self):
        qs   = super().get_queryset()
        user = self.request.user
        if not user.is_authenticated:
            return qs.none()

        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            # Super admin can see all branches, or filter to one via ?branch_id=
            branch_id = self.request.query_params.get('branch_id')
            if branch_id:
                try:
                    return qs.filter(**{self.branch_field: int(branch_id)})
                except (ValueError, TypeError):
                    pass
            return qs  # all branches

        # ADMIN, MANAGER, EMPLOYEE: strictly locked to their assigned branch
        if user.branch_id:
            return qs.filter(**{f'{self.branch_field}_id': user.branch_id})
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user

        if getattr(user, 'role', None) == 'SUPER_ADMIN':
            # Super admin: use branch_id from request body or query param
            branch_id = (
                self.request.data.get('branch_id')
                or self.request.query_params.get('branch_id')
                or user.branch_id
            )
            if branch_id:
                from apps.users.models import Branch
                try:
                    branch = Branch.objects.get(pk=int(branch_id))
                    serializer.save(branch=branch)
                    return
                except (Branch.DoesNotExist, ValueError, TypeError):
                    pass
            serializer.save()
            return

        # All other roles: always write to their OWN branch only
        if user.branch_id:
            serializer.save(branch=user.branch)
        else:
            serializer.save()
