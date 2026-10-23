# Architecture Decision Record (ADR) 003

## ADR-003: Agentic Orchestration: LangGraph over Standard LangChain and Linear Chains

- **Status:** Accepted
- **Deciders:** Principal Architect, AI Lead
- **Date:** 2026-10-23
- **Technical Domain:** Multi-Agent Orchestration & Workflow Automation

---

### Context & Problem Statement

Evaluating an academic paper requires non-linear, multi-faceted analysis. An academic paper cannot be evaluated simply by chaining prompt A into prompt B (a linear DAG). For example:

- If the Plagiarism Agent flags high semantic similarity in Section 3, the Citation Agent must inspect whether Section 3 contains an explicit, valid attribution before declaring an academic misconduct violation.
- If the Synthesis Agent detects that the Grammar Agent's suggested replacement alters the mathematical meaning of an equation, it must trigger a reflection loop to request an alternative phrasing.
- If an agent produces malformed JSON or hallucinates a source, the orchestrator must self-correct rather than crashing the pipeline.

Standard LangChain chains (`LLMChain`, `SequentialChain`) are strictly acyclic, stateless, and brittle when unexpected execution branches arise.

### Considered Options

1. **Option 1: Standard LangChain (Sequential / Expression Language - LCEL)**:
   - _Limitations_: Purely acyclic DAGs; cannot easily implement cyclical reflection loops, self-correction, or conditional branching based on multi-agent consensus.
2. **Option 2: Microsoft AutoGen**:
   - _Limitations_: Chat-based agent conversations lack deterministic state schemas; high propensity for non-deterministic multi-agent chatter and token waste; challenging to enforce rigid enterprise report schemas.
3. **Option 3: LangGraph (Stateful Multi-Agent Cyclic Graph)**:
   - _Strengths_: Explicit state machine modeled as a directed graph with cycles; fine-grained conditional edges; persistence and checkpointing; deterministic termination limits; built natively on LangChain-core.

### Decision Outcome

**Chosen Option: Option 3 (LangGraph)**.

The AI evaluation pipeline will be built using LangGraph state machines. All agent nodes operate over a shared, strictly validated `AcademicAgentState` dictionary.

### Design Principles in LangGraph

1. **Explicit Cyclical Reflection**: The graph permits cycles between the Synthesis Agent and execution agents (up to `max_iterations = 3`), enabling automated self-correction of ambiguous findings.
2. **Deterministic State Invariants**: LangGraph state updates are functional and trackable via checkpoints.
3. **Graceful Fallback on Recursion Limits**: LangGraph's built-in `recursion_limit` parameter ensures that runaway agent loops terminate safely, returning intermediate findings without exhausting LLM budgets.

### Positive Consequences

- **Robust Multi-Agent Coordination**: Clear separation between Planner, Plagiarism, Grammar, Citation, and Synthesis sub-agents.
- **Auditable Execution Trace**: Every state transition between nodes is logged and can be exported as a timeline for academic review.
- **Zero Hallucination Loops**: Deterministic branching logic prevents agents from looping infinitely.

### Negative Consequences & Mitigation

- **State Schema Overhead**: Requires rigorous typing and validation of the central state object.
  - _Mitigation_: Leverage Pydantic v2 schemas to validate state transitions at every node boundary.
