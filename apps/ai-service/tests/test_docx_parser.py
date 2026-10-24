"""Unit tests for the DOCX extraction pipeline."""

import os
import tempfile

import docx
import pytest
from src.core.exceptions import (
    CorruptedDOCXError,
    EmptyDocumentError,
    FileNotFoundDOCXError,
)
from src.pipelines.extraction.docx_parser import (
    DocxParser,
    extract_text_from_docx,
)


def create_sample_docx(
    filepath: str,
    paragraphs: list[str],
    table_data: list[list[str]] | None = None,
    merge_first_row: bool = False,
) -> str:
    """Helper creating a sample .docx file with paragraphs and optional tables."""
    doc = docx.Document()

    for p in paragraphs:
        doc.add_paragraph(p)

    if table_data:
        rows = len(table_data)
        cols = len(table_data[0]) if rows > 0 else 0
        table = doc.add_table(rows=rows, cols=cols)

        if merge_first_row and cols >= 2:
            table.rows[0].cells[0].merge(table.rows[0].cells[1])

        for r_idx, row in enumerate(table_data):
            for c_idx, val in enumerate(row):
                table.rows[r_idx].cells[c_idx].text = val

    doc.save(filepath)
    return filepath


def test_docx_file_not_found():
    """Verify FileNotFoundDOCXError is raised when file does not exist."""
    with pytest.raises(FileNotFoundDOCXError):
        extract_text_from_docx("non_existent_folder/fake_paper.docx")


def test_docx_corrupted_file():
    """Verify CorruptedDOCXError is raised for non-zip or corrupted files."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        fake_docx = os.path.join(tmp_dir, "corrupted.docx")
        with open(fake_docx, "wb") as f:
            f.write(b"NOT A REAL ZIP ARCHIVE FOR OPENXML")

        with pytest.raises(CorruptedDOCXError):
            extract_text_from_docx(fake_docx)


def test_docx_empty_document():
    """Verify EmptyDocumentError is raised when DOCX has no readable text."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        empty_docx = os.path.join(tmp_dir, "empty.docx")
        doc = docx.Document()
        doc.save(empty_docx)

        with pytest.raises(EmptyDocumentError):
            extract_text_from_docx(empty_docx)


def test_docx_paragraphs_and_headings_extraction():
    """Verify paragraphs and headings are extracted sequentially."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        sample_path = os.path.join(tmp_dir, "academic_sample.docx")
        create_sample_docx(
            filepath=sample_path,
            paragraphs=[
                "Deep Learning for Natural Language Processing",
                "Abstract: This paper presents an empirical analysis of transformer architectures.",
                "1. Introduction",
                "Transformer models have redefined sequential representation learning.",
            ],
        )

        text, page_count, word_count = extract_text_from_docx(sample_path)

        assert page_count is None
        assert "Deep Learning for Natural Language Processing" in text
        assert "Transformer models have redefined" in text
        assert word_count > 15


def test_docx_table_parsing_and_merged_cells():
    """Verify table rows and cells are extracted and merged cells deduplicated."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        sample_path = os.path.join(tmp_dir, "table_sample.docx")
        create_sample_docx(
            filepath=sample_path,
            paragraphs=["Experimental Results Section"],
            table_data=[
                ["Model", "F1-Score", "Accuracy"],
                ["BERT-Base", "91.2", "92.5%"],
                ["RoBERTa", "93.4", "94.1%"],
            ],
        )

        text, page_count, word_count = extract_text_from_docx(sample_path)

        assert page_count is None
        assert "Experimental Results Section" in text
        assert "Model | F1-Score | Accuracy" in text
        assert "BERT-Base | 91.2 | 92.5%" in text
        assert "RoBERTa | 93.4 | 94.1%" in text
        assert word_count > 10


def test_docx_parser_strategy_interface():
    """Verify DocxParser implements BaseParser extract contract."""
    with tempfile.TemporaryDirectory() as tmp_dir:
        sample_path = os.path.join(tmp_dir, "strategy_sample.docx")
        create_sample_docx(
            filepath=sample_path,
            paragraphs=["Strategy Pattern Test Paragraph."],
        )

        parser = DocxParser()
        text, page_count, word_count = parser.extract(sample_path)

        assert page_count is None
        assert "Strategy Pattern Test Paragraph." in text
        assert word_count == 4


def test_docx_fixture_file_extraction():
    """Verify extraction against static fixture file in tests/fixtures directory."""
    fixture_path = os.path.join(
        os.path.dirname(__file__), "fixtures", "sample_academic_paper.docx"
    )
    assert os.path.isfile(fixture_path)

    parser = DocxParser()
    text, page_count, word_count = parser.extract(fixture_path)

    assert page_count is None
    assert "Academic Research Paper Fixture" in text
    assert "FastAPI Microservice | Operational" in text
    assert word_count > 10
