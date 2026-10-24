"""Internal service-to-service endpoints for document processing."""

import logging
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    Header,
    HTTPException,
    status,
)
from pydantic import BaseModel, Field

from src.core.config import settings
from src.services.document_processing_service import (
    DocumentProcessingService,
    document_processing_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Internal Processing"])


class ProcessDocumentRequest(BaseModel):
    """Schema for document processing initiation request."""

    document_id: str = Field(
        ..., alias="documentId", description="MongoDB ObjectId of the document"
    )
    storage_uri: str = Field(
        ...,
        alias="storageUri",
        description="Relative or absolute URI of the physical file",
    )
    version_id: str | None = Field(
        default=None,
        alias="versionId",
        description="Optional version UUID for historical version processing",
    )

    model_config = {
        "populate_by_name": True,
    }


class ProcessDocumentResponse(BaseModel):
    """Schema for document processing acknowledgment response."""

    status: str = "success"
    message: str = "Document processing initiated."
    document_id: str = Field(..., alias="documentId")

    model_config = {
        "populate_by_name": True,
    }


def verify_internal_secret(
    x_internal_secret: Annotated[str | None, Header(alias="X-Internal-Secret")] = None,
) -> None:
    """Validates that the caller provided the correct shared internal microservice secret."""
    if not x_internal_secret or x_internal_secret != settings.INTERNAL_SERVICE_KEY:
        logger.warning(
            "Rejected unauthorized internal service request: invalid or missing X-Internal-Secret"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing X-Internal-Secret",
        )


@router.post(
    "/api/internal/v1/process/document",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ProcessDocumentResponse,
    dependencies=[Depends(verify_internal_secret)],
    summary="Enqueue PDF extraction and sanitization",
)
@router.post(
    "/internal/v1/process/pdf",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=ProcessDocumentResponse,
    dependencies=[Depends(verify_internal_secret)],
    include_in_schema=False,
)
async def process_document_endpoint(
    payload: ProcessDocumentRequest,
    background_tasks: BackgroundTasks,
    service: Annotated[
        DocumentProcessingService, Depends(lambda: document_processing_service)
    ],
) -> ProcessDocumentResponse:
    """Asynchronously triggers the PyMuPDF extraction pipeline in background tasks.

    Returns HTTP 202 immediately to decouple long-running parsing from API Gateway timeout.
    """
    logger.info(
        f"Received internal process request for document: {payload.document_id} at {payload.storage_uri}"
    )

    task_kwargs = {
        "document_id": payload.document_id,
        "storage_uri": payload.storage_uri,
    }
    if payload.version_id is not None:
        task_kwargs["version_id"] = payload.version_id

    background_tasks.add_task(
        service.process_document,
        **task_kwargs,
    )

    return ProcessDocumentResponse(
        status="success",
        message="Document processing initiated.",
        documentId=payload.document_id,
    )
