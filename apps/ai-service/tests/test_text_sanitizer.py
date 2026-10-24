"""Unit tests for the regex text sanitization module."""

from src.pipelines.extraction.text_sanitizer import sanitize_text


def test_sanitize_empty_and_whitespace():
    """Verify empty or whitespace strings return empty string."""
    assert sanitize_text("") == ""
    assert sanitize_text("   \n\t\n   ") == ""


def test_sanitize_null_bytes_and_control_chars():
    """Verify null bytes and non-printable control characters are purged."""
    raw = "Academic\x00 research\x07 paper\x1f with\x0b null\x0c bytes."
    expected = "Academic research paper with null bytes."
    assert sanitize_text(raw) == expected


def test_sanitize_ligatures_and_zero_width_chars():
    """Verify unicode ligatures expand and zero-width characters disappear."""
    raw = "The ﬁrst efﬁcient ﬂow and diﬀerential classiﬁer \u200b\ufefftest."
    expected = "The first efficient flow and differential classifier test."
    assert sanitize_text(raw) == expected


def test_sanitize_hyphenated_line_breaks():
    """Verify words hyphenated across line breaks are re-joined properly."""
    raw = "We implemented a distri-\nbuted microservice architec-\nture for processing."
    expected = "We implemented a distributed microservice architecture for processing."
    assert sanitize_text(raw) == expected


def test_sanitize_page_number_artifacts():
    """Verify isolated page numbers and 'Page X of Y' markers are removed."""
    raw = (
        "Introduction to Quantum Algorithms.\n\n"
        "Page 1 of 12\n\n"
        "Section 1.1: Quantum Entanglement.\n\n"
        "2\n\n"
        "Section 1.2: Superposition."
    )
    cleaned = sanitize_text(raw)
    assert "Page 1 of 12" not in cleaned
    assert "\n2\n" not in cleaned
    assert "Introduction to Quantum Algorithms." in cleaned
    assert "Section 1.1: Quantum Entanglement." in cleaned
    assert "Section 1.2: Superposition." in cleaned


def test_sanitize_excessive_line_breaks_and_spaces():
    """Verify 3+ linebreaks are collapsed to 2 and horizontal spaces normalized."""
    raw = "Paragraph   one  has    spaces.\n\n\n\n\nParagraph   two.\n\n\n\nParagraph three."
    expected = "Paragraph one has spaces.\n\nParagraph two.\n\nParagraph three."
    assert sanitize_text(raw) == expected


def test_preserves_valid_academic_content():
    """Verify equations, citations, and standard punctuation remain intact."""
    raw = "According to Smith et al. (2024), E = mc^2 holds universally under condition [1]."
    assert sanitize_text(raw) == raw
