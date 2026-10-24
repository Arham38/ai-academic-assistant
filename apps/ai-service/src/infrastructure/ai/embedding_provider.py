"""Abstract embedding provider protocol interface decoupling text vectorization."""

from typing import Protocol, runtime_checkable


@runtime_checkable
class IEmbeddingProvider(Protocol):
    """Protocol contract defining synchronous and batch vectorization operations."""

    @property
    def model_name(self) -> str:
        """Returns the canonical model identifier string."""
        ...

    @property
    def dimension(self) -> int:
        """Returns the dense vector dimensionality (e.g. 384 for bge-small)."""
        ...

    @property
    def device(self) -> str:
        """Returns the active execution hardware target ('cuda', 'mps', or 'cpu')."""
        ...

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Vectorizes a batch of text strings into a matrix of floating point vectors.

        Args:
            texts: List of text strings/chunks to encode.

        Returns:
            List of embedding vectors, each represented as a list of float numbers.
        """
        ...

    def embed_text(self, text: str) -> list[float]:
        """Convenience method generating an embedding vector for a single text input.

        Args:
            text: Text string to encode.

        Returns:
            A single dense embedding vector.
        """
        ...
