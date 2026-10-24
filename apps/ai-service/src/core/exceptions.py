"""Domain and infrastructure exceptions for the AI Microservice."""


class AIProcessingError(Exception):
    """Base exception for all AI microservice operational errors."""


class PDFProcessingError(AIProcessingError):
    """Base exception for PDF parsing and extraction errors."""


class FileNotFoundPDFError(PDFProcessingError):
    """Raised when the specified PDF file does not exist on disk."""


class CorruptedPDFError(PDFProcessingError):
    """Raised when the PDF file format is corrupted, truncated, or invalid."""


class EncryptedPDFError(PDFProcessingError):
    """Raised when the PDF document is password-protected or encrypted."""


class EmptyPDFError(PDFProcessingError):
    """Raised when the PDF document contains 0 pages or contains no extractable content."""


class DocumentNotFoundError(AIProcessingError):
    """Raised when a requested document ID is not found in MongoDB."""


class PathTraversalSecurityError(AIProcessingError):
    """Raised when an untrusted storageUri attempts directory traversal."""
