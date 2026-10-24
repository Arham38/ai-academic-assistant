"""Unit tests for MetadataExtractor heuristics, regex boundaries, and fallback safety."""

from src.pipelines.nlp.metadata_extractor import MetadataExtractor


def test_extract_title_standard():
    """Verify title is extracted from first non-empty line and cleaned."""
    extractor = MetadataExtractor()
    text = "Attention Is All You Need\n\nAshish Vaswani, Noam Shazeer\n\nAbstract\n..."
    assert extractor.extract_title(text) == "Attention Is All You Need"


def test_extract_title_markdown_and_formatting():
    """Verify markdown hashes and leading formatting are stripped from title."""
    extractor = MetadataExtractor()
    text = (
        "  # **Scalable Deep Learning Architectures**  \n\nAuthor Name\n\nAbstract..."
    )
    assert extractor.extract_title(text) == "Scalable Deep Learning Architectures"


def test_extract_title_empty_and_whitespace():
    """Verify empty or whitespace strings return None safely."""
    extractor = MetadataExtractor()
    assert extractor.extract_title("") is None
    assert extractor.extract_title("   \n\t\n   ") is None


def test_extract_abstract_boundary_before_introduction():
    """Verify abstract paragraph is captured and stops strictly before Introduction."""
    extractor = MetadataExtractor()
    text = (
        "Neural Document Analysis\n\n"
        "Abstract\n\n"
        "This paper proposes a novel framework for hybrid semantic search and retrieval "
        "augmented generation. We show 15% improvement across standard academic benchmarks.\n\n"
        "1. Introduction\n\n"
        "In recent years, large language models have transformed document processing."
    )
    abstract = extractor.extract_abstract(text)
    assert abstract is not None
    assert abstract.startswith("This paper proposes a novel framework")
    assert abstract.endswith("academic benchmarks.")
    assert "1. Introduction" not in abstract
    assert "In recent years" not in abstract


def test_extract_abstract_boundary_before_keywords():
    """Verify abstract stops before a following Keywords block."""
    extractor = MetadataExtractor()
    text = (
        "Efficient RAG Pipelines\n\n"
        "Abstract: Retrieval Augmented Generation systems rely on high-fidelity chunks. "
        "We optimize embedding metadata injection.\n\n"
        "Keywords: vector search, rag, embeddings\n\n"
        "Introduction\n\n"
        "Information retrieval has evolved..."
    )
    abstract = extractor.extract_abstract(text)
    assert abstract == (
        "Retrieval Augmented Generation systems rely on high-fidelity chunks. "
        "We optimize embedding metadata injection."
    )
    assert "Keywords" not in abstract


def test_extract_abstract_missing_returns_none():
    """Verify unstructured text without abstract safely returns None without throwing."""
    extractor = MetadataExtractor()
    raw_code = "def main():\n    print('Hello World')\n    return 0"
    assert extractor.extract_abstract(raw_code) is None


def test_extract_keywords_standard_and_normalization():
    """Verify keywords are extracted, lowercased, and punctuation trimmed."""
    extractor = MetadataExtractor()
    text = (
        "Deep Metric Learning\n\n"
        "Abstract\n\n"
        "A study on metric learning.\n\n"
        "Keywords: Deep Learning, Vector Embeddings, Cosine Similarity.\n\n"
        "1. Introduction"
    )
    keywords = extractor.extract_keywords(text)
    assert keywords == ["deep learning", "vector embeddings", "cosine similarity"]


def test_extract_keywords_index_terms_and_semicolons():
    """Verify keywords parsing supports 'Index Terms' and semicolon delimiters."""
    extractor = MetadataExtractor()
    text = (
        "Transformer Optimization\n\nIndex Terms—Self-Attention; KV Cache; Quantization"
    )
    keywords = extractor.extract_keywords(text)
    assert keywords == ["self-attention", "kv cache", "quantization"]


