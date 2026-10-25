"""Multi-tenant Vector Repository managing embedding upsert, search, and deletion in Qdrant."""

import logging
import uuid
from dataclasses import dataclass, field
from typing import Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    QueryRequest,
)
from src.config.qdrant_settings import qdrant_settings
from src.infrastructure.database.qdrant_client import get_qdrant_client

logger = logging.getLogger(__name__)


@dataclass
class VectorPoint:
    """Domain representation of a vectorized text chunk with tenancy metadata."""

    id: str
    vector: list[float]
    user_id: str
    document_id: str
    version_id: str
    chunk_index: int
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class VectorSearchResult:
    """Semantic similarity query result matching the tenant query."""

    id: str
    score: float
    user_id: str
    document_id: str
    version_id: str
    chunk_index: int
    text: str
    metadata: dict[str, Any] = field(default_factory=dict)


class VectorRepository:
    """Repository managing vector embeddings with strict multi-tenant isolation.

    Guarantees that every similarity query and deletion is pre-filtered by tenant (userId),
    preventing Insecure Direct Object Reference (IDOR) and cross-tenant data leakage.
    """

    def __init__(
        self,
        client: AsyncQdrantClient | None = None,
        collection_name: str | None = None,
    ) -> None:
        self._client = client
        self._collection_name = collection_name or qdrant_settings.COLLECTION_NAME

    def _get_client(self) -> AsyncQdrantClient:
        if self._client is not None:
            return self._client
        return get_qdrant_client()

    @staticmethod
    def generate_point_id(document_id: str, version_id: str, chunk_index: int) -> str:
        """Generates an idempotent, deterministic RFC 4122 UUID for a document chunk point.

        Ensures that re-processing a document overwrites existing vectors rather than duplicating them.
        """
        seed = f"{document_id}_{version_id}_chunk_{chunk_index}"
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, seed))

    async def upsert_vectors(self, points: list[VectorPoint]) -> int:
        """Upserts a collection of vector points with payloads into Qdrant in batches.

        Args:
            points: List of VectorPoint entities to persist.

        Returns:
            int: Number of vectors successfully upserted.
        """
        if not points:
            return 0

        client = self._get_client()
        batch_size = qdrant_settings.UPSERT_BATCH_SIZE
        total_upserted = 0

        # Transform to Qdrant PointStruct entities
        qdrant_points: list[PointStruct] = []
        for p in points:
            payload = {
                "userId": p.user_id,
                "documentId": p.document_id,
                "versionId": p.version_id,
                "chunkIndex": p.chunk_index,
                "text": p.text,
                "metadata": p.metadata,
            }
            qdrant_points.append(
                PointStruct(
                    id=p.id,
                    vector=p.vector,
                    payload=payload,
                )
            )

        # Batch upsert to protect against network payload overflows
        for i in range(0, len(qdrant_points), batch_size):
            chunk = qdrant_points[i : i + batch_size]
            await client.upsert(
                collection_name=self._collection_name,
                points=chunk,
            )
            total_upserted += len(chunk)

        logger.info(
            f"Successfully upserted {total_upserted} vector points to collection '{self._collection_name}'."
        )
        return total_upserted

    async def search_similarity(
        self,
        query_vector: list[float],
        user_id: str,
        limit: int = 5,
        document_id: str | None = None,
        version_id: str | None = None,
        score_threshold: float | None = None,
    ) -> list[VectorSearchResult]:
        """Executes a Cosine similarity search strictly scoped to the requesting tenant's vectors.

        Args:
            query_vector: 384-dimensional question or chunk vector.
            user_id: Owning user identifier (MANDATORY for multi-tenant safety).
            limit: Maximum number of closest vector neighbors to retrieve.
            document_id: Optional filter scoping search to a single document.
            version_id: Optional filter scoping search to a specific version.
            score_threshold: Minimum cosine similarity score threshold (0.0 to 1.0).

        Returns:
            List of VectorSearchResult objects ordered by descending semantic similarity.

        Raises:
            ValueError: If user_id is empty or missing.
        """
        if not user_id or not user_id.strip():
            raise ValueError(
                "Multi-tenant security violation: user_id is strictly required for vector similarity searches."
            )

        client = self._get_client()

        # Build mandatory multi-tenant filter condition
        must_conditions: list[Any] = [
            FieldCondition(key="userId", match=MatchValue(value=user_id.strip()))
        ]

        if document_id and document_id.strip():
            must_conditions.append(
                FieldCondition(
                    key="documentId", match=MatchValue(value=document_id.strip())
                )
            )

        if version_id and version_id.strip():
            must_conditions.append(
                FieldCondition(
                    key="versionId", match=MatchValue(value=version_id.strip())
                )
            )

        query_filter = Filter(must=must_conditions)

        response = await client.query_points(
            collection_name=self._collection_name,
            query=query_vector,
            query_filter=query_filter,
            limit=limit,
            score_threshold=score_threshold,
        )

        results: list[VectorSearchResult] = []
        for point in response.points:
            payload = point.payload or {}
            results.append(
                VectorSearchResult(
                    id=str(point.id),
                    score=float(point.score or 0.0),
                    user_id=str(payload.get("userId", "")),
                    document_id=str(payload.get("documentId", "")),
                    version_id=str(payload.get("versionId", "")),
                    chunk_index=int(payload.get("chunkIndex", 0)),
                    text=str(payload.get("text", "")),
                    metadata=dict(payload.get("metadata", {})),
                )
            )

        return results

    async def delete_document_vectors(
        self,
        document_id: str,
        user_id: str,
        version_id: str | None = None,
    ) -> None:
        """Deletes all vector points associated with a document or version, scoped strictly to the tenant.

        Args:
            document_id: Document ID whose chunk vectors should be wiped.
            user_id: Owning user identifier ensuring tenant isolation.
            version_id: Optional version filter to purge a single revision.

        Raises:
            ValueError: If user_id or document_id is missing.
        """
        if not user_id or not user_id.strip():
            raise ValueError(
                "Multi-tenant security violation: user_id is strictly required for vector deletion."
            )

        if not document_id or not document_id.strip():
            raise ValueError("document_id is strictly required for vector deletion.")

        client = self._get_client()

        must_conditions: list[Any] = [
            FieldCondition(key="userId", match=MatchValue(value=user_id.strip())),
            FieldCondition(
                key="documentId", match=MatchValue(value=document_id.strip())
            ),
        ]

        if version_id and version_id.strip():
            must_conditions.append(
                FieldCondition(
                    key="versionId", match=MatchValue(value=version_id.strip())
                )
            )

        await client.delete(
            collection_name=self._collection_name,
            points_selector=Filter(must=must_conditions),
        )
        logger.info(
            f"Purged vectors for documentId='{document_id}' (versionId='{version_id or 'all'}', userId='{user_id}')."
        )

    async def count_user_vectors(self, user_id: str) -> int:
        """Returns the total number of vector points owned by a specific tenant."""
        if not user_id or not user_id.strip():
            return 0

        client = self._get_client()
        count_response = await client.count(
            collection_name=self._collection_name,
            count_filter=Filter(
                must=[
                    FieldCondition(
                        key="userId", match=MatchValue(value=user_id.strip())
                    )
                ]
            ),
        )
        return count_response.count

    async def get_document_vectors(
        self,
        document_id: str,
        version_id: str | None = None,
        user_id: str | None = None,
    ) -> list[VectorPoint]:
        """Retrieves all vector points and payloads for a specific document.

        Args:
            document_id: The target document ID.
            version_id: Optional specific version filter.
            user_id: Optional tenant isolation filter.

        Returns:
            List of VectorPoint instances sorted by chunk_index.
        """
        if not document_id or not document_id.strip():
            return []

        client = self._get_client()

        must_conditions: list[Any] = [
            FieldCondition(
                key="documentId", match=MatchValue(value=document_id.strip())
            )
        ]
        if version_id and version_id.strip():
            must_conditions.append(
                FieldCondition(
                    key="versionId", match=MatchValue(value=version_id.strip())
                )
            )
        if user_id and user_id.strip():
            must_conditions.append(
                FieldCondition(key="userId", match=MatchValue(value=user_id.strip()))
            )

        scroll_filter = Filter(must=must_conditions)

        all_points: list[VectorPoint] = []
        offset = None

        while True:
            records, next_offset = await client.scroll(
                collection_name=self._collection_name,
                scroll_filter=scroll_filter,
                with_vectors=True,
                with_payload=True,
                limit=100,
                offset=offset,
            )

            for record in records:
                payload = record.payload or {}
                vector_data = record.vector
                if isinstance(vector_data, list):
                    vector_floats = [float(v) for v in vector_data]
                elif isinstance(vector_data, dict) and "default" in vector_data:
                    vector_floats = [float(v) for v in vector_data["default"]]
                else:
                    vector_floats = []

                all_points.append(
                    VectorPoint(
                        id=str(record.id),
                        vector=vector_floats,
                        user_id=str(payload.get("userId", "")),
                        document_id=str(payload.get("documentId", "")),
                        version_id=str(payload.get("versionId", "")),
                        chunk_index=int(payload.get("chunkIndex", 0)),
                        text=str(payload.get("text", "")),
                        metadata=dict(payload.get("metadata", {})),
                    )
                )

            if next_offset is None or not records:
                break
            offset = next_offset

        all_points.sort(key=lambda p: p.chunk_index)
        return all_points

    async def search_batch(
        self,
        query_vectors: list[list[float]],
        filter_out_doc_id: str,
        limit: int = 1,
        score_threshold: float | None = None,
        user_id: str | None = None,
    ) -> list[list[VectorSearchResult]]:
        """Executes a batched similarity search across the vector corpus, explicitly filtering out the source document.

        Args:
            query_vectors: List of query embedding vectors (e.g. one per chunk).
            filter_out_doc_id: The documentId to exclude from search results (preventing self-plagiarism flags).
            limit: Maximum closest matches to return per query vector.
            score_threshold: Optional minimum cosine similarity score cutoff.
            user_id: Optional user filter (if restricting to same tenant's previous works).

        Returns:
            List of search result lists, parallel to the input query_vectors.
        """
        if not query_vectors:
            return []

        client = self._get_client()

        must_not_conditions: list[Any] = []
        if filter_out_doc_id and filter_out_doc_id.strip():
            must_not_conditions.append(
                FieldCondition(
                    key="documentId",
                    match=MatchValue(value=filter_out_doc_id.strip()),
                )
            )

        must_conditions: list[Any] = []
        if user_id and user_id.strip():
            must_conditions.append(
                FieldCondition(key="userId", match=MatchValue(value=user_id.strip()))
            )

        query_filter = Filter(
            must=must_conditions if must_conditions else None,
            must_not=must_not_conditions if must_not_conditions else None,
        )

        requests = [
            QueryRequest(
                query=qv,
                filter=query_filter,
                limit=limit,
                score_threshold=score_threshold,
                with_payload=True,
            )
            for qv in query_vectors
        ]

        batch_responses = await client.query_batch_points(
            collection_name=self._collection_name,
            requests=requests,
        )

        batch_results: list[list[VectorSearchResult]] = []
        for resp in batch_responses:
            query_results: list[VectorSearchResult] = []
            for point in resp.points:
                payload = point.payload or {}
                query_results.append(
                    VectorSearchResult(
                        id=str(point.id),
                        score=float(point.score or 0.0),
                        user_id=str(payload.get("userId", "")),
                        document_id=str(payload.get("documentId", "")),
                        version_id=str(payload.get("versionId", "")),
                        chunk_index=int(payload.get("chunkIndex", 0)),
                        text=str(payload.get("text", "")),
                        metadata=dict(payload.get("metadata", {})),
                    )
                )
            batch_results.append(query_results)

        return batch_results


vector_repository = VectorRepository()
