"""Integration tests for internal document processing API routes."""

from unittest.mock import AsyncMock, MagicMock, patch

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


def test_analyze_plagiarism_missing_secret(client):
    """Verify plagiarism endpoint without X-Internal-Secret returns 403 Forbidden."""
    response = client.post(
        "/api/internal/v1/analyze/plagiarism",
        json={"documentId": "651a2b3c4d5e6f7a8b9c0d1e"},
    )
    assert response.status_code == 403


def test_analyze_plagiarism_invalid_secret(client):
    """Verify plagiarism endpoint with wrong secret returns 403 Forbidden."""
    response = client.post(
        "/api/internal/v1/analyze/plagiarism",
        headers={"X-Internal-Secret": "invalid-secret"},
        json={"documentId": "651a2b3c4d5e6f7a8b9c0d1e"},
    )
    assert response.status_code == 403


def test_analyze_plagiarism_success(client):
    """Verify plagiarism analysis endpoint returns 200 OK and structured JSON report."""
    mock_report = MagicMock()
    mock_report.to_dict.return_value = {
        "overallScore": 82.5,
        "flaggedChunks": [
            {
                "chunkIndex": 4,
                "text": "The methodology employed in this study...",
                "similarityScore": 0.89,
                "severity": "HIGH",
                "matchedSource": {
                    "documentId": "882a1b2c3d4e5f6a7b8c9d0e",
                    "title": "Previous_Research.pdf",
                    "text": "The methods employed during this research...",
                },
            }
        ],
    }

    with patch(
        "src.services.plagiarism_detector_service.PlagiarismDetectorService.analyze_document",
        new_callable=AsyncMock,
        return_value=mock_report,
    ) as mock_analyze:
        response = client.post(
            "/api/internal/v1/analyze/plagiarism",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={
                "documentId": "651a2b3c4d5e6f7a8b9c0d1e",
                "versionId": "uuid-v2",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["overallScore"] == 82.5
        assert len(data["flaggedChunks"]) == 1
        assert data["flaggedChunks"][0]["chunkIndex"] == 4
        assert data["flaggedChunks"][0]["severity"] == "HIGH"
        assert (
            data["flaggedChunks"][0]["matchedSource"]["title"]
            == "Previous_Research.pdf"
        )
        mock_analyze.assert_awaited_once_with(
            document_id="651a2b3c4d5e6f7a8b9c0d1e",
            version_id="uuid-v2",
        )


def test_analyze_plagiarism_alias_endpoint(client):
    """Verify alias route /internal/v1/analyze/plagiarism behaves identically."""
    mock_report = MagicMock()
    mock_report.to_dict.return_value = {
        "overallScore": 100.0,
        "flaggedChunks": [],
    }

    with patch(
        "src.services.plagiarism_detector_service.PlagiarismDetectorService.analyze_document",
        new_callable=AsyncMock,
        return_value=mock_report,
    ):
        response = client.post(
            "/internal/v1/analyze/plagiarism",
            headers={"X-Internal-Secret": settings.INTERNAL_SERVICE_KEY},
            json={"documentId": "651a2b3c4d5e6f7a8b9c0d1e"},
        )
        assert response.status_code == 200
        assert response.json()["overallScore"] == 100.0
