"""Integration and unit tests for Qdrant client lifecycle and VectorRepository multi-tenant isolation."""

import uuid

import pytest
import pytest_asyncio
from qdrant_client import AsyncQdrantClient
from src.infrastructure.database.qdrant_client import init_qdrant_schema
from src.infrastructure.database.vector_repository import (
    VectorPoint,
    VectorRepository,
)


@pytest_asyncio.fixture
async def memory_qdrant_client():
    """Provides an isolated in-memory AsyncQdrantClient for zero-dependency test execution."""
    client = AsyncQdrantClient(":memory:")
    yield client
    await client.close()


@pytest_asyncio.fixture
async def vector_repo(memory_qdrant_client):
    """Provisions a VectorRepository hooked to an in-memory collection with schema initialized."""
    # Initialize collection with schema
    await init_qdrant_schema(client=memory_qdrant_client)
    repo = VectorRepository(
        client=memory_qdrant_client,
        collection_name="academic_documents",
    )
    return repo


@pytest.mark.asyncio
async def test_init_qdrant_schema_idempotency(memory_qdrant_client):
    """Verify init_qdrant_schema creates collection and payload indices idempotently without crashing."""
    success_first = await init_qdrant_schema(client=memory_qdrant_client)
    assert success_first is True
    assert await memory_qdrant_client.collection_exists("academic_documents") is True

    # Calling again should succeed idempotently
    success_second = await init_qdrant_schema(client=memory_qdrant_client)
    assert success_second is True


def test_deterministic_uuid_generation():
    """Verify generate_point_id generates repeatable, valid RFC-4122 UUIDs."""
    doc_id = "doc_alpha_99"
    ver_id = "ver_v1"
    idx = 3

    id1 = VectorRepository.generate_point_id(doc_id, ver_id, idx)
    id2 = VectorRepository.generate_point_id(doc_id, ver_id, idx)
    assert id1 == id2

    # Validate RFC 4122 format
    parsed_uuid = uuid.UUID(id1)
    assert parsed_uuid.version == 5

    # Changing index alters UUID
    id3 = VectorRepository.generate_point_id(doc_id, ver_id, idx + 1)
    assert id1 != id3


@pytest.mark.asyncio
async def test_cross_tenant_vector_isolation(vector_repo):
    """CRITICAL SECURITY TEST: Proves similarity search mathematically blocks vectors belonging to other users.

    Even if a vector belonging to Tenant 1 is a 100% exact mathematical match to Tenant 2's query,
    it must NEVER be returned to Tenant 2.
    """
    # Create normalized test vectors of dim 384
    vec_apple = [0.0] * 384
    vec_apple[0] = 1.0  # Unit vector on axis 0

    vec_banana = [0.0] * 384
    vec_banana[1] = 1.0  # Unit vector on axis 1

    point_user1 = VectorPoint(
        id=VectorRepository.generate_point_id("doc-1", "v1", 0),
        vector=vec_apple,
        user_id="tenant_alice_111",
        document_id="doc-1",
        version_id="v1",
        chunk_index=0,
        text="Quantum Entanglement Cryptography Research",
        metadata={"subject": "physics"},
    )

    point_user2 = VectorPoint(
        id=VectorRepository.generate_point_id("doc-2", "v1", 0),
        vector=vec_banana,
        user_id="tenant_bob_222",
        document_id="doc-2",
        version_id="v1",
        chunk_index=0,
        text="Neural Symbolic Reasoning Architectures",
        metadata={"subject": "computer_science"},
    )

    # Upsert both tenants' vectors into the shared collection
    upserted = await vector_repo.upsert_vectors([point_user1, point_user2])
    assert upserted == 2

    # Query with Alice's exact vector [1.0, 0, 0, ...] but querying as Bob (tenant_bob_222)
    bob_results = await vector_repo.search_similarity(
        query_vector=vec_apple,
        user_id="tenant_bob_222",
        limit=5,
    )

    # Bob's query must NOT return Alice's document, even though Alice's vector is mathematically identical
    assert len(bob_results) == 1
    assert bob_results[0].user_id == "tenant_bob_222"
    assert (
        bob_results[0].text == "Neural Symbolic Reasoning Architectures"
    )  # Bob's document only

    # Querying as Alice returns Alice's document with perfect cosine similarity
    alice_results = await vector_repo.search_similarity(
        query_vector=vec_apple,
        user_id="tenant_alice_111",
        limit=5,
    )
    assert len(alice_results) == 1
    assert alice_results[0].user_id == "tenant_alice_111"
    assert alice_results[0].text == "Quantum Entanglement Cryptography Research"
    assert alice_results[0].score == pytest.approx(1.0, rel=1e-3)


