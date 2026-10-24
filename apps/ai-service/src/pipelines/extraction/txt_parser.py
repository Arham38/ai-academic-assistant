"""Plain text (.txt) document extractor with multi-stage encoding fallback cascade."""

import logging
import os

from src.core.exceptions import (
    EmptyDocumentError,
    ExtractionError,
    FileNotFoundTXTError,
)
from src.pipelines.extraction.parser_interface import BaseParser

logger = logging.getLogger(__name__)


def extract_text_from_txt(filepath: str) -> tuple[str, int | None, int]:
    """Extracts raw text content from a plain text file using a robust encoding fallback cascade.

    Cascade Strategy:
    1. UTF-8 Strict: Standard modern encoding (fails immediately on invalid byte sequence).
    2. Windows-1252 (CP1252): Legacy Windows encoding commonly used by academic researchers.
    3. UTF-8 with Replacement: Lossless coercion replacing unreadable bytes with U+FFFD.

    Args:
        filepath: Absolute or validated local path to the .txt file.

    Returns:
        Tuple of (raw_text, page_count=None, approximate_word_count).

    Raises:
        FileNotFoundTXTError: When the target file does not exist.
        EmptyDocumentError: When the file contains no readable text content.
        ExtractionError: If file reading fails completely.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundTXTError(f"TXT document file not found at: {filepath}")

    text: str = ""

    # Stage 1: Try UTF-8 Strict
    try:
        with open(filepath, encoding="utf-8") as f:
            text = f.read()
        logger.debug(f"Successfully decoded {filepath} via Stage 1 (UTF-8 Strict).")
    except UnicodeDecodeError as utf8_err:
        logger.warning(
            f"UTF-8 Strict decode failed for {filepath}: {utf8_err}. "
            "Falling back to Stage 2 (Windows-1252)."
        )
        # Stage 2: Try Windows-1252 / CP1252
        try:
            with open(filepath, encoding="windows-1252") as f:
                text = f.read()
            logger.info(f"Successfully decoded {filepath} via Stage 2 (Windows-1252).")
        except UnicodeDecodeError as win_err:
            logger.warning(
                f"Windows-1252 decode failed for {filepath}: {win_err}. "
                "Falling back to Stage 3 (UTF-8 with replacement coercion)."
            )
            # Stage 3: Lossless coercion using UTF-8 with replacement
            try:
                with open(filepath, encoding="utf-8", errors="replace") as f:
                    text = f.read()
                logger.info(
                    f"Successfully decoded {filepath} via Stage 3 (UTF-8 Replace)."
                )
            except Exception as coerce_err:
                raise ExtractionError(
                    f"Failed to read and decode text file {os.path.basename(filepath)}: {coerce_err}"
                ) from coerce_err
    except Exception as read_err:
        raise ExtractionError(
            f"Failed to read text file {os.path.basename(filepath)}: {read_err}"
        ) from read_err

    if not text.strip():
        raise EmptyDocumentError(
            f"TXT document contains no readable text: {os.path.basename(filepath)}"
        )

    clean_text = text.strip()
    word_count = len(clean_text.split())

    # Plain text has no static pages; page count is inherently dynamic (None)
    return clean_text, None, word_count


class TxtParser(BaseParser):
    """Plain text (.txt) document parser strategy."""

    def extract(self, filepath: str) -> tuple[str, int | None, int]:
        """Extracts text content and word count from a text file."""
        return extract_text_from_txt(filepath)
