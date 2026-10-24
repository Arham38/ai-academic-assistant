"""AI infrastructure components for device routing, model inference, and vector embedding."""

from src.infrastructure.ai.device_manager import (
    DeviceManager,
    device_manager,
    get_device,
)

__all__ = ["DeviceManager", "device_manager", "get_device"]