def test_extract_keywords_missing_returns_none():
    """Verify documents without keyword anchors return None safely."""
    extractor = MetadataExtractor()
    unstructured_notes = (
        "Meeting notes regarding Q3 architecture roadmap and infrastructure."
    )
    assert extractor.extract_keywords(unstructured_notes) is None


def test_extract_authors_explicit_byline():
    """Verify explicit author prefix correctly extracts author names."""
    extractor = MetadataExtractor()
    text = (
        "Advances in Graph Neural Networks\n\n"
        "Authors: Alice Smith, Bob Jones, and Charlie Brown\n\n"
        "Abstract\n\n"
        "Graph neural networks operate on non-Euclidean geometries."
    )
    authors = extractor.extract_authors(text)
    assert authors == ["Alice Smith", "Bob Jones", "Charlie Brown"]


def test_extract_authors_implicit_byline():
    """Verify implicit author line positioned between title and abstract is detected."""
    extractor = MetadataExtractor()
    text = (
        "Attention Is All You Need\n\n"
        "Ashish Vaswani, Noam Shazeer, Niki Parmar\n\n"
        "Abstract\n\n"
        "The dominant sequence transduction models are based on complex recurrent neural networks."
    )
    authors = extractor.extract_authors(text)
    assert authors == ["Ashish Vaswani", "Noam Shazeer", "Niki Parmar"]


def test_extract_authors_filters_affiliations():
    """Verify institutional affiliation lines (e.g., Department, University) are skipped."""
    extractor = MetadataExtractor()
    text = (
        "Quantum Computing Algorithms\n\n"
        "John Doe, Jane Miller\n"
        "Department of Computer Science, Stanford University\n\n"
        "Abstract\n\n"
        "We evaluate Grover's search on quantum hardware."
    )
    authors = extractor.extract_authors(text)
    assert authors == ["John Doe", "Jane Miller"]


def test_extract_authors_unstructured_returns_none():
    """Verify unstructured notes with no valid author names return None (no hallucinations)."""
    extractor = MetadataExtractor()
    unstructured = (
        "docker compose down -v\ndocker compose up -d\nverify mongo container health"
    )
    assert extractor.extract_authors(unstructured) is None


def test_extract_full_pipeline_standard_academic():
    """Verify comprehensive extraction on academic paper structure matching HIGH_CONFIDENCE."""
    extractor = MetadataExtractor()
    paper = (
        "Attention Is All You Need\n\n"
        "Ashish Vaswani, Noam Shazeer\n"
        "Google Brain\n\n"
        "Abstract\n\n"
        "The dominant sequence transduction models are based on complex recurrent neural networks.\n\n"
        "Keywords: transformer, attention, deep learning\n\n"
        "1. Introduction\n\n"
        "Recurrent neural networks have been established as state of the art."
    )
    payload = extractor.extract(paper)

    assert payload["title_extracted"] == "Attention Is All You Need"
    assert payload["authors"] == ["Ashish Vaswani", "Noam Shazeer"]
    assert (
        payload["abstract"]
        == "The dominant sequence transduction models are based on complex recurrent neural networks."
    )
    assert payload["keywords"] == ["transformer", "attention", "deep learning"]
    assert payload["extraction_quality"] == "HIGH_CONFIDENCE"
    assert payload["schema_version"] == "v2.1"


def test_extract_full_pipeline_unstructured_fallback():
    """Verify comprehensive extraction on unstructured notes matching PARTIAL_FALLBACK."""
    extractor = MetadataExtractor()
    notes = "Meeting notes regarding Q3 architecture roadmap\n\nDiscussion items:\n- Mongo cluster\n- Vector indexing"
    payload = extractor.extract(notes)

    assert (
        payload["title_extracted"] == "Meeting notes regarding Q3 architecture roadmap"
    )
    assert payload["authors"] is None
    assert payload["abstract"] is None
    assert payload["keywords"] is None
    assert payload["extraction_quality"] == "PARTIAL_FALLBACK"
    assert payload["schema_version"] == "v2.1"
