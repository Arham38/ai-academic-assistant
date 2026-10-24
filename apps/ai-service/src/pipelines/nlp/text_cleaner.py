"""Multi-stage, configurable NLP text cleaning pipeline for academic documents."""

import logging
import unicodedata

from src.pipelines.nlp.cleaner_rules import (
    CITATION_BRACKET_REGEX,
    CONTROL_CHAR_REGEX,
    EMAIL_REGEX,
    HORIZONTAL_WHITESPACE_REGEX,
    HYPHEN_REGEX,
    LIGATURE_MAP,
    MULTIPLE_NEWLINES_REGEX,
    PAGE_NUMBER_REGEX,
    URL_REGEX,
)

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

    def _dehyphenate(self, text: str) -> str:
        """Merges hyphenated words broken across line wraps.

        Args:
            text: Normalized text containing potential hyphenated breaks.

        Returns:
            Reconnected text without line-wrap hyphens.
        """
        if not text:
            return ""
        return HYPHEN_REGEX.sub(r"\1\2", text)

    def _remove_artifacts(self, text: str) -> str:
        """Purges control characters, standalone page numbers, and applies optional masks.

        Args:
            text: Input text string.

        Returns:
            Text stripped of non-printable artifacts, page numbers, or masked entities.
        """
        if not text:
            return ""

        # Purge null bytes and non-printable control characters
        cleaned = CONTROL_CHAR_REGEX.sub("", text)

        # Remove standalone page numbers or "Page X of Y" lines if enabled
        if self.strip_headers_footers:
            cleaned = PAGE_NUMBER_REGEX.sub("", cleaned)

        # Mask URLs if enabled
        if self.mask_urls:
            cleaned = URL_REGEX.sub("<URL>", cleaned)

        # Mask emails if enabled
        if self.mask_emails:
            cleaned = EMAIL_REGEX.sub("<EMAIL>", cleaned)

        # Strip citation brackets if enabled
        if self.strip_citations:
            cleaned = CITATION_BRACKET_REGEX.sub("", cleaned)

        return cleaned

    def _normalize_whitespace(self, text: str) -> str:
        """Collapses horizontal spaces per line and condenses 3+ newlines to double newlines.

        Crucially preserves double newlines (\\n\\n) as paragraph chunking boundaries.

        Args:
            text: Input text string.

        Returns:
            Text with standardized whitespace.
        """
        if not text:
            return ""

        # Normalize horizontal whitespace per line and strip trailing spaces
        lines = [
            HORIZONTAL_WHITESPACE_REGEX.sub(" ", line).strip()
            for line in text.split("\n")
        ]
        text_lines = "\n".join(lines)

        # Collapse excessive consecutive line breaks (3+ down to 2)
        collapsed = MULTIPLE_NEWLINES_REGEX.sub("\n\n", text_lines)

        return collapsed.strip()

    def clean(self, raw_text: str) -> str:
        """Executes the sanitization pipeline across all enabled stages deterministically.

        Stages:
        1. Check empty/whitespace guard
        2. Unicode Normalization (NFKC & Ligatures)
        3. De-hyphenation (if enabled)
        4. Artifact Purging (Control chars, page headers/footers, optional masking)
        5. Whitespace Standardization (Collapsing horizontal spaces, condensing 3+ newlines to 2)

        Guarantees idempotency: clean(clean(text)) == clean(text).

        Args:
            raw_text: Raw string extracted from document.

        Returns:
            Dense, clean, normalized UTF-8 string.
        """
        if not raw_text or not raw_text.strip():
            return ""

        # Stage 1: Unicode Normalization (NFKC & Ligatures)
        text = self._normalize_unicode(raw_text)

        # Stage 2: De-hyphenation (optional, enabled by default)
        if self.enable_dehyphenation:
            text = self._dehyphenate(text)

        # Stage 3: Artifact Purging (Control characters, page numbers, masking)
        text = self._remove_artifacts(text)

        # Stage 4: Whitespace Standardization (Preserving \n\n boundaries)
        text = self._normalize_whitespace(text)

        return text
