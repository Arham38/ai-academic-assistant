# ai-academic-assistant

> **Enterprise-Grade AI Academic Assistant Platform**  
> *Semantic Plagiarism Detection, Multi-Agent Retrieval-Augmented Generation (RAG), Automated Citation Integrity Auditing, and Academic Style Analysis.*

---

## 1. Project Overview

The **AI Academic Assistant** is an enterprise-scale educational technology and academic verification ecosystem designed for universities, institutional research labs, and academic authors. 

Traditional plagiarism checkers rely on superficial n-gram string matching that fails to detect paraphrased ideas, structural restructuring, and semantic rewrites. This platform leverages **Dense Semantic Embeddings** (`sentence-transformers/all-MiniLM-L6-v2`), **Vector Similarity Search** (ChromaDB), and **Cyclical Multi-Agent Orchestration** (LangGraph) to deliver deep integrity auditing without high SaaS API costs or data privacy compromises.

---

## 2. Core Capabilities

- **Deep Semantic Plagiarism Detection**: Vector-based semantic similarity scoring identifying direct matches, structural paraphrasing, and cross-document concept duplication.
- **Agentic Multi-Stage Validation (LangGraph)**:
  - **Planner Agent**: Task decomposition and intelligent conditional routing.
  - **Retriever Agent**: Hybrid dense-vector and lexical BM25 retrieval with tenant isolation.
  - **Plagiarism Agent**: High-dimensional cosine matching and source attribution.
  - **Grammar & Style Agent**: Formality, clarity, syntax, and academic tone auditing.
  - **Citation Agent**: Detects orphaned citations, ghost references, and validates APA 7, MLA 9, Chicago 17, and IEEE compliance.
  - **Synthesis Agent**: Holistic evaluation scoring, executive summaries, and reflection loops.
- **Asynchronous Scalable PDF Processing**: Non-blocking Redis/BullMQ task queue architecture capable of processing 100-page dissertations without HTTP gateway timeouts.
- **Real-Time Client Streaming**: Server-Sent Events (SSE) providing live progress telemetry and real-time LLM token streaming.
- **Zero-Trust Multi-Tenancy**: Complete institutional data isolation across MongoDB and ChromaDB with STRIDE security hardening.

---

## 3. High-Level System Architecture

The ecosystem adheres to a **BFF (Backend-For-Frontend) and Microservices Hybrid Architecture** mapped to Domain-Driven Design (DDD) principles:

```
[ React SPA Client (Vite + RTK Query) ]
                   │
                   │ HTTPS / WSS / SSE
                   ▼
    [ Node.js Express Gateway (BFF) ] 
       │ Port 5000: Auth, Validation, Redis Producer, MongoDB Manager
       │
       ├─────────────────────────────────┐
       │ Internal TCP                     │ Internal REST / mTLS
       ▼                                 ▼
[ MongoDB 7.0 ]                   [ Python FastAPI AI Engine ]
(Users, Documents, Reports)        Port 8000: LangGraph, PyTorch, Embeddings
                                         │
                                         ├────────────────────────┐
                                         ▼                        ▼
                                [ ChromaDB Vector Store ]   [ Redis 7.2 ]
                                (Academic Chunks)           (Queue & Pub/Sub)
```

---

## 4. Technology Stack Summary

