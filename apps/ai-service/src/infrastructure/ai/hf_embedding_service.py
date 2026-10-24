"""Hugging Face SentenceTransformer embedding implementation adhering to thread-safe Singleton pattern."""

import logging
import threading
from typing import Any

from sentence_transformers import SentenceTransformer
from src.config.ai_settings import ai_settings
from src.infrastructure.ai.device_manager import DeviceManager

logger = logging.getLogger(__name__)


class HFEmbeddingService:
    """Singleton embedding service utilizing Hugging Face sentence-transformers.

    Guarantees that large Transformer model binaries are loaded once in VRAM/RAM,
    preventing Out-Of-Memory (OOM) fatal crashes and cold-start request latency.
    """

    _instance: "HFEmbeddingService | None" = None
    _lock: threading.Lock = threading.Lock()

    def __new__(cls, *args: Any, **kwargs: Any) -> "HFEmbeddingService":
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(
        self,
        model_name: str | None = None,
        device: str | None = None,
        cache_dir: str | None = None,
        lazy_load: bool = False,
    ) -> None:
        if getattr(self, "_initialized", False):
            return

        with self._lock:
            if getattr(self, "_initialized", False):
                return

            self._model_name = model_name or ai_settings.EMBEDDING_MODEL_NAME
            self._device = device or DeviceManager.get_device()
            self._cache_dir = cache_dir or ai_settings.HF_CACHE_DIR
            self._model: SentenceTransformer | None = None
            self._dimension = ai_settings.EMBEDDING_DIMENSION

            if not lazy_load:
                self._load_model()

            self._initialized = True

    def _load_model(self) -> None:
        """Loads and provisions the Hugging Face SentenceTransformer model onto target hardware."""
        logger.info(
            f"Loading Hugging Face embedding model '{self._model_name}' onto device '{self._device}'... "
            f"(cache_folder='{self._cache_dir}')"
        )
        try:
            self._model = SentenceTransformer(
                self._model_name,
                device=self._device,
                cache_folder=self._cache_dir,
            )
            self._model.max_seq_length = ai_settings.MAX_SEQ_LENGTH

            # Read actual embedding dimension from model config
            dim = self._model.get_sentence_embedding_dimension()
            if dim is not None:
                self._dimension = int(dim)

            logger.info(
                f"Successfully initialized embedding model '{self._model_name}': "
                f"device='{self._device}', dimension={self._dimension}, max_seq_length={self._model.max_seq_length}"
            )
        except Exception as exc:
            logger.error(
                f"Fatal error loading Hugging Face embedding model '{self._model_name}': {exc}"
            )
            raise

    @property
    def model_name(self) -> str:
        """Returns active model identifier."""
        return self._model_name

    @property
    def dimension(self) -> int:
        """Returns embedding dimensionality."""
        return self._dimension

    @property
    def device(self) -> str:
        """Returns compute device."""
        return self._device

    @property
    def is_loaded(self) -> bool:
        """Checks if model binary is currently in memory."""
        return self._model is not None

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Encodes an iterable batch of text strings into normalized dense vector embeddings.

        Args:
            texts: List of strings to encode.

        Returns:
            List of embedding vectors, each represented as a list of standard Python floats.
        """
        if not texts:
            return []

        if self._model is None:
            self._load_model()

        assert self._model is not None

        # Execute parallel matrix multiplication with configured batch size
        embeddings = self._model.encode(
            texts,
            batch_size=ai_settings.EMBEDDING_BATCH_SIZE,
            convert_to_numpy=True,
            normalize_embeddings=ai_settings.NORMALIZE_EMBEDDINGS,
            show_progress_bar=False,
        )

        # Convert numpy ndarray to standard serializable Python float list
        return embeddings.tolist()

    def embed_text(self, text: str) -> list[float]:
        """Convenience method generating an embedding vector for a single string."""
        if not text:
            # Generate representation of empty string
            results = self.embed_batch([""])
            return results[0]

        results = self.embed_batch([text])
        return results[0]

    @classmethod
    def reset_instance(cls) -> None:
        """Utility method resetting the singleton instance (used exclusively for unit test isolation)."""
        with cls._lock:
            cls._instance = None
