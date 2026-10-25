"""Hierarchical, token-aware semantic text chunker implementing recursive splitting with sliding overlap."""

import logging
from collections.abc import Generator
from dataclasses import dataclass

import tiktoken

from src.config.ai_settings import ai_settings

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class TextChunk:
    """Structured text chunk container retaining positional and volumetric metadata."""

    index: int
    text: str
    token_count: int
    char_count: int


class RecursiveTokenChunker:
    """Recursive hierarchical text splitter with sliding token overlap.

    Slices large academic documents while preserving natural language boundaries
    (paragraphs -> lines -> sentences -> words) and ensuring chunks strictly comply
    with Transformer Context Window limits (e.g. 512 tokens).
    """

    DEFAULT_SEPARATORS: tuple[str, ...] = ("\n\n", "\n", ". ", " ", "")

    def __init__(
        self,
        chunk_size: int | None = None,
        chunk_overlap: int | None = None,
        encoding_name: str | None = None,
    ) -> None:
        self._chunk_size = chunk_size or ai_settings.CHUNK_SIZE
        self._chunk_overlap = (
            chunk_overlap if chunk_overlap is not None else ai_settings.CHUNK_OVERLAP
        )
        self._encoding_name = encoding_name or ai_settings.TOKENIZER_ENCODING

        if self._chunk_overlap >= self._chunk_size:
            raise ValueError(
                f"chunk_overlap ({self._chunk_overlap}) must be strictly smaller than chunk_size ({self._chunk_size})."
            )

        try:
            self._encoder = tiktoken.get_encoding(self._encoding_name)
        except Exception:
            logger.warning(
                f"Encoding '{self._encoding_name}' unavailable. Falling back to 'cl100k_base'."
            )
            self._encoder = tiktoken.get_encoding("cl100k_base")

    @property
    def chunk_size(self) -> int:
        return self._chunk_size

    @property
    def chunk_overlap(self) -> int:
        return self._chunk_overlap

    def count_tokens(self, text: str) -> int:
        """Returns the exact BPE token count for a text string."""
        if not text:
            return 0
        return len(self._encoder.encode(text))

    def split_text(self, text: str) -> list[str]:
        """Splits raw text into raw chunk strings respecting token bounds and overlap."""
        chunks = list(self.iter_chunks(text))
        return [c.text for c in chunks]

    def split(self, text: str) -> list[TextChunk]:
        """Splits raw text into typed TextChunk objects containing indices and token counts."""
        return list(self.iter_chunks(text))

    def iter_chunks(self, text: str) -> Generator[TextChunk, None, None]:
        """Generator yielding TextChunk instances with memory-efficient sliding windows."""
        if not text or not text.strip():
            return

        cleaned_text = text.strip()
        total_tokens = self.count_tokens(cleaned_text)

        # Fast path: Entire text comfortably fits inside a single chunk
        if total_tokens <= self._chunk_size:
            yield TextChunk(
                index=0,
                text=cleaned_text,
                token_count=total_tokens,
                char_count=len(cleaned_text),
            )
            return

        # 1. Hierarchical recursive decomposition into small atomic semantic units
        atomic_pieces = self._recursive_split(
            cleaned_text, list(self.DEFAULT_SEPARATORS)
        )

        # 2. Sliding window merge preserving configured token overlap
        chunk_index = 0
        current_pieces: list[str] = []
        current_token_count = 0

        for piece in atomic_pieces:
            piece_clean = piece.strip()
            if not piece_clean:
                continue

            piece_tokens = self.count_tokens(piece_clean)

            # If adding this piece fits within chunk_size, accumulate
            if current_token_count + piece_tokens <= self._chunk_size:
                current_pieces.append(piece_clean)
                current_token_count += piece_tokens
            else:
                if current_pieces:
                    # Construct and yield chunk
                    chunk_text = " ".join(current_pieces).strip()
                    if chunk_text:
                        c_tokens = self.count_tokens(chunk_text)
                        yield TextChunk(
                            index=chunk_index,
                            text=chunk_text,
                            token_count=c_tokens,
                            char_count=len(chunk_text),
                        )
                        chunk_index += 1

                    # Establish overlap window from trailing tokens of previous chunk
                    if self._chunk_overlap > 0:
                        prev_tokens = self._encoder.encode(chunk_text)
                        overlap_tokens = prev_tokens[-self._chunk_overlap :]
                        overlap_str = self._encoder.decode(overlap_tokens).strip()

                        # Ensure overlap + new piece doesn't exceed limit
                        if (
                            self.count_tokens(overlap_str) + piece_tokens
                            <= self._chunk_size
                        ):
                            current_pieces = [overlap_str, piece_clean]
                            current_token_count = (
                                self.count_tokens(overlap_str) + piece_tokens
                            )
                        else:
                            current_pieces = [piece_clean]
                            current_token_count = piece_tokens
                    else:
                        current_pieces = [piece_clean]
                        current_token_count = piece_tokens
                else:
                    # Single piece exceeds chunk_size; yield as standalone chunk
                    c_tokens = self.count_tokens(piece_clean)
                    yield TextChunk(
                        index=chunk_index,
                        text=piece_clean,
                        token_count=c_tokens,
                        char_count=len(piece_clean),
                    )
                    chunk_index += 1
                    current_pieces = []
                    current_token_count = 0

        # Yield any trailing accumulated pieces
        if current_pieces:
            chunk_text = " ".join(current_pieces).strip()
            if chunk_text:
                c_tokens = self.count_tokens(chunk_text)
                yield TextChunk(
                    index=chunk_index,
                    text=chunk_text,
                    token_count=c_tokens,
                    char_count=len(chunk_text),
                )

    def _recursive_split(self, text: str, separators: list[str]) -> list[str]:
        """Recursively steps down separator hierarchy until text blocks fall below chunk_size."""
        if not separators:
            # Absolute fallback: slice by character limit if unbroken by spaces/punctuation
            return self._fallback_char_split(text)

        sep = separators[0]
        sub_separators = separators[1:]

        if sep == "":
            return self._fallback_char_split(text)

        # Split on active separator
        splits = text.split(sep)
        atomic_results: list[str] = []

        for segment in splits:
            seg_clean = segment.strip()
            if not seg_clean:
                continue

            seg_tokens = self.count_tokens(seg_clean)
            if seg_tokens <= self._chunk_size:
                atomic_results.append(seg_clean)
            else:
                # Recurse down to finer-grained separator (paragraphs -> lines -> sentences -> words)
                sub_splits = self._recursive_split(seg_clean, sub_separators)
                atomic_results.extend(sub_splits)

        return atomic_results

    def _fallback_char_split(self, text: str) -> list[str]:
        """Slices unbroken text blocks (e.g. continuous strings without spaces) into safe token slices."""
        tokens = self._encoder.encode(text)
        slices: list[str] = []
        for i in range(0, len(tokens), self._chunk_size):
            slice_tokens = tokens[i : i + self._chunk_size]
            slices.append(self._encoder.decode(slice_tokens).strip())
        return slices


chunker = RecursiveTokenChunker()
