"""Internal v1 routes re-exporting internal router for service-to-service communication."""

from src.api.routers.internal import (
    AnalyzePlagiarismRequest,
    FlaggedChunkSchema,
    MatchedSourceSchema,
    PlagiarismReportResponse,
    ProcessDocumentRequest,
    ProcessDocumentResponse,
    router,
    verify_internal_secret,
)

__all__ = [
    "AnalyzePlagiarismRequest",
    "FlaggedChunkSchema",
    "MatchedSourceSchema",
    "PlagiarismReportResponse",
    "ProcessDocumentRequest",
    "ProcessDocumentResponse",
    "router",
    "verify_internal_secret",
]
