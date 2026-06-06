"""apps/core/middleware.py – Audit log middleware + security logging."""
import json
import logging
import threading

_thread_local = threading.local()
logger = logging.getLogger('apps.core')
security_logger = logging.getLogger('django.security')


def get_current_user():
    return getattr(_thread_local, 'user', None)


class AuditLogMiddleware:
    """
    Writes AuditLog for every mutating API request.
    Also logs suspicious activity (repeated 401s, 403s) to the security logger.
    """

    MUTATING_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}
    SENSITIVE_FIELDS = {'password', 'token', 'refresh', 'access', 'secret', 'pin'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_local.user = getattr(request, 'user', None)
        response = self.get_response(request)

        # ── Security: log suspicious responses ────────────────────────────
        if response.status_code == 401 and request.path.startswith('/api/'):
            security_logger.warning(
                'Unauthorized API access attempt: %s %s from %s',
                request.method, request.path, self._get_ip(request)
            )
        elif response.status_code == 403 and request.path.startswith('/api/'):
            security_logger.warning(
                'Forbidden API access: %s %s by user=%s from %s',
                request.method, request.path,
                getattr(getattr(request, 'user', None), 'email', 'anon'),
                self._get_ip(request)
            )

        # ── Audit log: mutating authenticated API calls ────────────────────
        if (request.method in self.MUTATING_METHODS
                and request.path.startswith('/api/')
                and hasattr(request, 'user')
                and request.user.is_authenticated):
            try:
                from apps.core.models import AuditLog
                body = {}
                if request.content_type and 'json' in request.content_type:
                    try:
                        body = json.loads(request.body)
                    except Exception:
                        pass
                # Mask sensitive fields
                body = {
                    k: ('***' if k.lower() in self.SENSITIVE_FIELDS else v)
                    for k, v in (body.items() if isinstance(body, dict) else {}.items())
                }

                AuditLog.objects.create(
                    user          = request.user,
                    action        = self._map_action(request.method),
                    model_name    = request.path.split('/')[3] if len(request.path.split('/')) > 3 else '',
                    endpoint      = request.path,
                    http_method   = request.method,
                    response_code = response.status_code,
                    changes       = body,
                    ip_address    = self._get_ip(request),
                    user_agent    = request.META.get('HTTP_USER_AGENT', '')[:512],
                )
            except Exception:
                pass  # Never break requests due to audit failure

        return response

    @staticmethod
    def _map_action(method):
        from apps.core.models import AuditLog
        return {
            'DELETE': AuditLog.DELETE,
            'PUT':    AuditLog.UPDATE,
            'PATCH':  AuditLog.UPDATE,
        }.get(method, AuditLog.CREATE)

    @staticmethod
    def _get_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
