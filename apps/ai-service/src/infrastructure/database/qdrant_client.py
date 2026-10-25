"""Qdrant Vector Database connection lifecycle manager and schema provisioning."""

import logging

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PayloadSchemaType, VectorParams
from src.config.qdrant_settings import qdrant_settings

logger = logging.getLogger(__name__)

# Singleton module-level client instance
_qdrant_client: AsyncQdrantClient | None = None


def get_qdrant_client() -> AsyncQdrantClient:
    """Returns the persistent singleton AsyncQdrantClient instance.

    Configures connection pooling over HTTP/REST or high-throughput gRPC.
    """
    global _qdrant_client
    if _qdrant_client is None:
        if qdrant_settings.QDRANT_URL:
            logger.info(
                f"Connecting to Qdrant cluster via URL: {qdrant_settings.QDRANT_URL}"
            )
            _qdrant_client = AsyncQdrantClient(
                url=qdrant_settings.QDRANT_URL,
                api_key=qdrant_settings.QDRANT_API_KEY,
                prefer_grpc=qdrant_settings.QDRANT_PREFER_GRPC,
            )
        else:
            logger.info(
                f"Connecting to Qdrant at {qdrant_settings.QDRANT_HOST}:{qdrant_settings.QDRANT_PORT} "
                f"(grpc_port={qdrant_settings.QDRANT_GRPC_PORT}, prefer_grpc={qdrant_settings.QDRANT_PREFER_GRPC})"
            )
            _qdrant_client = AsyncQdrantClient(
                host=qdrant_settings.QDRANT_HOST,
                port=qdrant_settings.QDRANT_PORT,
                grpc_port=qdrant_settings.QDRANT_GRPC_PORT,
                api_key=qdrant_settings.QDRANT_API_KEY,
                prefer_grpc=qdrant_settings.QDRANT_PREFER_GRPC,
            )
    return _qdrant_client


def set_qdrant_client(client: AsyncQdrantClient | None) -> None:
    """Explicitly assigns or resets the client instance (primarily used for unit testing with in-memory stores)."""
    global _qdrant_client
    _qdrant_client = client


async def close_qdrant_client() -> None:
    """Gracefully terminates open gRPC channels and HTTP connection pools upon application shutdown."""
    global _qdrant_client
    if _qdrant_client is not None:
        try:
            await _qdrant_client.close()
            logger.info("Closed Qdrant vector database client connection.")
        except Exception as exc:
            logger.warning(f"Encountered non-fatal error closing Qdrant client: {exc}")
        finally:
            _qdrant_client = None


async def init_qdrant_schema(client: AsyncQdrantClient | None = None) -> bool:
    """Idempotently provisions the academic document vector collection and multi-tenant payload indices.

    Collection Specifications:
    - Name: academic_documents
    - Vector Dimensions: 384 (aligned with Phase 30 BGE-small / MiniLM models)
    - Distance Metric: Cosine (angular semantic proximity)
    - Payload Indexes: userId (Tenant Isolation), documentId (Document-level batch deletes)

    Returns:
        bool: True if collection is ready for vector ingestion, False if connection failed.
    """
    target_client = client or get_qdrant_client()
    collection_name = qdrant_settings.COLLECTION_NAME
    dim = qdrant_settings.VECTOR_DIMENSION

    try:
        exists = await target_client.collection_exists(collection_name)
        if not exists:
            logger.info(
                f"Vector collection '{collection_name}' not found. Provisioning collection "
                f"with dim={dim}, distance=Cosine..."
            )
            await target_client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(
                    size=dim,
                    distance=Distance.COSINE,
                ),
            )
            logger.info(f"Successfully created Qdrant collection: '{collection_name}'.")
        else:
            logger.info(f"Qdrant collection '{collection_name}' verified and ready.")

        # Provision payload indices for rapid multi-tenant filtering (userId) and document deletion (documentId)
        try:
            await target_client.create_payload_index(
                collection_name=collection_name,
                field_name="userId",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            await target_client.create_payload_index(
                collection_name=collection_name,
                field_name="documentId",
                field_schema=PayloadSchemaType.KEYWORD,
            )
            logger.info(
                f"Multi-tenant payload indices established on collection '{collection_name}' (userId, documentId)."
            )
        except Exception as idx_exc:
            # In local memory mode or if indexes already exist, log informational trace
            logger.debug(
                f"Payload index initialization status for '{collection_name}': {idx_exc}"
            )

        return True
    except Exception as exc:
        logger.warning(
            f"Unable to connect to Qdrant or initialize collection '{collection_name}': {exc}. "
            "Ensure the Qdrant container is running. Vector operations will remain deferred."
        )
        return False
