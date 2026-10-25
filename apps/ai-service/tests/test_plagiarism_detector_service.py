"""Unit tests for PlagiarismDetectorService semantic thresholding, self-exclusion, and score aggregation."""

from unittest.mock import AsyncMock, MagicMock

import pytest
import pytest_asyncio
from qdrant_client import AsyncQdrantClient
from src.infrastructure.database.qdrant_client import init_qdrant_schema
from src.infrastructure.database.vector_repository import (
    VectorPoint,
    VectorRepository,
    VectorSearchResult,
)
from src.services.plagiarism_detector_service import (
    PlagiarismDetectorService,
)


@pytest.fixture
def mock_repo():
    """Provides a mocked VectorRepository for deterministic service-level unit tests."""
    repo = MagicMock(spec=VectorRepository)
    repo.get_document_vectors = AsyncMock()
    repo.search_batch = AsyncMock()
    return repo


@pytest_asyncio.fixture
async def memory_qdrant_repo():
    """Provisions a real VectorRepository with an isolated in-memory Qdrant client."""
    client = AsyncQdrantClient(":memory:")
    await init_qdrant_schema(client=client)
    repo = VectorRepository(client=client, collection_name="academic_documents")
    yield repo
    await client.close()


@pytest.mark.asyncio
async def test_plagiarism_detector_empty_document(mock_repo):
    """Verify document with no indexed vectors returns a clean 100% originality score."""
    mock_repo.get_document_vectors.return_value = []

    service = PlagiarismDetectorService(vector_repository=mock_repo)
    report = await service.analyze_document(document_id="empty_doc_123")

    assert report.overall_score == 100.0
    assert report.total_chunks == 0
    assert report.flagged_chunks == []
    assert report.high_risk_count == 0
    assert report.moderate_risk_count == 0


@pytest.mark.asyncio
async def test_threshold_categorization_high_moderate_ignore(mock_repo):
    """Verify matches are categorized as HIGH (>=0.85), MODERATE (0.75-0.85), or ignored (<0.75)."""
    # 3 target chunks
    target_points = [
        VectorPoint(
            id="p1",
            vector=[0.1] * 384,
            user_id="u1",
            document_id="doc_target",
            version_id="v1",
            chunk_index=0,
            text="High similarity chunk text.",
        ),
        VectorPoint(
            id="p2",
            vector=[0.2] * 384,
            user_id="u1",
            document_id="doc_target",
            version_id="v1",
            chunk_index=1,
            text="Moderate similarity chunk text.",
        ),
        VectorPoint(
            id="p3",
            vector=[0.3] * 384,
            user_id="u1",
            document_id="doc_target",
            version_id="v1",
            chunk_index=2,
            text="Clean chunk text.",
        ),
    ]
    mock_repo.get_document_vectors.return_value = target_points

    # Search batch returns 0.92 (HIGH), 0.79 (MODERATE), and 0.45 (IGNORED)
    mock_repo.search_batch.return_value = [
        [
            VectorSearchResult(
                id="match_1",
                score=0.92,
                user_id="u2",
                document_id="doc_source_1",
                version_id="v1",
                chunk_index=0,
                text="Nearly identical source text.",
                metadata={"title": "Paper One"},
            )
        ],
        [
            VectorSearchResult(
                id="match_2",
                score=0.79,
                user_id="u2",
                document_id="doc_source_2",
                version_id="v1",
                chunk_index=1,
                text="Paraphrased source text.",
                metadata={"title": "Paper Two"},
            )
        ],
        [
            VectorSearchResult(
                id="match_3",
                score=0.45,
                user_id="u2",
                document_id="doc_source_3",
                version_id="v1",
                chunk_index=2,
                text="Unrelated text.",
            )
        ],
    ]

    service = PlagiarismDetectorService(
        vector_repository=mock_repo,
        threshold_high=0.85,
        threshold_moderate=0.75,
    )
    report = await service.analyze_document(document_id="doc_target")

    assert report.total_chunks == 3
    assert len(report.flagged_chunks) == 2  # 0.45 ignored

    # Chunk 0 -> HIGH
    flag_0 = report.flagged_chunks[0]
    assert flag_0.chunk_index == 0
    assert flag_0.severity == "HIGH"
    assert flag_0.similarity_score == 0.92
    assert flag_0.matched_source.document_id == "doc_source_1"
    assert flag_0.matched_source.title == "Paper One"

    # Chunk 1 -> MODERATE
    flag_1 = report.flagged_chunks[1]
    assert flag_1.chunk_index == 1
    assert flag_1.severity == "MODERATE"
    assert flag_1.similarity_score == 0.79
    assert flag_1.matched_source.document_id == "doc_source_2"
    assert flag_1.matched_source.title == "Paper Two"

    assert report.high_risk_count == 1
    assert report.moderate_risk_count == 1


