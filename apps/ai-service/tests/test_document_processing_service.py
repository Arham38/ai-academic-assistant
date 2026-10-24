"""Unit tests for DocumentProcessingService orchestrator, polymorphic routing, and defenses."""

import os
import tempfile
from unittest.mock import AsyncMock, MagicMock, patch

import docx
import pymupdf
import pytest
from bson import ObjectId
from src.core.exceptions import (
    DocumentNotFoundError,
    PathTraversalSecurityError,
)
from src.services.document_processing_service import (
    PARSER_REGISTRY,
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

    mock_collection.find_one_and_update = AsyncMock(return_value=None)

    service = DocumentProcessingService(db=mock_db)
    valid_id = str(ObjectId())

    with pytest.raises(DocumentNotFoundError):
        await service.process_document(valid_id, "uploads/test.pdf")


@pytest.mark.asyncio
async def test_process_pdf_document_success():
    """Verify PDF processing routes to PDFParser, populating pageCount and wordCount."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "application/pdf",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

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

        with patch(
            "src.services.document_processing_service.settings"
        ) as mock_settings:
            mock_settings.UPLOAD_DIR = tmp_dir
            await service.process_document(doc_id, "/uploads/academic_test.pdf")

    # Verify find_one_and_update was called to set PARSING
    mock_collection.find_one_and_update.assert_awaited_once()

    # Verify update_one was called to set EMBEDDING with metadata
    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[0] == {"_id": ObjectId(doc_id)}
    assert call_args[1]["$set"]["status"] == "EMBEDDING"
    assert call_args[1]["$set"]["metadata.pageCount"] == 1
    assert call_args[1]["$set"]["metadata.wordCount"] > 0


@pytest.mark.asyncio
async def test_process_docx_document_success():
    """Verify DOCX processing routes to DocxParser, populating wordCount and unsetting pageCount."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

    with tempfile.TemporaryDirectory() as tmp_dir:
        # Create a real small DOCX
        docx_path = os.path.join(tmp_dir, "thesis_draft.docx")
        doc = docx.Document()
        doc.add_paragraph("Chapter 1: Neural Networks in Modern Education")
        table = doc.add_table(rows=1, cols=2)
        table.rows[0].cells[0].text = "Metric"
        table.rows[0].cells[1].text = "Value"
        doc.save(docx_path)

        service = DocumentProcessingService(db=mock_db)

        with patch(
            "src.services.document_processing_service.settings"
        ) as mock_settings:
            mock_settings.UPLOAD_DIR = tmp_dir
            await service.process_document(doc_id, "/uploads/thesis_draft.docx")

    # Verify update_one set EMBEDDING and unset pageCount
    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[1]["$set"]["status"] == "EMBEDDING"
    assert call_args[1]["$set"]["metadata.wordCount"] > 5
    assert "metadata.pageCount" not in call_args[1]["$set"]
    assert call_args[1]["$unset"]["metadata.pageCount"] == ""


@pytest.mark.asyncio
async def test_process_txt_document_success():
    """Verify TXT processing routes to TxtParser, populating wordCount and unsetting pageCount."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "text/plain",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "notes.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("Dataset notes and LaTeX equations for analysis.")

        service = DocumentProcessingService(db=mock_db)

        with patch(
            "src.services.document_processing_service.settings"
        ) as mock_settings:
            mock_settings.UPLOAD_DIR = tmp_dir
            await service.process_document(doc_id, "/uploads/notes.txt")

    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[1]["$set"]["status"] == "EMBEDDING"
    assert call_args[1]["$set"]["metadata.wordCount"] > 5
    assert "metadata.pageCount" not in call_args[1]["$set"]
    assert call_args[1]["$unset"]["metadata.pageCount"] == ""


@pytest.mark.asyncio
async def test_process_txt_with_charset_parameter():
    """Verify MIME types with parameters (e.g. text/plain; charset=utf-8) route successfully."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "text/plain; charset=utf-8",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "charset_notes.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("Valid UTF-8 plain text with charset parameter in MIME header.")

        service = DocumentProcessingService(db=mock_db)

        with patch(
            "src.services.document_processing_service.settings"
        ) as mock_settings:
            mock_settings.UPLOAD_DIR = tmp_dir
            await service.process_document(doc_id, "/uploads/charset_notes.txt")

    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[1]["$set"]["status"] == "EMBEDDING"
    assert call_args[1]["$set"]["metadata.wordCount"] > 5


@pytest.mark.asyncio
async def test_process_document_unsupported_mime_type():
    """Verify unsupported MIME type transitions document status to FAILED."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "image/png",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

    service = DocumentProcessingService(db=mock_db)

    with patch("src.services.document_processing_service.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = "test_uploads"
        await service.process_document(doc_id, "/uploads/unsupported.png")

    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[1]["$set"]["status"] == "FAILED"
    assert "unsupported" in call_args[1]["$set"]["errorMessage"].lower()


@pytest.mark.asyncio
async def test_process_document_failure_transitions_to_failed():
    """Verify extraction failure (missing file) transitions document status to FAILED."""
    mock_db = MagicMock()
    mock_collection = MagicMock()
    mock_db.documents = mock_collection

    doc_id = str(ObjectId())
    mock_collection.find_one_and_update = AsyncMock(
        return_value={
            "_id": ObjectId(doc_id),
            "mimeType": "application/pdf",
            "status": "PARSING",
        }
    )
    mock_collection.update_one = AsyncMock(return_value=MagicMock(matched_count=1))

    service = DocumentProcessingService(db=mock_db)

    # Point to a non-existent file to simulate failure
    with patch("src.services.document_processing_service.settings") as mock_settings:
        mock_settings.UPLOAD_DIR = "/fake/uploads"
        await service.process_document(doc_id, "/uploads/non_existent.pdf")

    mock_collection.update_one.assert_awaited_once()
    call_args = mock_collection.update_one.call_args[0]
    assert call_args[1]["$set"]["status"] == "FAILED"
    assert "errorMessage" in call_args[1]["$set"]
    assert "not found" in call_args[1]["$set"]["errorMessage"].lower()


def test_parser_registry_contains_supported_mimes():
    """Verify PARSER_REGISTRY contains PDF, DOCX, and TXT strategies."""
    assert "application/pdf" in PARSER_REGISTRY
    assert (
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        in PARSER_REGISTRY
    )
    assert "text/plain" in PARSER_REGISTRY