@pytest.mark.asyncio
async def test_search_similarity_security_guard(vector_repo):
    """Verify search_similarity strictly rejects queries without user_id with ValueError."""
    dummy_vec = [0.0] * 384
    with pytest.raises(
        ValueError, match="Multi-tenant security violation: user_id is strictly"
    ):
        await vector_repo.search_similarity(query_vector=dummy_vec, user_id="")

    with pytest.raises(
        ValueError, match="Multi-tenant security violation: user_id is strictly"
    ):
        await vector_repo.search_similarity(query_vector=dummy_vec, user_id="   ")


@pytest.mark.asyncio
async def test_document_and_version_filtering(vector_repo):
    """Verify search_similarity supports optional document_id and version_id pre-filtering."""
    vec = [0.0] * 384
    vec[0] = 1.0

    points = [
        VectorPoint(
            id=VectorRepository.generate_point_id("doc-100", "v1", 0),
            vector=vec,
            user_id="user_charlie",
            document_id="doc-100",
            version_id="v1",
            chunk_index=0,
            text="Draft 1 content",
        ),
        VectorPoint(
            id=VectorRepository.generate_point_id("doc-100", "v2", 0),
            vector=vec,
            user_id="user_charlie",
            document_id="doc-100",
            version_id="v2",
            chunk_index=0,
            text="Draft 2 content revision",
        ),
        VectorPoint(
            id=VectorRepository.generate_point_id("doc-200", "v1", 0),
            vector=vec,
            user_id="user_charlie",
            document_id="doc-200",
            version_id="v1",
            chunk_index=0,
            text="Separate document content",
        ),
    ]

    await vector_repo.upsert_vectors(points)

    # 1. Scoped strictly to version v2
    v2_results = await vector_repo.search_similarity(
        query_vector=vec,
        user_id="user_charlie",
        document_id="doc-100",
        version_id="v2",
    )
    assert len(v2_results) == 1
    assert v2_results[0].text == "Draft 2 content revision"

    # 2. Scoped to doc-200
    doc200_results = await vector_repo.search_similarity(
        query_vector=vec,
        user_id="user_charlie",
        document_id="doc-200",
    )
    assert len(doc200_results) == 1
    assert doc200_results[0].text == "Separate document content"


@pytest.mark.asyncio
async def test_delete_document_vectors_scoped(vector_repo):
    """Verify delete_document_vectors deletes targeted vectors without affecting other tenants or documents."""
    vec = [0.0] * 384
    vec[5] = 1.0

    p1 = VectorPoint(
        id=VectorRepository.generate_point_id("doc-del-1", "v1", 0),
        vector=vec,
        user_id="user_dave",
        document_id="doc-del-1",
        version_id="v1",
        chunk_index=0,
        text="Dave doc 1",
    )
    p2 = VectorPoint(
        id=VectorRepository.generate_point_id("doc-del-2", "v1", 0),
        vector=vec,
        user_id="user_dave",
        document_id="doc-del-2",
        version_id="v1",
        chunk_index=0,
        text="Dave doc 2",
    )
    p3 = VectorPoint(
        id=VectorRepository.generate_point_id("doc-del-eve", "v1", 0),
        vector=vec,
        user_id="user_eve",
        document_id="doc-del-eve",
        version_id="v1",
        chunk_index=0,
        text="Eve doc 1",
    )

    await vector_repo.upsert_vectors([p1, p2, p3])
    assert await vector_repo.count_user_vectors("user_dave") == 2
    assert await vector_repo.count_user_vectors("user_eve") == 1

    # Delete Dave's doc-del-1
    await vector_repo.delete_document_vectors(
        document_id="doc-del-1", user_id="user_dave"
    )

    # Dave should have 1 remaining vector (doc-del-2)
    assert await vector_repo.count_user_vectors("user_dave") == 1
    dave_remaining = await vector_repo.search_similarity(
        query_vector=vec, user_id="user_dave"
    )
    assert len(dave_remaining) == 1
    assert dave_remaining[0].document_id == "doc-del-2"

    # Eve's doc-del-eve must remain untouched
    assert await vector_repo.count_user_vectors("user_eve") == 1
    eve_results = await vector_repo.search_similarity(
        query_vector=vec, user_id="user_eve"
    )
    assert len(eve_results) == 1
    assert eve_results[0].text == "Eve doc 1"


