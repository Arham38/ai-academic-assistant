"""Unit tests for DocumentProcessingService orchestrator and path traversal defenses."""

import os
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

import pymupdf
import pytest
from bson import ObjectId
from src.core.exceptions import (
    DocumentNotFoundError,
    PathTraversalSecurityError,
)
from src.services.document_processing_service import (
    DocumentProcessingService,
    resolve_safe_filepath,
)


def test_resolve_safe_filepath_valid():
    """Verify safe path resolution strips prefixes and returns target inside upload dir."""
    upload_dir = os.path.abspath("test_uploads")
    resolved = resolve_safe_filepath("/uploads/my-paper.pdf", upload_dir=upload_dir)
    assert resolved == os.path.join(upload_dir, "my-paper.pdf")

    resolved_bare = resolve_safe_filepath("my-paper.pdf", upload_dir=upload_dir)
    assert resolved_bare == os.path.join(upload_dir, "my-paper.pdf")


def test_resolve_safe_filepath_traversal_attempts():
    """Verify various path traversal attempts are detected and rejected."""
    upload_dir = os.path.abspath("test_uploads")

    with pytest.raises(PathTraversalSecurityError):
        resolve_safe_filepath("../../etc/passwd", upload_dir=upload_dir)

    with pytest.raises(PathTraversalSecurityError):
        resolve_safe_filepath("uploads/../../secret.txt", upload_dir=upload_dir)

    with pytest.raises(PathTraversalSecurityError):
        resolve_safe_filepath("", upload_dir=upload_dir)


@pytest.mark.asyncio
async def test_process_document_invalid_object_id():
    """Verify invalid document ID raises DocumentNotFoundError."""
    service = DocumentProcessingService(db=MagicMock())
    with pytest.raises(DocumentNotFoundError):
        await service.process_document("invalid-id-format", "uploads/test.pdf")


@pytest.mark.asyncio
async def test_process_document_not_found_in_db():
    """Verify DocumentNotFoundError is raised when record does not exist in DB."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    # update_one returns matched_count = 0
    mock_result = MagicMock()
    mock_result.matched_count = 0
    mock_collection.update_one = AsyncMock(return_value=mock_result)

    service = DocumentProcessingService(db=mock_db)
    valid_id = str(ObjectId())

    with pytest.raises(DocumentNotFoundError):
        await service.process_document(valid_id, "uploads/test.pdf")


@pytest.mark.asyncio
async def test_process_document_success():
    """Verify happy path updates status from PENDING to PARSING and finally to EMBEDDING."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    mock_result = MagicMock()
    mock_result.matched_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)

    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create a real small PDF
        pdf_path = os.path.join(tmp_dir, "academic_test.pdf")
        doc = pymupdf.open()
        page = doc.new_page()
        page.insert_text(
            (50, 100), "This is an academic research document on RAG.", fontsize=11
        )
        doc.save(pdf_path)
        doc.close()

        service = DocumentProcessingService(db=mock_db)
        doc_id = str(ObjectId())

        with patch(
            "src.services.document_processing_service.settings"
        ) as mock_settings:
            mock_settings.UPLOAD_DIR = tmp_dir
            await service.process_document(doc_id, "/uploads/academic_test.pdf")

    # Verify updates were called
    assert mock_collection.update_one.call_count == 2

    # First update: PARSING
    first_call_args = mock_collection.update_one.call_args_list[0]
    assert first_call_args[0][0] == {"_id": ObjectId(doc_id)}
    assert first_call_args[0][1]["$set"]["status"] == "PARSING"

    # Second update: EMBEDDING with metadata
    second_call_args = mock_collection.update_one.call_args_list[1]
    assert second_call_args[0][0] == {"_id": ObjectId(doc_id)}
    assert second_call_args[0][1]["$set"]["status"] == "EMBEDDING"
    assert second_call_args[0][1]["$set"]["metadata.pageCount"] == 1
    assert second_call_args[0][1]["$set"]["metadata.wordCount"] > 0


@pytest.mark.asyncio
async def test_process_document_failure_transitions_to_failed():
    """Verify extraction failure transitions document status to FAILED with errorMessage."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    mock_result = MagicMock()
    mock_result.matched_count = 1
    mock_collection.update_one = AsyncMock(return_value=mock_result)

    service = DocumentProcessingService(db=mock_db)
    doc_id = str(ObjectId())

    # Point to a non-existent file to simulate failure
    with patch("src.services.document_processing_service.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = "/fake/uploads"
        await service.process_document(doc_id, "/uploads/non_existent.pdf")

    # Verify status was updated to PARSING then FAILED
    assert mock_collection.update_one.call_count == 2

    second_call_args = mock_collection.update_one.call_args_list[1]
    assert second_call_args[0][1]["$set"]["status"] == "FAILED"
    assert "errorMessage" in second_call_args[0][1]["$set"]
    assert "not found" in second_call_args[0][1]["$set"]["errorMessage"].lower()
