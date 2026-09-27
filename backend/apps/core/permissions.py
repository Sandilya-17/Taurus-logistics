"""apps/core/permissions.py – Module-level access control.

Enforces `User.module_permissions` (already collected and editable from the
Users → Permissions screen in the frontend) which, until now, was stored on
the user but never actually checked by any API view.

RULES
-----
SUPER_ADMIN / ADMIN  → always full access (matches the note already shown
                        in the Permissions UI: "Admins always have full
                        access. Permissions below apply to Manager and
                        Employee roles.").
MANAGER / EMPLOYEE    → if module_permissions is EMPTY/unset, access is
                        unrestricted (preserves current behaviour so this
                        does not silently lock out existing users the
                        moment it ships). Once an Admin ticks specific
                        modules for a user, that user is restricted to
                        exactly those modules.
Unmapped paths        → (auth, /users/me/, health, admin, suppliers,
                        locations, items — shared catalogues) are not
                        module-gated here; they keep whatever permission
                        classes they already have.

This is wired in globally via REST_FRAMEWORK.DEFAULT_PERMISSION_CLASSES in
config/settings.py, so it applies automatically to every view that doesn't
explicitly override `permission_classes`.
"""
from rest_framework.permissions import BasePermission

# Ordered by specificity; the longest matching prefix wins, so more specific
# sub-paths (e.g. /api/inventory/purchases) beat their parent (/api/inventory).
MODULE_PATH_MAP = [
    ('/api/inventory/purchases',               'purchase'),
    ('/api/inventory/issues',                  'issue'),
    ('/api/inventory/ledger',                  'stock'),
    ('/api/inventory/closing-stock',           'stock'),
    ('/api/inventory/available-stock',         'stock'),
    ('/api/inventory/fifo-breakdown',          'stock'),
    ('/api/inventory/opening-stock',           'stock'),
    ('/api/inventory/import-opening-stock',    'stock'),
    ('/api/inventory/zero-closing-stock',      'stock'),
    ('/api/inventory/undo-zero-closing-stock', 'stock'),
    ('/api/trucks',              'trucks'),
    ('/api/drivers',             'drivers'),
    ('/api/trips',               'trips'),
    ('/api/fuel',                'fuel'),
    ('/api/tyres',               'tyres'),
    ('/api/maintenance',         'maintenance'),
    ('/api/finance/expenditure', 'expenditure'),
    ('/api/finance/revenue',     'revenue'),
    ('/api/invoicing',           'invoicing'),
    ('/api/reports',             'reports'),
    ('/api/users',                'users'),
]


def _module_for_path(path):
    best = None
    for prefix, module in MODULE_PATH_MAP:
        if path.startswith(prefix) and (best is None or len(prefix) > len(best[0])):
            best = (prefix, module)
    return best[1] if best else None


class HasModulePermission(BasePermission):
    """Blocks MANAGER/EMPLOYEE users from modules not in their module_permissions."""

    message = 'You do not have permission to access this module. Contact your admin.'

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return True  # IsAuthenticated (also in DEFAULT_PERMISSION_CLASSES) handles this

        role = getattr(user, 'role', None)
        if role in ('SUPER_ADMIN', 'ADMIN'):
            return True

        module = _module_for_path(request.path)
        if module is None:
            return True  # endpoint isn't module-gated

        allowed = getattr(user, 'module_permissions', None) or []
        if not allowed:
            return True  # nothing configured yet → don't restrict (see module docstring)

        return module in allowed
