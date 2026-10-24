"""Heuristic metadata extraction module for academic and general text documents."""

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

# Pre-compiled regular expressions for academic section anchors
ABSTRACT_START_REGEX = re.compile(
    r"(?mi)(?:^|\n\n|\n)\s*(?:Abstract|ABSTRACT)\b\s*[:.\-—]?\s*"
)

ABSTRACT_END_REGEX = re.compile(
    r"(?m)(?:\n\n|\n)\s*(?:(?:\d+\.?\s*)?Introduction\b|Keywords?\b|Index Terms?\b|Background\b|1\.\s+)",
    re.IGNORECASE,
)

KEYWORDS_REGEX = re.compile(
    r"(?mi)(?:^|\n)\s*(?:Keywords?|Index Terms?|Key Words?)\b\s*[:.\-—]?\s*([^\n\r]+)"
)

AUTHOR_EXPLICIT_REGEX = re.compile(r"(?mi)^\s*(?:Authors?|By)\s*[:.\-—]?\s*(.+)$")

# Institutional and non-name keyword filters to avoid false positives during author parsing
INSTITUTION_FILTER_WORDS = {
    "university",
    "department",
    "dept",
    "institute",
    "institution",
    "laboratory",
    "lab",
    "college",
    "school",
    "faculty",
    "center",
    "centre",
    "hospital",
    "corporation",
    "corp",
    "inc",
    "ltd",
    "llc",
    "gmbh",
    "email",
    "abstract",
    "keywords",
    "introduction",
    "arxiv",
    "doi",
}


