"""Central LangGraph agent state dictionary."""

from typing import Any, TypedDict


class AcademicAgentState(TypedDict):
    """Global state shared across all LangGraph nodes."""

    document_id: str
    tenant_id: str
    user_id: str
    raw_text: str
    chunks: list[dict[str, Any]]
    execution_plan: list[str]
    retrieved_contexts: list[dict[str, Any]]
    plagiarism_matches: list[dict[str, Any]]
    grammar_issues: list[dict[str, Any]]
    citation_issues: list[dict[str, Any]]
    aggregate_score: float
    executive_summary: str
    iteration_count: int
    is_completed: bool
    errors: list[str]
