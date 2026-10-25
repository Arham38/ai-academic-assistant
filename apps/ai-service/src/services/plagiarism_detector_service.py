"""Semantic plagiarism detection service comparing document chunk vectors against corpus in Qdrant."""

import logging
from dataclasses import dataclass, field
from typing import Any

from src.config.ai_settings import ai_settings
from src.infrastructure.database.vector_repository import (
    VectorRepository,
)
from src.infrastructure.database.vector_repository import (
    vector_repository as default_vector_repo,
)

logger = logging.getLogger(__name__)


@dataclass
class MatchedSource:
    """Attribution metadata of a semantically matching source vector."""

    document_id: str
    title: str = "Unknown Document"
    text: str = ""


@dataclass
class FlaggedChunk:
    """Individual text chunk flagged for semantic similarity exceeding thresholds."""

    chunk_index: int
    text: str
    similarity_score: float
    severity: str  # "HIGH" or "MODERATE"
    matched_source: MatchedSource


@dataclass
class PlagiarismReport:
    """Aggregated semantic plagiarism evaluation report."""

    overall_score: float
    flagged_chunks: list[FlaggedChunk] = field(default_factory=list)
    total_chunks: int = 0
    high_risk_count: int = 0
    moderate_risk_count: int = 0

    def to_dict(self) -> dict[str, Any]:
        """Converts report to camelCase dictionary matching API response contract."""
        return {
            "overallScore": self.overall_score,
            "flaggedChunks": [
                {
                    "chunkIndex": chunk.chunk_index,
                    "text": chunk.text,
                    "similarityScore": chunk.similarity_score,
                    "severity": chunk.severity,
                    "matchedSource": {
                        "documentId": chunk.matched_source.document_id,
                        "title": chunk.matched_source.title,
                        "text": chunk.matched_source.text,
                    },
                }
                for chunk in self.flagged_chunks
            ],
            "totalChunks": self.total_chunks,
            "highRiskCount": self.high_risk_count,
            "moderateRiskCount": self.moderate_risk_count,
        }


class PlagiarismDetectorService:
    """Analyzes academic documents for semantic plagiarism via batched vector similarity."""

    def __init__(
        self,
        vector_repository: VectorRepository | None = None,
        threshold_high: float | None = None,
        threshold_moderate: float | None = None,
    ) -> None:
        self._vector_repository = vector_repository
        self._threshold_high = (
            threshold_high
            if threshold_high is not None
            else ai_settings.SIMILARITY_THRESHOLD_HIGH
        )
        self._threshold_moderate = (
            threshold_moderate
            if threshold_moderate is not None
            else ai_settings.SIMILARITY_THRESHOLD_MODERATE
        )

    def _get_vector_repo(self) -> VectorRepository:
        if self._vector_repository is not None:
            return self._vector_repository
        return default_vector_repo

    async def analyze_document(
        self,
        document_id: str,
        version_id: str | None = None,
        user_id: str | None = None,
    ) -> PlagiarismReport:
        """Executes batched semantic comparison for all chunks in target document.

        Workflow:
        1. Query Qdrant for all vectors belonging to document_id.
        2. Construct batched search request with Self-Exclusion filter (documentId != target_id).
        3. Evaluate returned top matches against HIGH and MODERATE thresholds.
        4. Calculate weighted originality score clamped to [0.0, 100.0].

        Args:
            document_id: Target document ID to evaluate.
            version_id: Optional specific document version UUID.
            user_id: Optional tenant isolation scope.

        Returns:
            Structured PlagiarismReport containing aggregate score and flagged chunk details.
        """
        repo = self._get_vector_repo()

        # Step 1: Fetch target document vectors
        target_points = await repo.get_document_vectors(
            document_id=document_id,
            version_id=version_id,
            user_id=user_id,
        )

        total_chunks = len(target_points)
        if total_chunks == 0:
            logger.info(
                f"No vectors found in Qdrant for documentId='{document_id}'. Returning default clean report."
            )
            return PlagiarismReport(
                overall_score=100.0,
                flagged_chunks=[],
                total_chunks=0,
                high_risk_count=0,
                moderate_risk_count=0,
            )

        # Step 2: Extract query vectors
        query_vectors = [p.vector for p in target_points]

        # Step 3: Execute batched search with Self-Exclusion filter
        batch_results = await repo.search_batch(
            query_vectors=query_vectors,
            filter_out_doc_id=document_id,
            limit=1,
            score_threshold=self._threshold_moderate,
        )

        # Step 4: Process matches and assign severity levels
        flagged_chunks: list[FlaggedChunk] = []

        for chunk_point, matches in zip(target_points, batch_results, strict=True):
            if not matches:
                continue

            top_match = matches[0]
            score = top_match.score

            if score >= self._threshold_high:
                severity = "HIGH"
            elif score >= self._threshold_moderate:
                severity = "MODERATE"
            else:
                continue

            matched_title = (
                top_match.metadata.get("title")
                or f"Document_{top_match.document_id[:8]}"
            )

            flagged_chunks.append(
                FlaggedChunk(
                    chunk_index=chunk_point.chunk_index,
                    text=chunk_point.text,
                    similarity_score=round(score, 4),
                    severity=severity,
                    matched_source=MatchedSource(
                        document_id=top_match.document_id,
                        title=matched_title,
                        text=top_match.text,
                    ),
                )
            )

        # Step 5: Calculate weighted aggregate originality score
        high_risk_count = sum(1 for c in flagged_chunks if c.severity == "HIGH")
        moderate_risk_count = sum(1 for c in flagged_chunks if c.severity == "MODERATE")

        # Formula: 100 - (((high_flags * 1.5 + mod_flags * 0.5) / total_chunks) * 100)
        penalty = (
            (high_risk_count * 1.5 + moderate_risk_count * 0.5) / total_chunks
        ) * 100.0
        overall_score = round(max(0.0, min(100.0, 100.0 - penalty)), 1)

        logger.info(
            f"Plagiarism analysis completed for documentId='{document_id}': "
            f"score={overall_score}%, {high_risk_count} HIGH flags, {moderate_risk_count} MODERATE flags "
            f"out of {total_chunks} total chunks."
        )

        return PlagiarismReport(
            overall_score=overall_score,
            flagged_chunks=flagged_chunks,
            total_chunks=total_chunks,
            high_risk_count=high_risk_count,
            moderate_risk_count=moderate_risk_count,
        )


plagiarism_detector_service = PlagiarismDetectorService()
