"""Unit tests for the TXT extraction pipeline and multi-stage encoding fallback cascade."""

import os
import tempfile

import pytest
from src.core.exceptions import (
    EmptyDocumentError,
    FileNotFoundTXTError,
)
from src.pipelines.extraction.txt_parser import (
    TxtParser,
    extract_text_from_txt,
)


def test_txt_file_not_found():
    """Verify FileNotFoundTXTError is raised when file does not exist."""
    with pytest.raises(FileNotFoundTXTError):
        extract_text_from_txt("non_existent_dir/missing_notes.txt")


def test_txt_empty_document():
    """Verify EmptyDocumentError is raised when file contains only whitespace or is empty."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        empty_file = os.path.join(tmp_dir, "empty.txt")
        with open(empty_file, "w", encoding="utf-8") as f:
            f.write("   \n\t\n   ")

        with pytest.raises(EmptyDocumentError):
            extract_text_from_txt(empty_file)


def test_txt_stage1_utf8_strict_success():
    """Verify Stage 1 extracts standard UTF-8 text files cleanly."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "research.txt")
        content = (
            "Title: Modern Transformer Architectures\n\n"
            "Author: Dr. Alan Turing\n"
            "Summary: Investigating attention mechanisms in academic document parsing."
        )
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(content)

        text, page_count, word_count = extract_text_from_txt(txt_path)

        assert page_count is None
        assert "Modern Transformer Architectures" in text
        assert "Dr. Alan Turing" in text
        assert word_count > 10


def test_txt_stage2_windows1252_fallback():
    """Verify Stage 2 catches UTF-8 UnicodeDecodeError and decodes Windows-1252."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "win1252.txt")
        # Byte \x93 is left smart quote, \x94 is right smart quote, \x96 is en-dash, \x80 is euro sign
        # These raw bytes trigger strict UTF-8 UnicodeDecodeError
        raw_bytes = b"Legacy report: \x93Section 1\x94 \x96 fee is \x80150."
        with open(txt_path, "wb") as f:
            f.write(raw_bytes)

        text, page_count, word_count = extract_text_from_txt(txt_path)

        assert page_count is None
        assert "Legacy report:" in text
        assert "Section 1" in text
        assert "150" in text
        assert word_count > 4


def test_txt_stage3_lossless_coercion_replace():
    """Verify Stage 3 coerces invalid bytes with replacement characters rather than crashing."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "coerced.txt")
        # Byte sequence with invalid start bytes mixed with valid text
        raw_bytes = (
            b"Valid beginning text\xff\xfe\x00corrupted stream\x81\x8d\x90end text"
        )
        with open(txt_path, "wb") as f:
            f.write(raw_bytes)

        text, page_count, word_count = extract_text_from_txt(txt_path)

        assert page_count is None
        assert "Valid beginning text" in text
        assert "end text" in text
        assert word_count > 0


def test_txt_parser_strategy_interface():
    """Verify TxtParser implements the BaseParser contract."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        txt_path = os.path.join(tmp_dir, "strategy_test.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write("Strategy Pattern Plain Text Ingestion.")

        parser = TxtParser()
        text, page_count, word_count = parser.extract(txt_path)

        assert page_count is None
        assert text == "Strategy Pattern Plain Text Ingestion."
        assert word_count == 5


def test_txt_static_fixtures():
    """Verify extraction against static fixture files in tests/fixtures directory."""
    fixtures_dir = os.path.join(os.path.dirname(__file__), "fixtures")

    # 1. UTF-8 static fixture
    utf8_path = os.path.join(fixtures_dir, "sample_research_notes.txt")
    assert os.path.isfile(utf8_path)
    parser = TxtParser()
    text_utf8, _, words_utf8 = parser.extract(utf8_path)
    assert "Empirical Evaluation of RAG Architectures" in text_utf8
    assert words_utf8 > 5

    # 2. Windows-1252 static fixture
    win_path = os.path.join(fixtures_dir, "sample_windows1252.txt")
    assert os.path.isfile(win_path)
    text_win, _, words_win = parser.extract(win_path)
    assert "Legacy notes with smart quotes" in text_win
    assert words_win > 5
