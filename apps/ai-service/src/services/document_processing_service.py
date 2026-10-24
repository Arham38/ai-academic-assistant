"""Document processing orchestrator coordinating PDF extraction, text cleaning, and DB state."""

import logging
import os
from datetime import UTC, datetime

from bson import ObjectId, errors
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase

from src.core.config import settings
from src.core.exceptions import (
    DocumentNotFoundError,
    PathTraversalSecurityError,
)
from src.infrastructure.database.mongo_client import get_database
from src.pipelines.extraction.pdf_parser import extract_text_from_pdf
from src.pipelines.extraction.text_sanitizer import sanitize_text

logger = logging.getLogger(__name__)


def resolve_safe_filepath(storage_uri: str, upload_dir: str | None = None) -> str:
    """Validates and resolves a physical storage URI against the allowed upload directory.

    Args:
        storage_uri: File path or URI received from the API request.
        upload_dir: Optional override for the base upload directory.

    Returns:
        Absolute resolved path verified to reside inside the upload directory.

    Raises:
        PathTraversalSecurityError: If directory traversal or escape is detected.
    """
    if not storage_uri or not storage_uri.strip():
        raise PathTraversalSecurityError("storageUri cannot be empty.")

    normalized_uri = storage_uri.strip().replace("\\", "/")

    # Check for path traversal components
    parts = normalized_uri.split("/")
    if ".." in parts:
        raise PathTraversalSecurityError(
            f"Directory traversal detected in storageUri: {storage_uri}"
        )

    # Strip leading slash or upload directory prefixes
    clean_rel = normalized_uri.lstrip("/")
    if clean_rel.startswith("uploads/"):
        clean_rel = clean_rel[8:]

    base_dir = os.path.abspath(upload_dir or settings.UPLOAD_DIR)
    target_path = os.path.abspath(os.path.join(base_dir, clean_rel))

    try:
        common = os.path.commonpath([base_dir, target_path])
        if common != base_dir:
            raise PathTraversalSecurityError(
                f"Path traversal detected escaping upload directory: {storage_uri}"
            )
    except ValueError as val_err:
        raise PathTraversalSecurityError(
            f"Path traversal check failed: {val_err}"
        ) from val_err

    return target_path


class DocumentProcessingService:
    """Orchestrates asynchronous document extraction and synchronizes state with MongoDB."""

    def __init__(self, db: AsyncIOMotorDatabase | None = None):
        self._db = db

    def _get_db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_database()

    async def process_document(self, document_id: str, storage_uri: str) -> None:
        """Executes the extraction pipeline and synchronizes document status transitions.

        Lifecycle:
        1. Set status -> PARSING
        2. Validate path safety
        3. Offload PyMuPDF extraction to threadpool
        4. Sanitize text via regex pipeline
        5. Set status -> EMBEDDING, populate metadata (wordCount, pageCount)
        - On Error: Set status -> FAILED, populate errorMessage
        """
        # Validate ObjectId representation
        try:
            doc_oid = ObjectId(document_id)
        except (errors.InvalidId, TypeError) as id_err:
            logger.error(f"Invalid documentId format: {document_id}")
            raise DocumentNotFoundError(
                f"Invalid document ID format: {document_id}"
            ) from id_err

        db = self._get_db()

        # Step 1: Update status to PARSING
        update_result = await db.documents.update_one(
            {"_id": doc_oid},
            {
                "$set": {
                    "status": "PARSING",
                    "updatedAt": datetime.now(UTC),
                }
            },
        )

        if update_result.matched_count == 0:
            logger.error(f"Document record not found in MongoDB: {document_id}")
            raise DocumentNotFoundError(
                f"Document {document_id} not found in database."
            )

        logger.info(f"Document {document_id} transitioned to PARSING status.")

        try:
            # Step 2: Validate filepath against directory traversal
            physical_path = resolve_safe_filepath(storage_uri)

            # Step 3: Run CPU-bound PyMuPDF extraction in threadpool
            raw_text, page_count, _ = await run_in_threadpool(
                extract_text_from_pdf, physical_path
            )

            # Step 4: Sanitize extracted text
            cleaned_text = sanitize_text(raw_text)
            word_count = len(cleaned_text.split())

            # Step 5: Transition to EMBEDDING status with extracted metadata
            await db.documents.update_one(
                {"_id": doc_oid},
                {
                    "$set": {
                        "status": "EMBEDDING",
                        "metadata.wordCount": word_count,
                        "metadata.pageCount": page_count,
                        "updatedAt": datetime.now(UTC),
                    },
                    "$unset": {
                        "errorMessage": "",
                    },
                },
            )
            logger.info(
                f"Document {document_id} successfully parsed: {page_count} pages, {word_count} words. Transitioned to EMBEDDING."
            )

        except Exception as exc:
            logger.exception(
                f"Failed to process document {document_id}: {exc}. Transitioning status to FAILED."
            )
            await db.documents.update_one(
                {"_id": doc_oid},
                {
                    "$set": {
                        "status": "FAILED",
                        "errorMessage": str(exc),
                        "updatedAt": datetime.now(UTC),
                    }
                },
            )


document_processing_service = DocumentProcessingService()
