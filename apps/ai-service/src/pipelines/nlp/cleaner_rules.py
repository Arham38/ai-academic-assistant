"""Pre-compiled regular expressions and transformation maps for NLP text cleaning."""

import re

# Typographical ligatures and non-printable zero-width characters
LIGATURE_MAP: dict[str, str] = {
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

# Regex to resolve hyphenated words split across line breaks: e.g. "aca-\ndemic" -> "academic"
HYPHEN_REGEX = re.compile(r"(\b[a-zA-Z]+)-\n\s*([a-zA-Z]+\b)")

# Regex to collapse consecutive horizontal whitespace (spaces, tabs) per line
HORIZONTAL_WHITESPACE_REGEX = re.compile(r"[ \t]+")

# Regex to collapse 3 or more consecutive newlines down to exactly 2 (preserving paragraph breaks)
MULTIPLE_NEWLINES_REGEX = re.compile(r"\n{3,}")

# Regex to strip standalone page numbers or "Page X of Y" lines
PAGE_NUMBER_REGEX = re.compile(
    r"(?m)^\s*(?:Page\s+\d+(?:\s+of\s+\d+)?|\d+)\s*$\n?",
    re.IGNORECASE,
)

# Regex to strip inline page footer/header artifacts (e.g., "Page 4.", "Page 12")
PAGE_ARTIFACT_REGEX = re.compile(r"(?i)\bPage\s+\d+\.?", re.IGNORECASE)

# Regex to match URLs (http, https, www)
URL_REGEX = re.compile(r"https?://\S+|www\.\S+")

# Regex to match RFC 5322 standard email addresses
EMAIL_REGEX = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")

# Regex to detect academic citation brackets: e.g. [1], [1, 2], [1-3], [12–15]
CITATION_BRACKET_REGEX = re.compile(r"\[\d+(?:[,\s–-]+\d+)*\]")
