"""Unit tests for DeviceManager hardware acceleration probing and fallback logic."""

from unittest.mock import MagicMock, patch

import torch
from src.infrastructure.ai.device_manager import DeviceManager, get_device


def test_get_device_returns_valid_string():
    """Verify default runtime returns one of the valid PyTorch device strings."""
    device = DeviceManager.get_device()
    assert device in ["cpu", "cuda", "mps"]
    assert get_device() == device


def test_get_device_cuda_priority():
    """Verify CUDA is selected first when torch.cuda.is_available() is True."""
    with (
        patch.object(torch.cuda, "is_available", return_value=True),
        patch.object(torch.cuda, "get_device_name", return_value="NVIDIA RTX 4090"),
    ):
        device = DeviceManager.get_device()
        assert device == "cuda"


def test_get_device_mps_fallback():
    """Verify Apple MPS is selected when CUDA is unavailable but MPS is available."""
    with patch.object(torch.cuda, "is_available", return_value=False):
        mock_mps = MagicMock()
        mock_mps.is_available.return_value = True
        with patch.object(torch.backends, "mps", mock_mps):
            device = DeviceManager.get_device()
            assert device == "mps"


def test_get_device_cpu_fallback():
    """Verify CPU fallback when both CUDA and MPS are unavailable."""
    with patch.object(torch.cuda, "is_available", return_value=False):
        mock_mps = MagicMock()
        mock_mps.is_available.return_value = False
        with patch.object(torch.backends, "mps", mock_mps):
            device = DeviceManager.get_device()
            assert device == "cpu"


def test_get_device_info_structure():
    """Verify get_device_info returns required diagnostic keys."""
    info = DeviceManager.get_device_info()
    assert "device" in info
    assert "cuda_available" in info
    assert "mps_available" in info
    assert "torch_version" in info