| Tier | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Redux Toolkit, RTK Query, Lucide Icons, KaTeX |
| **Gateway (BFF)** | Node.js (v20 LTS), Express.js, TypeScript, Zod, Mongoose, BullMQ, Jose (JWT) |
| **AI Microservice** | Python 3.11+, FastAPI, Uvicorn, LangGraph, LangChain-Core, PyTorch, SentenceTransformers |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` (384-dimensional dense vectors) |
| **Datastores** | MongoDB 7.0 (Primary Operational), ChromaDB 0.5+ (Vector Database) |
| **Task Broker & Cache**| Redis 7.2 (Distributed task queue and SSE Pub/Sub) |
| **Document Processing**| `pdfplumber`, `PyPDF`, LangChain RecursiveCharacterTextSplitter |
| **DevOps & Containers**| Docker, Docker Compose |

---

## 5. Architectural Documentation Index (Phase 00)

Comprehensive blueprints and specifications are documented within the [`docs/`](./docs) directory:

- **Architecture Specifications**:
  - [`docs/architecture/001-tech-stack.md`](./docs/architecture/001-tech-stack.md): Technology selection justifications and compatibility matrix.
  - [`docs/architecture/002-agentic-rag-design.md`](./docs/architecture/002-agentic-rag-design.md): LangGraph state machine, agent nodes, chunking, and routing logic.
  - [`docs/architecture/003-system-topology-and-clean-architecture.md`](./docs/architecture/003-system-topology-and-clean-architecture.md): Bounded contexts, Clean Architecture layers, and transport protocols.
- **Architecture Decision Records (ADRs)**:
  - [`docs/architecture/adrs/ADR-001-polyglot-microservices-node-fastapi.md`](./docs/architecture/adrs/ADR-001-polyglot-microservices-node-fastapi.md): Separation of Node.js and FastAPI runtimes.
  - [`docs/architecture/adrs/ADR-002-vector-database-chromadb.md`](./docs/architecture/adrs/ADR-002-vector-database-chromadb.md): ChromaDB selection over Pinecone and raw FAISS.
  - [`docs/architecture/adrs/ADR-003-agentic-orchestration-langgraph.md`](./docs/architecture/adrs/ADR-003-agentic-orchestration-langgraph.md): Multi-agent state machines via LangGraph.
  - [`docs/architecture/adrs/ADR-004-multitenant-isolation-and-security.md`](./docs/architecture/adrs/ADR-004-multitenant-isolation-and-security.md): Multi-tenant isolation and STRIDE threat mitigation.
  - [`docs/architecture/adrs/ADR-005-asynchronous-processing-strategy.md`](./docs/architecture/adrs/ADR-005-asynchronous-processing-strategy.md): Asynchronous BullMQ queue and SSE progress streaming.
- **Visual Diagrams (PlantUML & Mermaid)**:
  - [`docs/diagrams/README.md`](./docs/diagrams/README.md): Interactive rendered Mermaid diagrams.
  - [`docs/diagrams/c4_context.puml`](./docs/diagrams/c4_context.puml): C4 Level 1 System Context Diagram.
  - [`docs/diagrams/c4_container.puml`](./docs/diagrams/c4_container.puml): C4 Level 2 Container Topology Diagram.
  - [`docs/diagrams/c4_component.puml`](./docs/diagrams/c4_component.puml): C4 Level 3 Component Breakdown Diagram.
  - [`docs/diagrams/sequence_plagiarism_scan.puml`](./docs/diagrams/sequence_plagiarism_scan.puml): End-to-end PDF scan workflow.
  - [`docs/diagrams/sequence_agentic_rag.puml`](./docs/diagrams/sequence_agentic_rag.puml): Real-time conversational RAG stream.
- **Data Models**:
  - [`docs/data_models/conceptual_schema.md`](./docs/data_models/conceptual_schema.md): High-level MongoDB schemas, ChromaDB collections, and surrogate keys.
- **API Contracts**:
  - [`docs/api_contracts/openapi_node_gateway.yaml`](./docs/api_contracts/openapi_node_gateway.yaml): OpenAPI 3.1 specification for Node.js API Gateway.
  - [`docs/api_contracts/openapi_fastapi_ai.yaml`](./docs/api_contracts/openapi_fastapi_ai.yaml): OpenAPI 3.1 specification for Python FastAPI AI Service.
  - [`docs/api_contracts/contracts_overview.md`](./docs/api_contracts/contracts_overview.md): API error contracts, SSE protocols, and internal headers.

---

## 6. Implementation Roadmap

```
[ Phase 00: Architecture & Research ] ◄── (Current Phase: COMPLETED)
                │
                ▼
[ Phase 01: Project Foundation & Tooling Setup ]
  - Monorepo/Multi-service scaffolding (Docker Compose, TS/Python linting)
                │
                ▼
[ Phase 02: Core Backend Development (Node.js & MongoDB) ]
  - Auth, Multi-tenant middleware, Document upload ingestion, BullMQ
                │
                ▼
[ Phase 03: AI Engine Development (FastAPI, LangGraph & ChromaDB) ]
  - Extraction pipeline, Embeddings, Multi-Agent LangGraph graph execution
                │
                ▼
[ Phase 04: Frontend Development (React, Vite, RTK & Tailwind) ]
  - Auth screens, Drag-and-drop uploader, Real-time progress bars, Diff viewers
                │
                ▼
[ Phase 05: Integration, End-to-End Testing & Verification ]
  - Circuit breakers, STRIDE penetration testing, Multi-tenant load tests
                │
                ▼
[ Phase 06: Production Deployment & CI/CD Hardening ]
  - Kubernetes / Docker Swarm manifests, Observability (OpenTelemetry), SSL
```

---

## 7. License

Licensed under the [MIT License](./LICENSE) (or Institutional Enterprise License).
