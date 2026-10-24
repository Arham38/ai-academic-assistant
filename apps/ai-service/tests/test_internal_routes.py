"""Integration tests for internal document processing API routes."""

from unittest.mock import AsyncMock, patch

import pytest
from src.core.config import settings
from src.main import app
from starlette.testclient import TestClient


@pytest.fixture
def client():
    """Provides a TestClient for FastAPI endpoints."""
    return TestClient(app)


def test_process_document_missing_secret(client):
    """Verify request without X-Internal-Secret is rejected with 403."""
    response = client.post(
        "/api/internal/v1/process/document",
        json={
            "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
            "storageUri": "/uploads/test.pdf",
        },
    )
    assert response.status_code == 403
    assert "Invalid or missing X-Internal-Secret" in response.json()["detail"]


def test_process_document_invalid_secret(client):
    """Verify request with incorrect secret is rejected with 403."""
    response = client.post(
        "/api/internal/v1/process/document",
        headers={"X-Internal-Secret": "wrong-secret-token"},
        json={
            "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
            "storageUri": "/uploads/test.pdf",
        },
    )
    assert response.status_code == 403


def test_process_document_success_camel_case(client):
    """Verify 202 Accepted and background task queued when using camelCase payload."""
    with patch(
        "src.services.document_processing_service.DocumentProcessingService.process_document",
        new_callable=AsyncMock,
    ) as mock_process:
        response = client.post(
            "/api/internal/v1/process/document",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={
                "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
                "storageUri": "/uploads/paper.pdf",
            },
        )
        assert response.status_code == 202
        data = response.json()
        assert data["status"] == "success"
        assert data["documentId"] == "651a2b3c4d5e6f7a8b9c0d1e"
        assert data["message"] == "Document processing initiated."

        # Verify background task was executed
        mock_process.assert_awaited_once_with(
            document_id="651a2b3c4d5e6f7a8b9c0d1e",
            storage_uri="/uploads/paper.pdf",
        )


def test_process_document_success_snake_case(client):
    """Verify 202 Accepted when using snake_case payload."""
    with patch(
        "src.services.document_processing_service.DocumentProcessingService.process_document",
        new_callable=AsyncMock,
    ) as mock_process:
        response = client.post(
            "/api/internal/v1/process/document",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={
                "document_id": "651a2b3c4d5e6f7a8b9c0d1e",
                "storage_uri": "/uploads/paper.pdf",
            },
        )
        assert response.status_code == 202
        assert mock_process.call_count == 1


def test_process_document_alternate_route(client):
    """Verify alternate route /internal/v1/process/pdf functions identically."""
    with patch(
        "src.services.document_processing_service.DocumentProcessingService.process_document",
        new_callable=AsyncMock,
    ) as mock_process:
        response = client.post(
            "/internal/v1/process/pdf",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={
                "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
                "storageUri": "/uploads/paper.pdf",
            },
        )
        assert response.status_code == 202
        assert mock_process.call_count == 1


def test_process_document_missing_payload_fields(client):
    """Verify 422 Unprocessable Entity when required fields are missing."""
    response = client.post(
        "/api/internal/v1/process/document",
        headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
        json={"storageUri": "/uploads/paper.pdf"},  # missing documentId
    )
    assert response.status_code == 422


def test_process_document_with_version_id(client):
    """Verify versionId in payload is passed to service.process_document."""
    with patch(
        "src.services.document_processing_service.DocumentProcessingService.process_document",
        new_callable=AsyncMock,
    ) as mock_process:
        response = client.post(
            "/api/internal/v1/process/document",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={
                "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
                "storageUri": "/uploads/paper-v2.pdf",
                "versionId": "ver-998877",
            },
        )
        assert response.status_code == 202
        mock_process.assert_awaited_once_with(
            document_id="651a2b3c4d5e6f7a8b9c0d1e",
            storage_uri="/uploads/paper-v2.pdf",
            version_id="ver-998877",
        )
