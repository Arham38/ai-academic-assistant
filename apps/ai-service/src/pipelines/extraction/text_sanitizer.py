"""Robust text sanitization module for parsed academic documents."""

import re

# Common typographical ligatures to ASCII expansions
LIGATURE_MAP = {
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬀ": "ff",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "\xa0": " ",  # Non-breaking space
    "\u200b": "",  # Zero-width space
    "\u200c": "",  # Zero-width non-joiner
    "\u200d": "",  # Zero-width joiner
    "\ufeff": "",  # Byte order mark (BOM)
}

# Regex to strip null bytes and other non-printable ASCII control characters (preserving \t, \n, \r)
CONTROL_CHAR_REGEX = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

# Regex to resolve hyphenated words split across line breaks: e.g. "com-\nputer" -> "computer"
HYPHENATED_LINE_BREAK_REGEX = re.compile(r"(\b[a-zA-Z]+)-\n\s*([a-zA-Z]+\b)")

# Regex to strip standalone page numbers or "Page X of Y" artifacts
PAGE_NUMBER_REGEX = re.compile(
    r"(?m)^\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|\d+)\s*$\n?",
    re.IGNORECASE,
)


def sanitize_text(raw_text: str) -> str:
    """Sanitizes raw extracted document text for AI embeddings and evaluation.

    Applies the following transformations:
    1. Removes null bytes and non-printable control characters.
    2. Expands ligatures and removes zero-width invisible characters.
    3. Reconnects hyphenated words broken across line wraps.
    4. Removes isolated page number header/footer lines.
    5. Normalizes whitespace and collapses 3+ consecutive line breaks to 2.

    Args:
        raw_text: Unprocessed text directly from the PDF extractor.

    Returns:
        Cleaned, normalized, and dense UTF-8 text string.
    """
    if not raw_text:
        return ""

    # 1. Normalize line endings
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")

    # 2. Strip null bytes and non-printable control characters
    text = CONTROL_CHAR_REGEX.sub("", text)

    # 3. Expand ligatures and remove zero-width non-printable characters
    for char, replacement in LIGATURE_MAP.items():
        if char in text:
            text = text.replace(char, replacement)

    # 4. Resolve hyphenated words across line wraps
    text = HYPHENATED_LINE_BREAK_REGEX.sub(r"\1\2", text)

    # 5. Remove standalone page number headers and footers
    text = PAGE_NUMBER_REGEX.sub("", text)

    # 6. Normalize horizontal whitespace per line and strip trailing spaces
    cleaned_lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(cleaned_lines)

    # 7. Collapse excessive consecutive line breaks (3 or more down to 2)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()
