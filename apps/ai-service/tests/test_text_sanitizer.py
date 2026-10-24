"""Unit and property tests for the NLP TextCleaner pipeline and text sanitization module."""

import pytest
from src.pipelines.extraction.text_sanitizer import sanitize_text
from src.pipelines.nlp.text_cleaner import TextCleaner


def test_sanitize_empty_and_whitespace():
    """Verify empty or whitespace strings return empty string."""
    assert sanitize_text("") == ""
    assert sanitize_text("   \n\t\n   ") == ""
    cleaner = TextCleaner()
    assert cleaner.clean("") == ""
    assert cleaner.clean("   \t  \n  ") == ""


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


def test_nfkc_unicode_normalization_comprehensive():
    """Verify NFKC normalization resolves full-width characters and compatibility forms."""
    cleaner = TextCleaner()
    # Full-width ASCII: "Ｈｅｌｌｏ　Ｗｏｒｌｄ" -> "Hello World"
    full_width = "Ｈｅｌｌｏ Ｗｏｒｌｄ"
    assert cleaner.clean(full_width) == "Hello World"

    # Ligatures: \ufb01 (fi), \ufb02 (fl), \ufb03 (ffi), \ufb04 (ffl)
    ligatures_sample = "The \ufb01nal \ufb02oat with \ufb03cient \ufb04ing."
    assert cleaner.clean(ligatures_sample) == "The final float with fficient ffling."


def test_sanitize_hyphenated_line_breaks():
    """Verify words hyphenated across line breaks are re-joined properly."""
    raw = "We implemented a distri-\nbuted microservice architec-\nture for processing."
    expected = "We implemented a distributed microservice architecture for processing."
    assert sanitize_text(raw) == expected


def test_dehyphenation_toggle():
    """Verify de-hyphenation can be disabled for source code or raw data."""
    raw = "identifier-\nname in code."
    # Enabled by default
    assert (
        TextCleaner(enable_dehyphenation=True).clean(raw) == "identifiername in code."
    )
    # Disabled for raw plain text / code
    assert (
        TextCleaner(enable_dehyphenation=False).clean(raw)
        == "identifier-\nname in code."
    )


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


def test_url_masking():
    """Verify web URLs are masked when mask_urls is enabled."""
    raw = (
        "See documentation at https://example.com/docs or www.example.org for details."
    )
    # Default: preserved
    assert "https://example.com/docs" in TextCleaner(mask_urls=False).clean(raw)
    # Masked
    masked = TextCleaner(mask_urls=True).clean(raw)
    assert "https://example.com/docs" not in masked
    assert "www.example.org" not in masked
    assert masked == "See documentation at <URL> or <URL> for details."


def test_email_masking():
    """Verify email addresses are masked when mask_emails is enabled."""
    raw = "Direct inquiries to author.smith@university.edu or coauthor@lab.org."
    # Default: preserved
    assert "author.smith@university.edu" in TextCleaner(mask_emails=False).clean(raw)
    # Masked
    masked = TextCleaner(mask_emails=True).clean(raw)
    assert "author.smith@university.edu" not in masked
    assert "coauthor@lab.org" not in masked
    assert masked == "Direct inquiries to <EMAIL> or <EMAIL>."


def test_citation_bracket_stripping():
    """Verify academic citation brackets can be stripped when strip_citations is enabled."""
    raw = "Prior benchmarks [1] and neural architectures [2, 3] demonstrate efficiency."
    # Default: citations preserved
    assert "[1]" in TextCleaner(strip_citations=False).clean(raw)
    assert "[2, 3]" in TextCleaner(strip_citations=False).clean(raw)
    # Stripped
    stripped = TextCleaner(strip_citations=True).clean(raw)
    assert "[1]" not in stripped
    assert "[2, 3]" not in stripped
    assert (
        "Prior benchmarks and neural architectures demonstrate efficiency."
        in stripped.replace("  ", " ")
    )


def test_sanitize_excessive_line_breaks_and_spaces():
    """Verify 3+ linebreaks are collapsed to 2 and horizontal spaces normalized."""
    raw = "Paragraph   one  has    spaces.\n\n\n\n\nParagraph   two.\n\n\n\nParagraph three."
    expected = "Paragraph one has spaces.\n\nParagraph two.\n\nParagraph three."
    assert sanitize_text(raw) == expected


def test_paragraph_boundaries_strictly_preserved():
    """Verify paragraph boundaries (\\n\\n) are strictly preserved across multiple stages."""
    raw = "Paragraph Alpha.\n\nParagraph Beta.\n\n\n\nParagraph Gamma."
    expected = "Paragraph Alpha.\n\nParagraph Beta.\n\nParagraph Gamma."
    cleaner = TextCleaner()
    assert cleaner.clean(raw) == expected


def test_windows_crlf_normalization():
    """Verify CRLF (\\r\\n) and classic Mac (\\r) line endings are normalized to UNIX (\\n)."""
    raw = "First line.\r\n\r\nSecond line.\rThird line."
    cleaner = TextCleaner()
    expected = "First line.\n\nSecond line.\nThird line."
    assert cleaner.clean(raw) == expected


def test_preserves_valid_academic_content():
    """Verify equations, citations, and standard punctuation remain intact."""
    raw = "According to Smith et al. (2024), E = mc^2 holds universally under condition [1]."
    assert sanitize_text(raw) == raw


@pytest.mark.parametrize(
    "dirty_input",
    [
        "Simple clean sentence.",
        "The ﬁrst efﬁcient ﬂow.\n\nPage 1 of 5\n\nParagraph   two   with    spaces.",
        "Aca-\ndemic pa-\nper with https://arxiv.org/abs/1234 and author@uni.edu.",
        "Equation: f(x) = x^2 + 2x + 1.\n\n\n\nResult [1, 2] holds.",
        "Line with trailing spaces     \nAnother line.\r\n\r\n\r\n\r\nThird line.",
    ],
)
def test_cleaner_idempotency(dirty_input: str):
    """Verify idempotency property: clean(clean(text)) == clean(text) holds universally."""
    cleaner = TextCleaner(mask_urls=True, mask_emails=True)
    first_pass = cleaner.clean(dirty_input)
    second_pass = cleaner.clean(first_pass)
    third_pass = cleaner.clean(second_pass)

    assert first_pass == second_pass, (
        f"First and second pass mismatch on: {dirty_input!r}"
    )
    assert second_pass == third_pass, (
        f"Second and third pass mismatch on: {dirty_input!r}"
    )
