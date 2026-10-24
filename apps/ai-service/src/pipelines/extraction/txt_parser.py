"""Plain text (.txt) document extractor for basic text ingestion."""

import os

from src.core.exceptions import EmptyDocumentError, ExtractionError
from src.pipelines.extraction.parser_interface import BaseParser


def extract_text_from_txt(filepath: str) -> tuple[str, int | None, int]:
    """Extracts text content from a plain text file trying multiple standard encodings."""
    if not os.path.isfile(filepath):
        raise FileNotFoundError(f"TXT file not found at: {filepath}")

    encodings = ["utf-8", "latin-1", "cp1252"]
    text = ""
    for enc in encodings:
        try:
            with open(filepath, encoding=enc) as f:
                text = f.read()
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ExtractionError(
            f"Failed to decode text file with supported encodings: {filepath}"
        )

    if not text.strip():
        raise EmptyDocumentError(
            f"TXT document contains no text: {os.path.basename(filepath)}"
        )

    clean_text = text.strip()
    return clean_text, None, len(clean_text.split())


class TxtParser(BaseParser):
    """Plain text (.txt) parser strategy."""

    def extract(self, filepath: str) -> tuple[str, int | None, int]:
        """Extracts text content and word count from a text file."""
        return extract_text_from_txt(filepath)
