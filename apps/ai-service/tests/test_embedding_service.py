"""Unit tests for HFEmbeddingService singleton, vector dimensionality, and batch processing."""

import math
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from src.infrastructure.ai.embedding_provider import IEmbeddingProvider
from src.infrastructure.ai.hf_embedding_service import HFEmbeddingService


@pytest.fixture(autouse=True)
def reset_singleton():
    """Ensures singleton state is clean before and after each test."""
    HFEmbeddingService.reset_instance()
    yield
    HFEmbeddingService.reset_instance()


def test_singleton_instance_identity():
    """Verify multiple instantiations return the exact same object reference."""
    with patch(
        "src.infrastructure.ai.hf_embedding_service.SentenceTransformer"
    ) as mock_st_cls:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_st_cls.return_value = mock_model

        service_1 = HFEmbeddingService()
        service_2 = HFEmbeddingService()

        assert service_1 is service_2
        assert mock_st_cls.call_count == 1


def test_protocol_conformance():
    """Verify HFEmbeddingService implements the IEmbeddingProvider protocol."""
    with patch(
        "src.infrastructure.ai.hf_embedding_service.SentenceTransformer"
    ) as mock_st_cls:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        mock_st_cls.return_value = mock_model

        service = HFEmbeddingService()
        assert isinstance(service, IEmbeddingProvider)


def test_embed_batch_mocked_contract():
    """Verify embed_batch calls encode with correct parameters and converts ndarray to list of floats."""
    with patch(
        "src.infrastructure.ai.hf_embedding_service.SentenceTransformer"
    ) as mock_st_cls:
        mock_model = MagicMock()
        mock_model.get_sentence_embedding_dimension.return_value = 384
        # Simulate 2 embeddings of 384 dimensions
        mock_embeddings = np.ones((2, 384), dtype=np.float32)
        mock_model.encode.return_value = mock_embeddings
        mock_st_cls.return_value = mock_model

        service = HFEmbeddingService()
        results = service.embed_batch(["First text", "Second text"])

        assert len(results) == 2
        assert len(results[0]) == 384
        assert isinstance(results[0][0], float)
        mock_model.encode.assert_called_once()
        _, kwargs = mock_model.encode.call_args
        assert kwargs["batch_size"] == 32
        assert kwargs["convert_to_numpy"] is True
        assert kwargs["normalize_embeddings"] is True


def test_embed_batch_empty_list():
    """Verify empty input list returns empty list without calling model."""
    with patch(
        "src.infrastructure.ai.hf_embedding_service.SentenceTransformer"
    ) as mock_st_cls:
        mock_model = MagicMock()
        mock_st_cls.return_value = mock_model

        service = HFEmbeddingService()
        assert service.embed_batch([]) == []
        mock_model.encode.assert_not_called()


def test_real_model_inference_and_determinism():
    """Verify real SentenceTransformer outputs exact 384-d vectors, unit normalization, and deterministic values."""
    # Use locally cached MiniLM model to guarantee sub-second execution
    service = HFEmbeddingService(
        model_name="sentence-transformers/all-MiniLM-L6-v2",
        device="cpu",
    )

    batch = ["Hello World", "Academic Integrity"]
    embeddings = service.embed_batch(batch)

    # 1. Output Dimensionality Test
    assert len(embeddings) == 2
    assert len(embeddings[0]) == 384
    assert len(embeddings[1]) == 384
    assert isinstance(embeddings[0][0], float)

    # 2. Deterministic Output Test (identical inputs yield identical vectors)
    repeat_embeddings = service.embed_batch(["Hello World"])
    diff = sum(
        abs(a - b) for a, b in zip(embeddings[0], repeat_embeddings[0], strict=True)
    )
    assert diff == pytest.approx(0.0, abs=1e-6)

    # 3. Unit Normalization Test (L2 norm == 1.0)
    l2_norm = math.sqrt(sum(x * x for x in embeddings[0]))
    assert l2_norm == pytest.approx(1.0, rel=1e-4)

    # 4. Single text convenience method
    single_vec = service.embed_text("Hello World")
    assert len(single_vec) == 384
    diff_single = sum(
        abs(a - b) for a, b in zip(embeddings[0], single_vec, strict=True)
    )
    assert diff_single == pytest.approx(0.0, abs=1e-6)
