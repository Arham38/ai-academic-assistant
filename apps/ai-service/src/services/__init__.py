"""Domain services orchestrating document ingestion and analytical pipelines."""

from src.services.document_processing_service import (
    DocumentProcessingService,
    document_processing_service,
)
from src.services.plagiarism_detector_service import (
    FlaggedChunk,
    MatchedSource,
    PlagiarismDetectorService,
    PlagiarismReport,
    plagiarism_detector_service,
)

__all__ = [
    "DocumentProcessingService",
    "FlaggedChunk",
    "MatchedSource",
    "PlagiarismDetectorService",
    "PlagiarismReport",
    "document_processing_service",
    "plagiarism_detector_service",
]
