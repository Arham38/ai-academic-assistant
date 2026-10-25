"""Document processing orchestrator coordinating polymorphic extraction, text cleaning, and DB state."""

import logging
import os
from datetime import UTC, datetime
from typing import Any

from bson import ObjectId, errors
from fastapi.concurrency import run_in_threadpool
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ReturnDocument

from src.core.config import settings
from src.core.exceptions import (
    DocumentNotFoundError,
    PathTraversalSecurityError,
    UnsupportedMimeTypeError,
)
from src.infrastructure.database.mongo_client import get_database
from src.pipelines.extraction.docx_parser import DocxParser
from src.pipelines.extraction.parser_interface import BaseParser
from src.pipelines.extraction.pdf_parser import PDFParser
from src.pipelines.extraction.txt_parser import TxtParser
from src.pipelines.nlp import (
    MetadataExtractor,
    RecursiveTokenChunker,
    TextCleaner,
)
from src.pipelines.nlp import (
    chunker as default_chunker,
)

logger = logging.getLogger(__name__)

# Registry mapping document MIME types to their extraction strategy parser classes
PARSER_REGISTRY: dict[str, type[BaseParser]] = {
    "application/pdf": PDFParser,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": DocxParser,
    "text/plain": TxtParser,
}


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
    """Orchestrates polymorphic document extraction and synchronizes state with MongoDB."""

    def __init__(
        self,
        db: AsyncIOMotorDatabase | None = None,
        parser_registry: dict[str, type[BaseParser]] | None = None,
        cleaner: TextCleaner | None = None,
        metadata_extractor: MetadataExtractor | None = None,
        chunker: RecursiveTokenChunker | None = None,
    ):
        self._db = db
        self._parser_registry = (
            parser_registry if parser_registry is not None else PARSER_REGISTRY
        )
        self._cleaner = cleaner
        self._metadata_extractor = metadata_extractor
        self._chunker = chunker

    def _get_db(self) -> AsyncIOMotorDatabase:
        if self._db is not None:
            return self._db
        return get_database()

    async def process_document(
        self, document_id: str, storage_uri: str, version_id: str | None = None
    ) -> None:
        """Executes polymorphic extraction based on MIME type and synchronizes DB state.

        Lifecycle:
        1. Set status -> PARSING and retrieve MIME type (supporting version isolation)
        2. Validate path safety
        3. Resolve appropriate BaseParser strategy via PARSER_REGISTRY
        4. Offload CPU-bound parsing to threadpool
        5. Sanitize text via multi-stage NLP cleaner
        6. Extract semantic document metadata (title, authors, abstract, keywords)
        7. Chunk sanitized text into token-bounded semantic windows
        8. Set status -> EMBEDDING, populate metadata (wordCount, chunkCount, pageCount, abstract, etc.)
           utilizing positional operator ($) for specific version isolation.
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

        # Step 1: Update status to PARSING and retrieve stored document metadata
        filter_query: dict[str, Any] = {"_id": doc_oid}
        set_initial: dict[str, Any] = {
            "status": "PARSING",
            "updatedAt": datetime.now(UTC),
        }
        if version_id:
            filter_query["versions.versionId"] = version_id
            set_initial["versions.$.status"] = "PARSING"

        doc_record = await db.documents.find_one_and_update(
            filter_query,
            {"$set": set_initial},
            return_document=ReturnDocument.AFTER,
        )

        if not doc_record and version_id:
            # Fallback to general document lookup if version match didn't find record
            doc_record = await db.documents.find_one_and_update(
                {"_id": doc_oid},
                {
                    "$set": {
                        "status": "PARSING",
                        "updatedAt": datetime.now(UTC),
                    }
                },
                return_document=ReturnDocument.AFTER,
            )

        if not doc_record:
            logger.error(f"Document record not found in MongoDB: {document_id}")
            raise DocumentNotFoundError(
                f"Document {document_id} not found in database."
            )

        logger.info(f"Document {document_id} transitioned to PARSING status.")

        try:
            # Step 2: Validate filepath against directory traversal
            physical_path = resolve_safe_filepath(storage_uri)

            # Step 3: Determine parser strategy from document or version MIME type
            raw_mime = ""
            if version_id and "versions" in doc_record:
                for v in doc_record.get("versions", []):
                    if isinstance(v, dict) and v.get("versionId") == version_id:
                        raw_mime = v.get("mimeType", "")
                        break
            if not raw_mime:
                raw_mime = doc_record.get("mimeType", "")

            mime_type = raw_mime.split(";")[0].strip() if raw_mime else ""
            if not mime_type or mime_type not in self._parser_registry:
                raise UnsupportedMimeTypeError(
                    f"Unsupported document MIME type: '{raw_mime}'. Supported formats: {list(self._parser_registry.keys())}"
                )

            parser_cls = self._parser_registry[mime_type]
            parser = parser_cls()

            # Step 4: Run CPU-bound extraction in threadpool
            raw_text, page_count, _ = await run_in_threadpool(
                parser.extract, physical_path
            )

            # Step 5: Sanitize extracted text via multi-stage NLP pipeline
            if self._cleaner is not None:
                cleaned_text = self._cleaner.clean(raw_text)
            else:
                cleaner = TextCleaner(enable_dehyphenation=(mime_type != "text/plain"))
                cleaned_text = cleaner.clean(raw_text)

            word_count = len(cleaned_text.split())

            # Step 6: Extract semantic document metadata (title, authors, abstract, keywords)
            extractor = self._metadata_extractor or MetadataExtractor()
            extracted_metadata = extractor.extract(cleaned_text)

            # Step 7: Chunk cleaned text respecting token boundaries
            chunk_service = self._chunker or default_chunker
            chunks = await run_in_threadpool(chunk_service.split, cleaned_text)
            chunk_count = len(chunks)

            # Step 8: Transition to EMBEDDING status with extracted metadata
            set_fields: dict[str, Any] = {
                "status": "EMBEDDING",
                "metadata.wordCount": word_count,
                "metadata.chunkCount": chunk_count,
                "metadata.abstract": extracted_metadata.get("abstract"),
                "metadata.keywords": extracted_metadata.get("keywords"),
                "updatedAt": datetime.now(UTC),
            }
            if extracted_metadata.get("title_extracted"):
                set_fields["metadata.title_extracted"] = extracted_metadata[
                    "title_extracted"
                ]
            if extracted_metadata.get("authors") is not None:
                set_fields["metadata.authors"] = extracted_metadata["authors"]

            unset_fields: dict[str, Any] = {
                "errorMessage": "",
            }

            if page_count is not None and page_count >= 0:
                set_fields["metadata.pageCount"] = page_count
            else:
                # Dynamic flow format (DOCX, TXT) without fixed page structure
                unset_fields["metadata.pageCount"] = ""

            version_meta: dict[str, Any] = {
                "wordCount": word_count,
                "chunkCount": chunk_count,
                "abstract": extracted_metadata.get("abstract"),
                "keywords": extracted_metadata.get("keywords"),
                "language": doc_record.get("metadata", {}).get("language", "en"),
            }
            if extracted_metadata.get("title_extracted"):
                version_meta["title_extracted"] = extracted_metadata["title_extracted"]
            if extracted_metadata.get("authors") is not None:
                version_meta["authors"] = extracted_metadata["authors"]
            if page_count is not None and page_count >= 0:
                version_meta["pageCount"] = page_count

            update_filter: dict[str, Any] = {"_id": doc_oid}
            if version_id:
                update_filter["versions.versionId"] = version_id
                set_fields["versions.$.status"] = "EMBEDDING"
                set_fields["versions.$.metadata"] = version_meta

            await db.documents.update_one(
                update_filter,
                {
                    "$set": set_fields,
                    "$unset": unset_fields,
                },
            )
            logger.info(
                f"Document {document_id} successfully parsed: {page_count if page_count is not None else 'N/A'} pages, "
                f"{word_count} words, {chunk_count} chunks. Transitioned to EMBEDDING."
            )

        except Exception as exc:
            logger.exception(
                f"Failed to process document {document_id}: {exc}. Transitioning status to FAILED."
            )
            err_set: dict[str, Any] = {
                "status": "FAILED",
                "errorMessage": str(exc),
                "updatedAt": datetime.now(UTC),
            }
            err_query: dict[str, Any] = {"_id": doc_oid}
            if version_id:
                err_query["versions.versionId"] = version_id
                err_set["versions.$.status"] = "FAILED"
                err_set["versions.$.errorMessage"] = str(exc)

            await db.documents.update_one(
                err_query,
                {
                    "$set": err_set,
                },
            )


document_processing_service = DocumentProcessingService()