@pytest.mark.asyncio
async def test_delete_security_guard(vector_repo):
    """Verify delete_document_vectors raises ValueError if user_id or document_id is missing."""
    with pytest.raises(
        ValueError, match="Multi-tenant security violation: user_id is strictly"
    ):
        await vector_repo.delete_document_vectors(document_id="doc-1", user_id="")

    with pytest.raises(
        ValueError, match="document_id is strictly required for vector deletion"
    ):
        await vector_repo.delete_document_vectors(document_id="", user_id="user_1")


@pytest.mark.asyncio
async def test_get_document_vectors(vector_repo):
    """Verify get_document_vectors retrieves all chunks for target document sorted by chunkIndex."""
    doc_id = "doc_retrieve_test"
    points = [
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_id, "v1", 1),
            vector=[0.2] * 384,
            user_id="user_frank",
            document_id=doc_id,
            version_id="v1",
            chunk_index=1,
            text="Second chunk text.",
        ),
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_id, "v1", 0),
            vector=[0.1] * 384,
            user_id="user_frank",
            document_id=doc_id,
            version_id="v1",
            chunk_index=0,
            text="First chunk text.",
        ),
    ]
    await vector_repo.upsert_vectors(points)

    retrieved = await vector_repo.get_document_vectors(document_id=doc_id)
    assert len(retrieved) == 2
    # Verify sorted by chunk_index
    assert retrieved[0].chunk_index == 0
    assert retrieved[0].text == "First chunk text."
    assert retrieved[1].chunk_index == 1
    assert retrieved[1].text == "Second chunk text."
    assert len(retrieved[0].vector) == 384


@pytest.mark.asyncio
async def test_search_batch_with_exclusion_filter(vector_repo):
    """Verify search_batch executes batched queries and filters out target document ID."""
    doc_target = "doc_target_123"
    doc_corpus_1 = "doc_corpus_abc"
    doc_corpus_2 = "doc_corpus_xyz"

    vec_a = [1.0] + [0.0] * 383
    vec_b = [0.0, 1.0] + [0.0] * 382

    points = [
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_target, "v1", 0),
            vector=vec_a,
            user_id="user_1",
            document_id=doc_target,
            version_id="v1",
            chunk_index=0,
            text="Target chunk 0",
        ),
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_corpus_1, "v1", 0),
            vector=vec_a,
            user_id="user_2",
            document_id=doc_corpus_1,
            version_id="v1",
            chunk_index=0,
            text="Corpus 1 chunk 0",
        ),
        VectorPoint(
            id=VectorRepository.generate_point_id(doc_corpus_2, "v1", 0),
            vector=vec_b,
            user_id="user_3",
            document_id=doc_corpus_2,
            version_id="v1",
            chunk_index=0,
            text="Corpus 2 chunk 0",
        ),
    ]
    await vector_repo.upsert_vectors(points)

    # Batch query with 2 vectors, excluding doc_target
    results = await vector_repo.search_batch(
        query_vectors=[vec_a, vec_b],
        filter_out_doc_id=doc_target,
        limit=1,
    )

    assert len(results) == 2
    # Query 1 matches Corpus 1 (identical vector), NOT Target
    assert len(results[0]) == 1
    assert results[0][0].document_id == doc_corpus_1
    assert results[0][0].document_id != doc_target

    # Query 2 matches Corpus 2
    assert len(results[1]) == 1
    assert results[1][0].document_id == doc_corpus_2
