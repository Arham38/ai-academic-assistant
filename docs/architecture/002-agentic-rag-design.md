# Architecture Specification: Agentic RAG & Multi-Agent Orchestration

- **Document ID:** ARCH-002
- **Phase:** 00 - Project Research & Software Architecture
- **Status:** Approved
- **Author:** AI & Systems Architecture Team
- **Target Microservice:** Python FastAPI (`/ai-engine`)

---

## 1. Architectural Philosophy

Standard naive Retrieval-Augmented Generation (RAG)—consisting of a linear pipeline of `Query -> Embed -> Vector Top-K -> LLM Generation`—consistently fails in academic contexts. Academic documents exhibit dense technical jargon, complex inter-sentence dependency structures, mathematical formulations, and strict citation formatting requirements. Linear RAG pipelines suffer from:

1. **Context Fragmentation**: Splitting text into arbitrary chunk sizes destroys semantic context across section boundaries.
2. **Hallucination in Citations**: LLMs generate plausible but non-existent academic references ("ghost citations").
3. **Inability to Self-Correct**: Without a cyclical feedback mechanism, false positives in plagiarism detection or style critiques cannot be re-evaluated.

To resolve these failure modes, this architecture implements an **Agentic State Machine** utilizing **LangGraph**. The workflow treats academic validation as a distributed multi-agent reasoning problem governed by a single, strictly typed state object with dynamic conditional routing, reflection loops, and deterministic execution guards.

---

## 2. Multi-Agent Topology & State Graph

```
                            ┌─────────────────────┐
                            │    Start / Input    │
                            └──────────┬──────────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │    Planner Agent    │
                            │ (Intent & Routing)  │
                            └──────────┬──────────┘
                                       │
                     ┌─────────────────┼─────────────────┐
                     ▼                 ▼                 ▼
             ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
             │ Plagiarism    │ │  Grammar &    │ │   Citation    │
             │ Agent         │ │  Style Agent  │ │   Agent       │
             └───────┬───────┘ └───────┬───────┘ └───────┬───────┘
                     │                 │                 │
                     │         ┌───────┴───────┐         │
                     └────────►│ Retriever     │◄────────┘
                               │ Agent         │
                               └───────┬───────┘
                                       │
                                       ▼
                            ┌─────────────────────┐
                            │   Synthesis Agent   │
                            │ (Report Aggregator) │
                            └──────────┬──────────┘
                                       │
                           [ Quality Check Passed? ]
                                  │         │
                             No   │         │ Yes
                      (Loops < 3) │         │
                                  ▼         ▼
                        [ Re-plan / Refine ] [ Final Output ]
```

### 2.1 Graph Nodes & Responsibilities

1. **Planner Agent (Router & Orchestrator)**:
   - Evaluates the incoming request (e.g., "Full Document Analysis", "Targeted Citation Check", "Semantic Search Query").
   - Analyzes document structural metadata (length, presence of bibliography, abstract).
   - Generates an execution DAG (Directed Acyclic Graph) determining which sub-agents must run and in what order.

2. **Retriever Agent (Context Engine)**:
   - Executes dense vector retrieval against ChromaDB using `sentence-transformers/all-MiniLM-L6-v2`.
   - Combines vector search with keyword-based BM25 filtering (Hybrid Search) to capture exact academic author names and specific equations.
   - Enforces strict multi-tenant boundary filters (`tenant_id == current_tenant`).

3. **Plagiarism Analysis Agent (Semantic Matcher)**:
   - Compares document chunks against internal institutional corpora and indexed academic repositories.
   - Computes Cosine Similarity thresholds:
     - Similarity $\ge 0.88$: Direct Plagiarism (verbatim match).
     - $0.75 \le \text{Similarity} < 0.88$: Paraphrased Semantic Plagiarism.
     - $\text{Similarity} < 0.75$: Original academic expression.
   - Flags overlapping character spans and returns attribution links.

4. **Grammar & Academic Style Agent (Linguistic Auditor)**:
   - Evaluates text against formal academic prose standards (e.g., elimination of colloquialisms, active/passive voice balance, clarity, conciseness).
   - Categorizes findings into `CRITICAL`, `WARNING`, and `SUGGESTION`.
   - Generates diffs with exact character replacement offsets.

5. **Citation Agent (Integrity & Format Validator)**:
   - Scans in-text citations (e.g., `(Smith et al., 2021)`, `[14]`) and cross-references them against the document's Bibliography/Works Cited section.
   - Detects orphaned citations (cited in text but missing from bibliography) and unused references.
   - Validates formatting against APA 7th, MLA 9th, Chicago 17th, and IEEE specifications.
   - Executes anti-hallucination verification using DOI / CrossRef lookup heuristics.

