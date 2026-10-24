"""AI infrastructure components for device routing, model inference, and vector embedding."""

from src.infrastructure.ai.device_manager import (
    DeviceManager,
    device_manager,
    get_device,
)
from src.infrastructure.ai.embedding_provider import IEmbeddingProvider
from src.infrastructure.ai.hf_embedding_service import HFEmbeddingService

__all__ = [
    "DeviceManager",
    "device_manager",
    "get_device",
    "IEmbeddingProvider",
    "HFEmbeddingService",
]
