"""High-fidelity PDF text extraction pipeline with academic multi-column layout support."""

import logging
import os

import pymupdf

from src.core.exceptions import (
    CorruptedPDFError,
    EmptyPDFError,
    EncryptedPDFError,
    FileNotFoundPDFError,
)

logger = logging.getLogger(__name__)


def sort_blocks_for_academic_reading_order(
    blocks: list[tuple],
    page_width: float,
) -> list[str]:
    """Sorts PyMuPDF text blocks respecting two-column academic layouts and spanning banners.

    Each block is a tuple: (x0, y0, x1, y1, text, block_no, block_type)
    block_type 0 = text, 1 = image.
    """
    # Filter only text blocks with non-empty content
    text_blocks = [
        b for b in blocks if len(b) > 4 and b[4].strip() and (len(b) <= 6 or b[6] == 0)
    ]

    if not text_blocks:
        return []

    # Determine if the page exhibits a two-column academic layout
    mid_x = page_width / 2.0
    gutter_margin = page_width * 0.05  # 5% gutter margin allowance

    has_left_col = False
    has_right_col = False

    for b in text_blocks:
        x0, _, x1, _ = b[0], b[1], b[2], b[3]
        block_w = x1 - x0
        # If block is narrow enough to be a column and positioned on the left or right
        if block_w < page_width * 0.65:
            if x1 <= mid_x + gutter_margin:
                has_left_col = True
            elif x0 >= mid_x - gutter_margin:
                has_right_col = True

    # If both distinct columns exist, partition into Header/Banner, Left, Right, Footer
    if has_left_col and has_right_col:
        # Find column boundaries vertically
        col_blocks = [
            b
            for b in text_blocks
            if (b[2] - b[0]) < page_width * 0.65
            and ((b[2] <= mid_x + gutter_margin) or (b[0] >= mid_x - gutter_margin))
        ]
        min_col_y = min(b[1] for b in col_blocks)

        header_blocks = []
        left_blocks = []
        right_blocks = []
        footer_blocks = []

        for b in text_blocks:
            x0, y0, x1, y1 = b[0], b[1], b[2], b[3]
            block_w = x1 - x0

            # Banner spanning across columns
            if block_w >= page_width * 0.65:
                if y1 <= min_col_y + 10:
                    header_blocks.append(b)
                else:
                    footer_blocks.append(b)
            # Left column
            elif x1 <= mid_x + gutter_margin:
                left_blocks.append(b)
            # Right column
            elif x0 >= mid_x - gutter_margin:
                right_blocks.append(b)
            else:
                # Straddling blocks
                if y0 < min_col_y:
                    header_blocks.append(b)
                else:
                    footer_blocks.append(b)

        # Sort each section vertically top-to-bottom
        header_blocks.sort(key=lambda b: (b[1], b[0]))
        left_blocks.sort(key=lambda b: (b[1], b[0]))
        right_blocks.sort(key=lambda b: (b[1], b[0]))
        footer_blocks.sort(key=lambda b: (b[1], b[0]))

        ordered_blocks = header_blocks + left_blocks + right_blocks + footer_blocks
    else:
        # Standard single-column flow: top-to-bottom, left-to-right
        ordered_blocks = sorted(text_blocks, key=lambda b: (b[1], b[0]))

    return [b[4].strip() for b in ordered_blocks if b[4].strip()]


def extract_text_from_pdf(filepath: str) -> tuple[str, int, int]:
    """Synchronous CPU-bound PDF text extractor using PyMuPDF.

    Args:
        filepath: Absolute or validated relative path to the physical PDF file.

    Returns:
        Tuple of (raw_extracted_text, total_pages, approximate_word_count).

    Raises:
        FileNotFoundPDFError: When the file does not exist on disk.
        CorruptedPDFError: When the file cannot be opened or parsed.
        EncryptedPDFError: When the document is encrypted or requires password.
        EmptyPDFError: When the document contains no pages or extractable text.
    """
    if not os.path.isfile(filepath):
        raise FileNotFoundPDFError(f"PDF document file not found at: {filepath}")

    try:
        doc = pymupdf.open(filepath)
    except Exception as exc:
        raise CorruptedPDFError(f"Failed to open PDF document: {exc}") from exc

    with doc:
        if doc.is_encrypted and doc.needs_pass:
            raise EncryptedPDFError(
                f"PDF document is password-protected or encrypted: {os.path.basename(filepath)}"
            )

        page_count = len(doc)
        if page_count == 0:
            raise EmptyPDFError(
                f"PDF document contains 0 pages: {os.path.basename(filepath)}"
            )

        page_texts: list[str] = []

        for page_index in range(page_count):
            try:
                page = doc[page_index]
                blocks = page.get_text("blocks")
                ordered_block_texts = sort_blocks_for_academic_reading_order(
                    blocks=blocks,
                    page_width=page.rect.width,
                )
                if ordered_block_texts:
                    page_texts.append("\n\n".join(ordered_block_texts))
            except Exception as page_err:
                logger.warning(
                    f"Warning: Failed parsing page {page_index + 1} of {filepath}: {page_err}"
                )

        if not page_texts:
            raise EmptyPDFError(
                f"PDF document contains no extractable text: {os.path.basename(filepath)}"
            )

        full_text = "\n\n".join(page_texts).strip()
        word_count = len(full_text.split())

        return full_text, page_count, word_count