class MetadataExtractor:
    """Heuristic extractor parsing Title, Authors, Abstract, and Keywords from sanitized text."""

    def __init__(self) -> None:
        pass

    def extract_title(self, text: str) -> str | None:
        """Extracts the document title from the first non-empty line of sanitized text.

        Strips leading markdown heading markers (#) and enumerations.

        Args:
            text: Sanitized document text.

        Returns:
            Extracted title string or None if text is empty.
        """
        if not text or not text.strip():
            return None

        for line in text.splitlines():
            clean_line = line.strip()
            if clean_line:
                # Strip markdown heading prefixes (#, ##, etc.)
                clean_line = re.sub(r"^#+\s*", "", clean_line).strip()
                # Strip trailing formatting symbols if any
                clean_line = clean_line.strip("*_`")
                if clean_line:
                    return clean_line

        return None

    def extract_abstract(self, text: str) -> str | None:
        """Extracts the abstract section from academic text.

        Searches for an Abstract heading and captures subsequent paragraphs up to the
        next section (Introduction, Keywords, or section 1).

        Args:
            text: Sanitized document text.

        Returns:
            Extracted abstract paragraph or None if not found.
        """
        if not text or not text.strip():
            return None

        match = ABSTRACT_START_REGEX.search(text)
        if not match:
            return None

        start_idx = match.end()
        remainder = text[start_idx:]

        # Search for termination boundary (Introduction, Keywords, etc.)
        end_match = ABSTRACT_END_REGEX.search(remainder)
        if end_match:
            raw_abstract = remainder[: end_match.start()].strip()
        else:
            # Fall back to first cohesive paragraph block (up to double newline \n\n)
            paragraphs = remainder.split("\n\n")
            raw_abstract = paragraphs[0].strip() if paragraphs else ""

        if not raw_abstract:
            return None

        # Clean single newlines within the abstract paragraph to ensure a cohesive string
        normalized_abstract = " ".join(raw_abstract.split())
        return normalized_abstract if normalized_abstract else None

    def extract_keywords(self, text: str) -> list[str] | None:
        """Extracts and normalizes keyword tags from academic documents.

        Parses lines prefixed with 'Keywords:' or 'Index Terms:' and splits on common delimiters.

        Args:
            text: Sanitized document text.

        Returns:
            List of normalized lowercase keywords, or None if no keyword anchor exists.
        """
        if not text or not text.strip():
            return None

        match = KEYWORDS_REGEX.search(text)
        if not match:
            return None

        raw_content = match.group(1).strip()
        # Strip trailing punctuation like a period at the end of the keyword block
        raw_content = re.sub(r"[.;]+$", "", raw_content)

        # Split on commas, semicolons, bullets, or pipes
        tokens = re.split(r"[,;•\u2022|]", raw_content)
        keywords: list[str] = []

        for token in tokens:
            cleaned = token.strip().lower()
            # Filter out empty or trivially short symbols
            if cleaned and len(cleaned) > 1 and not cleaned.isnumeric():
                keywords.append(cleaned)

        return keywords if keywords else None

    def extract_authors(self, text: str) -> list[str] | None:
        """Extracts author names typically located between title and abstract.

        Employs strict heuristics and institution filters to prevent hallucinations.

        Args:
            text: Sanitized document text.

        Returns:
            List of detected author names, or None if not found with confidence.
        """
        if not text or not text.strip():
            return None

        lines = [line.strip() for line in text.splitlines() if line.strip()]
        if len(lines) < 2:
            return None

        # Look for explicit author line: "Authors: Alice Smith, Bob Jones"
        for line in lines[:10]:
            match = AUTHOR_EXPLICIT_REGEX.match(line)
            if match:
                raw_authors = match.group(1).strip()
                return self._parse_author_tokens(raw_authors)

        # Heuristic: inspect candidate lines between line 1 (title) and the "Abstract" heading
        abstract_idx = -1
        for idx, line in enumerate(lines[:10]):
            if re.match(r"(?i)^abstract\b", line):
                abstract_idx = idx
                break

        # Check candidate lines between title and abstract
        candidate_window = lines[1:abstract_idx] if abstract_idx > 1 else lines[1:4]

        for candidate in candidate_window:
            lower_candidate = candidate.lower()
            # Skip lines with email addresses, URLs, or institutional affiliations
            if (
                any(term in lower_candidate for term in INSTITUTION_FILTER_WORDS)
                or "@" in candidate
                or "http" in candidate
            ):
                continue

            authors = self._parse_author_tokens(candidate)
            if authors:
                return authors

        return None

    def _parse_author_tokens(self, raw_string: str) -> list[str] | None:
        """Validates and parses comma- or 'and'-separated names into clean author strings."""
        # Replace ' and ' or ' & ' with delimiter
        normalized = re.sub(r"\s+(?:and|&)\s+", ", ", raw_string, flags=re.IGNORECASE)
        candidates = [t.strip() for t in normalized.split(",") if t.strip()]

        valid_authors: list[str] = []
        name_pattern = re.compile(r"^[A-Z][a-zA-Z\.\-]+(?:\s+[A-Z][a-zA-Z\.\-]+){1,3}$")

        for cand in candidates:
            # Strip footnote numbers, e.g. "John Doe 1,2" -> "John Doe"
            clean_cand = re.sub(r"[\d\*†‡]+$", "", cand).strip()
            if name_pattern.match(clean_cand):
                valid_authors.append(clean_cand)

        return valid_authors if valid_authors else None

    def extract(self, text: str) -> dict[str, Any]:
        """Runs the extraction pipeline across all metadata attributes.

        Args:
            text: Sanitized document text.

        Returns:
            Dictionary containing extracted attributes and confidence metadata.
        """
        title = self.extract_title(text)
        authors = self.extract_authors(text)
        abstract = self.extract_abstract(text)
        keywords = self.extract_keywords(text)

        quality = "HIGH_CONFIDENCE" if (title and abstract) else "PARTIAL_FALLBACK"

        return {
            "title_extracted": title,
            "authors": authors,
            "abstract": abstract,
            "keywords": keywords,
            "extraction_quality": quality,
            "schema_version": "v2.1",
        }
