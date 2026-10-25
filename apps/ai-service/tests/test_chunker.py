"""Unit tests verifying hierarchical semantic splitting, token boundaries, and overlap integrity."""

import pytest
from src.config.ai_settings import ai_settings
from src.pipelines.nlp.chunker import RecursiveTokenChunker


@pytest.fixture
def test_chunker():
    """Provides a RecursiveTokenChunker configured with standard test sizing."""
    return RecursiveTokenChunker(chunk_size=100, chunk_overlap=20)


def test_chunker_empty_string(test_chunker):
    """Verify empty or whitespace-only strings return empty list."""
    assert test_chunker.split("") == []
    assert test_chunker.split("   \n\t  ") == []


def test_chunker_short_text_single_chunk(test_chunker):
    """Verify short text under chunk_size creates a single TextChunk at index 0."""
    text = "Artificial Intelligence in Academic Research enhances citation fidelity."
    chunks = test_chunker.split(text)
    assert len(chunks) == 1
    chunk = chunks[0]
    assert chunk.index == 0
    assert chunk.text == text
    assert chunk.token_count == test_chunker.count_tokens(text)
    assert chunk.token_count <= 100


def test_chunker_respects_paragraph_boundaries():
    """Verify text splits cleanly at double-newlines when each paragraph is under chunk_size."""
    p1 = "Paragraph 1 outlines the core methodology of the neural network model in academic inquiry."
    p2 = "Paragraph 2 details empirical benchmarking against traditional heuristics and baselines."
    text = f"{p1}\n\n{p2}"

    chunker = RecursiveTokenChunker(chunk_size=16, chunk_overlap=3)
    chunks = chunker.split(text)

    assert len(chunks) >= 2
    # Verify that the two paragraphs were separated
    assert any("Paragraph 1" in c.text for c in chunks)
    assert any("Paragraph 2" in c.text for c in chunks)
    assert all(c.token_count <= 16 for c in chunks)


def test_chunker_hierarchical_stepdown_to_sentences():
    """Verify when a paragraph exceeds chunk_size, the splitter steps down to sentence boundaries."""
    # Build a single paragraph with 4 distinct sentences that exceeds chunk_size
    s1 = "Deep neural architectures have transformed natural language understanding across domains."
    s2 = "However transformer context windows impose strict memory bounds during quadratic attention."
    s3 = "Hierarchical recursive chunking partitions documents at natural linguistic semantic junctures."
    s4 = "Consequently downstream retrieval augmented generation agents retain pristine context."
    paragraph = f"{s1} {s2} {s3} {s4}"

    chunker = RecursiveTokenChunker(chunk_size=20, chunk_overlap=4)
    chunks = chunker.split(paragraph)

    assert len(chunks) > 1
    # Check that each chunk adheres strictly to token bounds
    for c in chunks:
        assert c.token_count <= 20
        assert len(c.text.strip()) > 0


def test_chunker_sliding_window_overlap():
    """Verify consecutive chunks share the configured token overlap."""
    sentences = [
        f"Academic finding {i} establishes that recursive token splitting preserves context."
        for i in range(1, 15)
    ]
    text = " ".join(sentences)

    chunk_size = 40
    overlap = 10
    chunker = RecursiveTokenChunker(chunk_size=chunk_size, chunk_overlap=overlap)
    chunks = chunker.split(text)

    assert len(chunks) >= 3

    # Verify overlap between consecutive chunks
    for i in range(len(chunks) - 1):
        c1 = chunks[i]
        c2 = chunks[i + 1]

        # Extract tokens using internal encoder
        c1_tokens = chunker._encoder.encode(c1.text)
        tail_tokens = c1_tokens[-overlap:]
        tail_text = chunker._encoder.decode(tail_tokens).strip()

        # Check semantic overlap: words from the tail of c1 should appear in c2
        tail_words = [w for w in tail_text.split() if len(w) > 3]
        if tail_words:
            assert any(word in c2.text for word in tail_words)


def test_chunker_never_exceeds_max_token_limit():
    """Verify no chunk ever exceeds chunk_size even with large continuous academic text."""
    long_academic_text = (
        "The quick brown fox jumps over the lazy dog. " * 100
        + "\n\n"
        + "Machine learning algorithms optimize continuous loss functions via stochastic gradient descent. "
        * 50
    )

    chunker = RecursiveTokenChunker(
        chunk_size=ai_settings.CHUNK_SIZE,
        chunk_overlap=ai_settings.CHUNK_OVERLAP,
    )
    chunks = chunker.split(long_academic_text)

    assert len(chunks) > 1
    for i, chunk in enumerate(chunks):
        assert chunk.index == i
        assert chunk.token_count <= ai_settings.CHUNK_SIZE
        assert len(chunk.text.strip()) > 0


def test_chunker_unbroken_long_string_fallback():
    """Verify long contiguous strings without spaces fall back to character splitting safely."""
    unbroken = "Supercalifragilisticexpialidocious" * 20
    chunker = RecursiveTokenChunker(chunk_size=15, chunk_overlap=2)
    chunks = chunker.split(unbroken)

    assert len(chunks) > 1
    for chunk in chunks:
        assert chunk.token_count <= 15


def test_chunker_iter_chunks_generator():
    """Verify iter_chunks yields identical TextChunk items as split."""
    text = "First paragraph here.\n\nSecond paragraph here.\n\nThird paragraph here."
    chunker = RecursiveTokenChunker(chunk_size=10, chunk_overlap=2)

    chunks_list = chunker.split(text)
    chunks_gen = list(chunker.iter_chunks(text))

    assert len(chunks_list) == len(chunks_gen)
    for c1, c2 in zip(chunks_list, chunks_gen, strict=True):
        assert c1.index == c2.index
        assert c1.text == c2.text
        assert c1.token_count == c2.token_count