@pytest.mark.asyncio
async def test_score_calculation_mathematical_precision(mock_repo):
    """Verify originality score: 100 - (((high * 1.5 + mod * 0.5) / total) * 100)."""
    # 10 chunks total: 1 HIGH, 1 MODERATE, 8 clean
    target_points = [
        VectorPoint(
            id=f"p_{i}",
            vector=[0.01 * i] * 384,
            user_id="u1",
            document_id="doc_10",
            version_id="v1",
            chunk_index=i,
            text=f"Chunk text {i}",
        )
        for i in range(10)
    ]
    mock_repo.get_document_vectors.return_value = target_points

    batch_matches = [
        [
            VectorSearchResult(
                id="m1",
                score=0.90,  # HIGH
                user_id="u2",
                document_id="doc_ext",
                version_id="v1",
                chunk_index=0,
                text="Source",
            )
        ],
        [
            VectorSearchResult(
                id="m2",
                score=0.80,  # MODERATE
                user_id="u2",
                document_id="doc_ext",
                version_id="v1",
                chunk_index=1,
                text="Source",
            )
        ],
    ] + [[] for _ in range(8)]  # 8 clean chunks without matches

    mock_repo.search_batch.return_value = batch_matches

    service = PlagiarismDetectorService(
        vector_repository=mock_repo,
        threshold_high=0.85,
        threshold_moderate=0.75,
    )
    report = await service.analyze_document(document_id="doc_10")

    # Math: (1 * 1.5 + 1 * 0.5) / 10 = 2.0 / 10 = 0.20 -> 20.0 penalty
    # 100.0 - 20.0 = 80.0%
    assert report.overall_score == 80.0
    assert report.total_chunks == 10
    assert report.high_risk_count == 1
    assert report.moderate_risk_count == 1


@pytest.mark.asyncio
async def test_score_calculation_clamping_to_zero(mock_repo):
    """Verify score clamps to 0.0 when penalties exceed 100%."""
    # 2 chunks, both HIGH -> penalty = (2 * 1.5 / 2) * 100 = 150 -> clamped to 0.0
    target_points = [
        VectorPoint(
            id=f"p_{i}",
            vector=[0.1] * 384,
            user_id="u1",
            document_id="doc_plagiarized",
            version_id="v1",
            chunk_index=i,
            text=f"Copied text {i}",
        )
        for i in range(2)
    ]
    mock_repo.get_document_vectors.return_value = target_points
    mock_repo.search_batch.return_value = [
        [
            VectorSearchResult(
                id=f"m_{i}",
                score=0.98,
                user_id="u2",
                document_id="orig",
                version_id="v1",
                chunk_index=i,
                text="Orig",
            )
        ]
        for i in range(2)
    ]

    service = PlagiarismDetectorService(vector_repository=mock_repo)
    report = await service.analyze_document(document_id="doc_plagiarized")

    assert report.overall_score == 0.0
    assert report.high_risk_count == 2


@pytest.mark.asyncio
async def test_self_exclusion_with_real_in_memory_qdrant(memory_qdrant_repo):
    """Verify integration test: Document A does not flag itself when queried against Qdrant corpus."""
    doc_a_id = "doc_target_alpha"
    doc_b_id = "doc_source_beta"
    doc_c_id = "doc_source_gamma"

    # Document A points (Target)
    points_a = [
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_a_id, "v1", 0),
            vector=[1.0] + [0.0] * 383,
            user_id="user_1",
            document_id=doc_a_id,
            version_id="v1",
            chunk_index=0,
            text="Machine learning models optimize loss functions via gradient descent.",
            metadata={"title": "Paper Alpha"},
        )
    ]

    # Document B points (Nearly identical content in different document)
    points_b = [
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_b_id, "v1", 0),
            vector=[0.99] + [0.01] * 383,
            user_id="user_2",
            document_id=doc_b_id,
            version_id="v1",
            chunk_index=0,
            text="Machine learning algorithms optimize continuous loss functions via stochastic gradient descent.",
            metadata={"title": "Paper Beta"},
        )
    ]

    # Document C points (Completely unrelated document)
    points_c = [
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_c_id, "v1", 0),
            vector=[0.0] * 383 + [1.0],
            user_id="user_3",
            document_id=doc_c_id,
            version_id="v1",
            chunk_index=0,
            text="Marine biology studies of abyssal benthic fauna.",
            metadata={"title": "Paper Gamma"},
        )
    ]

    # Upsert all into in-memory Qdrant
    await memory_qdrant_repo.upsert_vectors(points_a + points_b + points_c)

    # Execute plagiarism detection on Document A
    service = PlagiarismDetectorService(
        vector_repository=memory_qdrant_repo,
        threshold_high=0.85,
        threshold_moderate=0.75,
    )
    report = await service.analyze_document(document_id=doc_a_id)

    # Document A must NOT match itself! It must match Document B.
    assert len(report.flagged_chunks) == 1
    flag = report.flagged_chunks[0]
    assert flag.matched_source.document_id == doc_b_id
    assert flag.matched_source.document_id != doc_a_id
    assert flag.severity == "HIGH"
    assert flag.similarity_score > 0.95
    assert flag.matched_source.title == "Paper Beta"
