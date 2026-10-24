"""Robust text sanitization module delegating to the NLP TextCleaner pipeline."""

from typing import Any

from src.pipelines.nlp.cleaner_rules import (
    CONTROL_CHAR_REGEX,
    LIGATURE_MAP,
    PAGE_NUMBER_REGEX,
)
from src.pipelines.nlp.cleaner_rules import (
    HYPHEN_REGEX as HYPHENATED_LINE_BREAK_REGEX,
)
from src.pipelines.nlp.text_cleaner import TextCleaner

__all__ = [
    "CONTROL_CHAR_REGEX",
    "HYPHENATED_LINE_BREAK_REGEX",
    "LIGATURE_MAP",
    "PAGE_NUMBER_REGEX",
    "TextCleaner",
    "sanitize_text",
]


def sanitize_text(raw_text: str, **kwargs: Any) -> str:
    """Sanitizes raw extracted document text for AI embeddings and evaluation.

    Delegates to the multi-stage TextCleaner pipeline.

    Args:
        raw_text: Unprocessed text from document extraction.
        **kwargs: Optional configuration parameters for TextCleaner (e.g., enable_dehyphenation, mask_urls).

    Returns:
        Cleaned, normalized, and dense UTF-8 text string.
    """
    cleaner = TextCleaner(**kwargs)
    return cleaner.clean(raw_text)
