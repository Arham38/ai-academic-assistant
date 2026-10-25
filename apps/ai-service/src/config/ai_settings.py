"""AI and machine learning configuration settings for model weights, batching, and hardware execution."""

import os

from pydantic_settings import BaseSettings


class AISettings(BaseSettings):
    """Configuration governing deep learning model loading, device routing, and token sequence limits."""

    # Default embedding model optimized for academic retrieval (MTEB benchmark leader)
    EMBEDDING_MODEL_NAME: str = os.getenv(
        "EMBEDDING_MODEL_NAME", "BAAI/bge-small-en-v1.5"
    )

    # Embedding vector dimensionality (384 dimensions for bge-small and MiniLM-L6)
    EMBEDDING_DIMENSION: int = 384

    # Maximum sequence length in tokens before truncation occurs
    MAX_SEQ_LENGTH: int = 512

    # Vector batch size for parallel tensor matrix multiplication
    EMBEDDING_BATCH_SIZE: int = 32

    # Cache directory for persistent Hugging Face weight binaries
    HF_CACHE_DIR: str = os.getenv(
        "HF_HOME",
        os.getenv("TRANSFORMERS_CACHE", "/root/.cache/huggingface"),
    )

    # Normalization flag for unit vector length (required for cosine/dot product equivalence)
    NORMALIZE_EMBEDDINGS: bool = True

    # NLP Semantic Chunking Parameters
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "400"))  # target tokens per chunk
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "50"))  # token stride overlap
    TOKENIZER_ENCODING: str = os.getenv("TOKENIZER_ENCODING", "cl100k_base")

    # Semantic Plagiarism Detection Thresholds
    SIMILARITY_THRESHOLD_HIGH: float = float(
        os.getenv("SIMILARITY_THRESHOLD_HIGH", "0.85")
    )
    SIMILARITY_THRESHOLD_MODERATE: float = float(
        os.getenv("SIMILARITY_THRESHOLD_MODERATE", "0.75")
    )

    model_config = {
        "env_file": ".env",
        "extra": "ignore",
    }


ai_settings = AISettings()
