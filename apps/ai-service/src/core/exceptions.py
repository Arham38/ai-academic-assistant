"""Domain and infrastructure exceptions for the AI Microservice."""


class AIProcessingError(Exception):
    """Base exception for all AI microservice operational errors."""


class ExtractionError(AIProcessingError):
    """Base exception for document extraction and parsing failures."""


class UnsupportedMimeTypeError(AIProcessingError):
    """Raised when an incoming document MIME type is not supported by any registered parser."""


class PDFProcessingError(ExtractionError):
    """Base exception for PDF parsing and extraction errors."""


class FileNotFoundPDFError(PDFProcessingError):
    """Raised when the specified PDF file does not exist on disk."""


class CorruptedPDFError(PDFProcessingError):
    """Raised when the PDF file format is corrupted, truncated, or invalid."""


class EncryptedPDFError(PDFProcessingError):
    """Raised when the PDF document is password-protected or encrypted."""


class EmptyPDFError(PDFProcessingError):
    """Raised when the PDF document contains 0 pages or contains no extractable content."""


class DOCXProcessingError(ExtractionError):
    """Base exception for DOCX parsing and extraction errors."""


class FileNotFoundDOCXError(DOCXProcessingError):
    """Raised when the specified DOCX file does not exist on disk."""


class CorruptedDOCXError(DOCXProcessingError):
    """Raised when a DOCX file is corrupted, truncated, or not a valid OpenXML package."""


class TXTProcessingError(ExtractionError):
    """Base exception for TXT parsing and extraction errors."""


class FileNotFoundTXTError(TXTProcessingError):
    """Raised when the specified TXT file does not exist on disk."""


class EmptyDocumentError(ExtractionError):
    """Raised when an uploaded document contains no readable text."""


class DocumentNotFoundError(AIProcessingError):
    """Raised when a requested document ID is not found in MongoDB."""


class PathTraversalSecurityError(AIProcessingError):
    """Raised when an untrusted storageUri attempts directory traversal."""
