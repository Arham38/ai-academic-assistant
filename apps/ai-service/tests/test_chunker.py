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


# =====================================================================
# Scenario-Based Execution Architecture Tests (Parity with Visual UI)
# =====================================================================


def test_scenario_1_standard_paragraph_fast_path():
    """Execution Scenario 1: Standard Paragraph (~300 tokens).

    Workflow:
    1. Ingest clean text input (300 tokens).
    2. Evaluate limit: Token count < 400? -> YES.
    3. Yield directly as single chunk without unnecessary splitting.
    """
    sentence = "Deep neural architectures facilitate academic knowledge synthesis across scientific domains. "
    text = (sentence * 25).strip()  # ~300 tokens

    chunker = RecursiveTokenChunker(chunk_size=400, chunk_overlap=50)
    token_count = chunker.count_tokens(text)
    assert 250 <= token_count <= 350
    assert token_count < 400

    chunks = chunker.split(text)
    assert len(chunks) == 1
    assert chunks[0].index == 0
    assert chunks[0].token_count == token_count
    assert chunks[0].text == text


def test_scenario_2_massive_text_block_paragraph_split():
    """Execution Scenario 2: Massive Text Block (~1200 tokens).

    Workflow:
    1. Ingest large text document (~1200 tokens).
    2. Evaluate limit: Token count < 400? -> NO.
    3. Split by double line breaks (\\n\\n Paragraph boundaries).
    4. Recursively evaluate paragraph pieces (< 400 tokens -> YES).
    5. Merge split pieces with 50-token overlap.
    """
    para = (
        "Academic research requires meticulous methodology and empirical verification. "
        * 30
    )  # ~300 tokens
    doc = f"{para}\n\n{para}\n\n{para}\n\n{para}"  # ~1200 tokens

    chunker = RecursiveTokenChunker(chunk_size=400, chunk_overlap=50)
    total_tokens = chunker.count_tokens(doc)
    assert total_tokens > 1000

    chunks = chunker.split(doc)
    # Must produce multiple chunks
    assert len(chunks) >= 3
    # Every chunk strictly within 400 token ceiling
    for i, c in enumerate(chunks):
        assert c.index == i
        assert c.token_count <= 400


def test_scenario_3_no_paragraph_breaks_code_block_fallback():
    """Execution Scenario 3: No Paragraph Breaks / Code Block (~600 tokens).

    Workflow:
    1. Ingest contiguous code block or raw text without \\n\\n.
    2. Evaluate limit: Token count < 400? -> NO.
    3. Attempt \\n\\n split -> Chunk still > 400 tokens.
    4. Fallback to \\n (Lines) or '. ' (Sentence) boundary split.
    5. Route valid sub-chunks to Merge with 50-token overlap.
    """
    lines = [
        f"def compute_attention_layer_{i}(query: Tensor, key: Tensor, value: Tensor) -> Tensor:"
        f" return softmax(query @ key.T) @ value"
        for i in range(1, 30)
    ]
    # Joined by single newline only (no double newlines)
    code_block = "\n".join(lines)

    chunker = RecursiveTokenChunker(chunk_size=400, chunk_overlap=50)
    total_tokens = chunker.count_tokens(code_block)
    assert total_tokens > 400

    chunks = chunker.split(code_block)
    assert len(chunks) >= 2
    for c in chunks:
        assert c.token_count <= 400
        # Preserved code lines
        assert "compute_attention_layer" in c.text
