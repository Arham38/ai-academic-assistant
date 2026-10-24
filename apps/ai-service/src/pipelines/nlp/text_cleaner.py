"""Multi-stage, configurable NLP text cleaning pipeline for academic documents."""

import logging
import unicodedata

from src.pipelines.nlp.cleaner_rules import LIGATURE_MAP

logger = logging.getLogger(__name__)


class TextCleaner:
    """Executes deterministic, multi-stage sanitization on extracted text.

    Stages:
    1. Unicode Normalization: Form KC (NFKC) + Ligature / Zero-width character expansion
    2. De-hyphenation: Re-joining words split across line breaks
    3. Artifact Purging: Removing ASCII control chars, page headers/footers, and optional masking
    4. Whitespace Standardization: Collapsing horizontal spaces per line, condensing 3+ newlines to 2
    """

    def __init__(
        self,
        *,
        enable_dehyphenation: bool = True,
        mask_urls: bool = False,
        mask_emails: bool = False,
        strip_citations: bool = False,
        strip_headers_footers: bool = True,
    ) -> None:
        """Initializes the TextCleaner with configurable pipeline flags.

        Args:
            enable_dehyphenation: Whether to merge words split across newlines (e.g. aca-\\ndemic).
            mask_urls: Whether to replace detected web URLs with <URL>.
            mask_emails: Whether to replace email addresses with <EMAIL>.
            strip_citations: Whether to remove numeric bracket citations (e.g. [1], [2-4]).
            strip_headers_footers: Whether to remove isolated page numbers and page markers.
        """
        self.enable_dehyphenation = enable_dehyphenation
        self.mask_urls = mask_urls
        self.mask_emails = mask_emails
        self.strip_citations = strip_citations
        self.strip_headers_footers = strip_headers_footers

    def _normalize_unicode(self, text: str) -> str:
        """Applies Unicode NFKC normalization and resolves ligatures and zero-width chars.

        Args:
            text: Raw input string.

        Returns:
            NFKC normalized text with canonical characters.
        """
        if not text:
            return ""

        # Normalize line endings to standard UNIX newline
        normalized = text.replace("\r\n", "\n").replace("\r", "\n")

        # Decompose and recompose using Unicode Normalization Form KC
        normalized = unicodedata.normalize("NFKC", normalized)

        # Expand explicit ligatures and purge zero-width characters
        for char, replacement in LIGATURE_MAP.items():
            if char in normalized:
                normalized = normalized.replace(char, replacement)

        return normalized

    def clean(self, raw_text: str) -> str:
        """Executes the sanitization pipeline across all enabled stages deterministically.

        Args:
            raw_text: Raw string extracted from document.

        Returns:
            Dense, clean, normalized UTF-8 string.
        """
        if not raw_text or not raw_text.strip():
            return ""

        # Stage 1: Unicode Normalization (NFKC & Ligatures)
        text = self._normalize_unicode(raw_text)

        return text
