"""apps/core/exceptions.py – Consistent enterprise API error responses."""
import logging
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger('apps.core')


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to return a consistent error envelope:
    {
        "error": true,
        "code": "validation_error" | "authentication_failed" | ...,
        "message": "Human-readable summary",
        "detail": <original DRF detail>
    }
    """
    response = exception_handler(exc, context)

    if response is not None:
        error_code = _map_code(response.status_code, exc)
        message = _flatten_message(response.data)

        # Log 5xx server errors
        if response.status_code >= 500:
            view = context.get('view')
            logger.error(
                'Server error %s at %s: %s',
                response.status_code,
                getattr(view, '__class__', {__name__: '?'}).__name__,
                exc,
                exc_info=True,
            )

        response.data = {
            'error':   True,
            'code':    error_code,
            'message': message,
            'detail':  response.data,
        }

    return response


def _map_code(http_status, exc):
    mapping = {
        400: 'validation_error',
        401: 'authentication_required',
        403: 'permission_denied',
        404: 'not_found',
        405: 'method_not_allowed',
        429: 'rate_limit_exceeded',
        500: 'server_error',
    }
    return mapping.get(http_status, f'http_{http_status}')


def _flatten_message(data):
    """Convert DRF's nested error dict/list to a single readable string."""
    if isinstance(data, dict):
        for key in ('detail', 'non_field_errors', '__all__'):
            if key in data:
                val = data[key]
                if isinstance(val, list):
                    return str(val[0]) if val else 'An error occurred.'
                return str(val)
        # Return first field error
        for key, val in data.items():
            if isinstance(val, list) and val:
                return f"{key}: {val[0]}"
            return f"{key}: {val}"
    if isinstance(data, list) and data:
        return str(data[0])
    return str(data)
