"""apps/core/middleware.py – Audit log middleware."""
import json
import threading

_thread_local = threading.local()


def get_current_user():
    return getattr(_thread_local, 'user', None)


class AuditLogMiddleware:
    """Writes AuditLog for every mutating API request."""

    MUTATING_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        _thread_local.user = getattr(request, 'user', None)
        response = self.get_response(request)

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
                for key in ('password', 'token', 'refresh', 'access'):
                    if key in body:
                        body[key] = '***'

                AuditLog.objects.create(
                    user          = request.user,
                    action        = AuditLog.DELETE if request.method == 'DELETE' else AuditLog.UPDATE if request.method in ('PUT', 'PATCH') else AuditLog.CREATE,
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
    def _get_ip(request):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
