"""Hardware acceleration device detection module routing tensor execution to CUDA, MPS, or CPU."""

import logging
from typing import Any

import torch

logger = logging.getLogger(__name__)


class DeviceManager:
    """Manages hardware acceleration target selection for PyTorch deep learning models."""

    @staticmethod
    def get_device() -> str:
        """Determines the optimal execution device based on host hardware availability.

        Resolution Priority:
        1. NVIDIA CUDA GPU ('cuda')
        2. Apple Silicon MPS ('mps')
        3. Multicore CPU fallback ('cpu')

        Returns:
            String identifier: 'cuda', 'mps', or 'cpu'.
        """
        if torch.cuda.is_available():
            try:
                device_name = torch.cuda.get_device_name(0)
            except Exception:
                device_name = "Generic CUDA Device"
            logger.info(
                f"NVIDIA CUDA hardware acceleration detected: {device_name}. "
                f"Device count: {torch.cuda.device_count()}."
            )
            return "cuda"

        if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
            logger.info(
                "Apple Silicon MPS (Metal Performance Shaders) hardware acceleration detected."
            )
            return "mps"

        logger.warning(
            "Hardware acceleration unavailable (neither CUDA nor MPS found). "
            "Falling back to CPU execution. Batch embedding throughput may be degraded."
        )
        return "cpu"

    @classmethod
    def get_device_info(cls) -> dict[str, Any]:
        """Returns structured hardware device diagnostics for observability endpoints."""
        device = cls.get_device()
        info: dict[str, Any] = {
            "device": device,
            "cuda_available": torch.cuda.is_available(),
            "mps_available": (
                hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
            ),
            "torch_version": torch.__version__,
        }
        if device == "cuda":
            info["device_name"] = torch.cuda.get_device_name(0)
            info["device_count"] = torch.cuda.device_count()
        return info


def get_device() -> str:
    """Top-level convenience accessor returning optimal compute target."""
    return DeviceManager.get_device()


device_manager = DeviceManager()
