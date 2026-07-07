from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Default page size stays 25 (safe for normal UI lists), but honours
    ?page_size=<n> from the client — up to max_page_size — so pages like
    Stock Ledger can request the full dataset (e.g. ?page_size=2000) to
    compute Opening/Purchased/Issued breakdowns locally without silently
    being truncated back to 25 records.
    """
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 5000
