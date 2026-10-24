"""Unit tests for PyMuPDF extraction pipeline."""

import os
import tempfile

import pymupdf
import pytest
from src.core.exceptions import (
    CorruptedPDFError,
    EmptyPDFError,
    EncryptedPDFError,
    FileNotFoundPDFError,
)
from src.pipelines.extraction.pdf_parser import (
    extract_text_from_pdf,
    sort_blocks_for_academic_reading_order,
)


def create_dummy_pdf(
    file_path: str,
    pages_content: list[list[tuple[float, float, str]]],
    is_encrypted: bool = False,
    password: str = "secret",
) -> str:
    """Helper creating a PDF file at target path with specific text coordinates."""
    doc = pymupdf.open()
    for page_items in pages_content:
        page = doc.new_page(width=600, height=800)
        for x, y, text in page_items:
            page.insert_text((x, y), text, fontsize=11)

    if is_encrypted:
        doc.save(
            file_path,
            encryption=pymupdf.PDF_ENCRYPT_AES_256,
            owner_pw=password,
            user_pw=password,
        )
    else:
        doc.save(file_path)
    doc.close()
    return file_path


def test_extract_non_existent_file():
    """Verify FileNotFoundPDFError is raised when file does not exist."""
    with pytest.raises(FileNotFoundPDFError):
        extract_text_from_pdf("non_existent_path/fake_document.pdf")


def test_extract_corrupted_file():
    """Verify CorruptedPDFError is raised for invalid/corrupted PDF content."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        corrupted_path = os.path.join(tmp_dir, "corrupted.pdf")
        with open(corrupted_path, "wb") as f:
            f.write(b"NOT A REAL PDF FILE HEADER")

        with pytest.raises(CorruptedPDFError):
            extract_text_from_pdf(corrupted_path)


def test_extract_encrypted_pdf():
    """Verify EncryptedPDFError is raised for password-protected PDF."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = os.path.join(tmp_dir, "encrypted.pdf")
        create_dummy_pdf(
            file_path=pdf_path,
            pages_content=[[(50, 100, "Secret academic findings")]],
            is_encrypted=True,
            password="test-password",
        )
        with pytest.raises(EncryptedPDFError):
            extract_text_from_pdf(pdf_path)


def test_extract_empty_pdf_no_text():
    """Verify EmptyPDFError is raised when PDF has no text blocks."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = os.path.join(tmp_dir, "empty.pdf")
        doc = pymupdf.open()
        doc.new_page()  # blank page
        doc.save(pdf_path)
        doc.close()

        with pytest.raises(EmptyPDFError):
            extract_text_from_pdf(pdf_path)


def test_extract_single_column_pdf():
    """Verify extraction of standard single-column document."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        pdf_path = os.path.join(tmp_dir, "single_col.pdf")
        create_dummy_pdf(
            file_path=pdf_path,
            pages_content=[
                [
                    (50, 100, "Title of Research Paper"),
                    (50, 150, "Introduction paragraph explaining the background."),
                    (50, 200, "Methodology section outlining experimental setup."),
                ]
            ],
        )
        text, page_count, word_count = extract_text_from_pdf(pdf_path)
        assert page_count == 1
        assert "Title of Research Paper" in text
        assert "Methodology section" in text
        assert word_count > 10


def test_sort_blocks_two_column_academic_order():
    """Verify reading order preserves Title banner -> Left Column -> Right Column."""
    page_width = 600.0

    # Simulate PyMuPDF blocks: (x0, y0, x1, y1, text, block_no, block_type)
    blocks = [
        # Right column paragraph 1 (y0=150)
        (350, 150, 550, 200, "Right Column Line 1", 0, 0),
        # Left column paragraph 1 (y0=150)
        (50, 150, 250, 200, "Left Column Line 1", 1, 0),
        # Title spanning header (y0=50)
        (50, 50, 550, 80, "Academic Paper Title Across Columns", 2, 0),
        # Left column paragraph 2 (y0=220)
        (50, 220, 250, 270, "Left Column Line 2", 3, 0),
        # Right column paragraph 2 (y0=220)
        (350, 220, 550, 270, "Right Column Line 2", 4, 0),
    ]

    result = sort_blocks_for_academic_reading_order(blocks, page_width)

    assert result[0] == "Academic Paper Title Across Columns"
    assert result[1] == "Left Column Line 1"
    assert result[2] == "Left Column Line 2"
    assert result[3] == "Right Column Line 1"
    assert result[4] == "Right Column Line 2"