6. **Synthesis Agent (Consolidator & Humanizer)**:
   - Merges outputs from the Plagiarism, Grammar, and Citation sub-agents.
   - Computes an aggregate "Academic Integrity Score" (0–100%).
   - Generates an Executive Summary and structured Markdown report.
   - Implements a self-reflection loop: if the output contains contradictory findings or confidence scores below threshold, routes back for a single refinement iteration.

---

## 3. Shared State Schema Specification

LangGraph coordinates state across all nodes using a shared, append-only or dictionary-mutated state container.

```python
from typing import TypedDict, List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ChunkMetadata(BaseModel):
    chunk_id: str
    doc_id: str
    tenant_id: str
    page_number: int
    paragraph_index: int
    char_start: int
    char_end: int

class PlagiarismMatch(BaseModel):
    chunk_id: str
    source_title: str
    source_url: Optional[str]
    similarity_score: float
    matched_text: str
    matched_source_text: str
    char_offset_start: int
    char_offset_end: int

class GrammarIssue(BaseModel):
    issue_id: str
    issue_type: str  # e.g., 'PASSIVE_VOICE', 'INFORMAL_TONE', 'SYNTAX'
    severity: str    # 'CRITICAL', 'WARNING', 'SUGGESTION'
    original_text: str
    suggested_replacement: str
    explanation: str
    char_offset_start: int
    char_offset_end: int

class CitationIssue(BaseModel):
    citation_id: str
    citation_text: str
    citation_style: str  # 'APA', 'MLA', 'IEEE', 'CHICAGO'
    is_orphaned: bool
    is_valid_format: bool
    external_doi_found: Optional[bool]
    remediation_suggestion: str

class AcademicAgentState(TypedDict):
    """
    Central state container passed across all LangGraph nodes.
    """
    # Request Identifiers
    document_id: str
    tenant_id: str
    user_id: str
    session_id: str

    # Document Payloads
    raw_text: str
    metadata: Dict[str, Any]
    chunks: List[Dict[str, Any]]

    # Execution Routing State
    execution_plan: List[str]
    active_agent: str
    iteration_count: int
    max_iterations: int

    # Agent Analysis Artifacts
    retrieved_contexts: List[Dict[str, Any]]
    plagiarism_matches: List[PlagiarismMatch]
    grammar_issues: List[GrammarIssue]
    citation_issues: List[CitationIssue]

    # Synthesis & Results
    aggregate_score: float
    executive_summary: str
    structured_report: Dict[str, Any]

    # Error Handling & Telemetry
    errors: List[str]
    is_completed: bool
```

---

## 4. Chunking & Semantic Boundary Preservation

Arbitrary fixed-character chunking destroys academic meaning (e.g., cutting a mathematical theorem or split citation across boundaries). The ingestion pipeline applies a **Context-Aware Recursive Chunking Strategy**:

```
Document Text
    │
    ▼
[ Structural Splitting ] (Split by Section Headers: Abstract, Intro, Methodology, Results)
    │
    ▼
[ Paragraph Splitting ] (Split by Double Newlines `\n\n`)
    │
    ▼
[ Sentence Splitting ] (Split by Sentence Boundaries using Spacy / NLTK regex)
    │
    ▼
[ Token Budget Verification ] (Target: 500 tokens | Overlap: 50 tokens)
```

### 4.1 Token Budget Specifications

- **Chunk Size**: `500 tokens` (approximately 2,000 characters). This fits comfortably within the 512-token context window of `sentence-transformers/all-MiniLM-L6-v2` without truncation.
- **Overlap**: `50 tokens` (10% sliding window). Ensures that sentences spanning chunk boundaries retain full semantic coherence.
- **Metadata Enriched Indexing**: Each chunk injected into ChromaDB contains:
  ```json
  {
    "id": "chk_98a72b14",
    "document_id": "doc_67b31c9a",
    "tenant_id": "org_stanford_cs",
    "user_id": "usr_44a90f",
    "page_number": 4,
    "section": "Methodology",
    "token_count": 482,
    "char_start": 4120,
    "char_end": 6050
  }
  ```

---

## 5. Termination Guards & Anti-Hallucination Controls

To guarantee that autonomous multi-agent loops never enter infinite self-critique cycles or trigger unbounded LLM spending:

1. **Deterministic Iteration Limits**: The graph state enforces `max_iterations = 3`. If the Synthesis Agent fails its self-consistency check on the 3rd iteration, the loop terminates immediately, logs a warning, and outputs the highest-scoring intermediate report.
2. **Temperature Control**:
   - Planner Agent: `temperature = 0.0` (strict deterministic routing).
   - Citation & Plagiarism Agents: `temperature = 0.0` (zero tolerance for imaginative assertions).
   - Grammar & Style Agent: `temperature = 0.2` (slight variance for linguistic fluidity).
   - Synthesis Agent: `temperature = 0.3` (executive summary generation).
3. **Citation Cross-Validation Guard**: Any citation reported as non-existent must be validated by string match against the document's raw bibliography before inclusion in the final report.
