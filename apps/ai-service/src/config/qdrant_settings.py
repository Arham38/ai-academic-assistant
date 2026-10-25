"""Configuration settings for Qdrant Vector Database connection, collections, and dimensionality."""

import os

from pydantic_settings import BaseSettings


class QdrantSettings(BaseSettings):
    """Configuration settings for Qdrant Vector Store."""

    # Qdrant connectivity
    QDRANT_HOST: str = os.getenv("QDRANT_HOST", "localhost")
    QDRANT_PORT: int = int(os.getenv("QDRANT_PORT", "6333"))
    QDRANT_GRPC_PORT: int = int(os.getenv("QDRANT_GRPC_PORT", "6334"))
    QDRANT_URL: str | None = os.getenv("QDRANT_URL", None)
    QDRANT_API_KEY: str | None = os.getenv("QDRANT_API_KEY", None)
    QDRANT_PREFER_GRPC: bool = (
        os.getenv("QDRANT_PREFER_GRPC", "false").lower() == "true"
    )

    # Vector store parameters
    COLLECTION_NAME: str = os.getenv("QDRANT_COLLECTION_NAME", "academic_documents")
    VECTOR_DIMENSION: int = int(os.getenv("VECTOR_DIMENSION", "384"))
    DISTANCE_METRIC: str = "Cosine"

    # Batch limits for upserts to avoid gRPC payload truncation
    UPSERT_BATCH_SIZE: int = 500

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


qdrant_settings = QdrantSettings()
