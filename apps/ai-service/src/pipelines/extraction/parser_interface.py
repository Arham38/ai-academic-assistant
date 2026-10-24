"""Strategy contract and interface for polymorphic document extraction."""

from abc import ABC, abstractmethod


class BaseParser(ABC):
    """Abstract base class establishing the contract for document parsers."""

    @abstractmethod
    def extract(self, filepath: str) -> tuple[str, int | None, int]:
        """Extracts text content and metadata from the specified physical file.

        Args:
            filepath: Absolute or validated local path to the physical file.

        Returns:
            Tuple of:
            - raw_text: Unsanitized extracted text content.
            - page_count: Total pages if fixed-page format (e.g. PDF), or None for dynamic flow formats (e.g. DOCX).
            - approximate_word_count: Approximate count of extracted words.
        """
        pass
