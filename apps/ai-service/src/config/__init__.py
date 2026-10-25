"""AI microservice configuration package."""

from src.config.ai_settings import AISettings, ai_settings
from src.config.qdrant_settings import QdrantSettings, qdrant_settings

__all__ = [
    "AISettings",
    "ai_settings",
    "QdrantSettings",
    "qdrant_settings",
]
