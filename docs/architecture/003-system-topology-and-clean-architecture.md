# Architecture Specification: System Topology & Clean Architecture

- **Document ID:** ARCH-003
- **Phase:** 00 - Project Research & Software Architecture
- **Status:** Approved
- **Author:** Enterprise Architecture Team
- **Scope:** Full Ecosystem (Node.js Gateway, Python AI Engine, React SPA, Datastores)

---

## 1. Domain-Driven Design (DDD): Bounded Contexts

To prevent enterprise software from devolving into an unmaintainable "Big Ball of Mud," the system is strictly partitioned into four explicit **Bounded Contexts**. Each context defines its own domain models, business invariants, and ubiquitous language.

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             ENTERPRISE PLATFORM                          │
│                                                                          │
│  ┌───────────────────────────────┐     ┌───────────────────────────────┐  │
│  │   Identity & Access Context   │     │ Document Ingestion & Storage  │  │
│  │  - User Entity, Role, Quota   │     │  - Document Aggregate         │  │
│  │  - Organization / Tenant      │◄────│  - Storage URI, Metadata      │  │
│  │  - JWT & Permission Invariants│     │  - Extraction Status          │  │
│  └──────────────┬────────────────┘     └──────────────┬────────────────┘  │
│                 │                                     │                   │
│                 │                                     │                   │
│                 ▼                                     ▼                   │
│  ┌───────────────────────────────┐     ┌───────────────────────────────┐  │
│  │ Analytics & Reporting Context │     │  AI Orchestration & Eval      │  │
│  │  - AnalysisReport Aggregate   │◄────│  - Agent Execution State      │  │
│  │  - Plagiarism Score Card      │     │  - Vector Embeddings / Chunks │  │
│  │  - Audit Logs & Usage Metrics │     │  - Multi-Agent Synthesis      │  │
│  └───────────────────────────────┘     └───────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### 1.1 Context Boundaries & Responsibilities

1. **Identity & Access Management (IAM) Context**:
   - **Boundary**: Node.js / Express Core Service.
   - **Entities**: `User`, `Tenant`, `SubscriptionTier`, `Role`, `ApiKey`.
   - **Invariants**: A user belongs to exactly one tenant; quota limits must be verified prior to document dispatch; tokens are cryptographically signed.

2. **Document Ingestion & Storage Context**:
   - **Boundary**: Node.js Gateway & File Storage Layer (Local Disk/S3/MinIO).
   - **Entities**: `Document`, `DocumentVersion`, `FileMetadata`, `MimeSignature`.
   - **Invariants**: Files must not exceed 50MB; files must strictly validate against PDF magic bytes (`%PDF-`); duplicate uploads within the same tenant are rejected via SHA-256 fingerprint matching.

3. **AI Orchestration & Semantic Evaluation Context**:
   - **Boundary**: Python FastAPI Microservice.
   - **Entities**: `AgentState`, `TextChunk`, `DenseEmbeddingVector`, `PlagiarismEvidence`, `GrammarAnnotation`, `CitationVerification`.
   - **Invariants**: Chunk embeddings must match dimension 384; vector retrieval must strictly filter by `tenant_id`; multi-agent loops must abort if execution cycles exceed 3.

4. **Analytics & Reporting Context**:
   - **Boundary**: Shared Node.js & MongoDB Datastore.
   - **Entities**: `AnalysisReport`, `PlagiarismCluster`, `ExecutionAuditLog`.
   - **Invariants**: Completed reports are immutable; any recalculation creates an incremental revision record.

---

## 2. Clean Architecture Structural Blueprint

Both the Node.js API Gateway and the Python FastAPI Microservice are organized in accordance with **Uncle Bob's Clean Architecture** (Onion Architecture), guaranteeing that core business rules remain completely decoupled from third-party frameworks, databases, and network transports.

```
       ┌───────────────────────────────────────────────────────────┐
       │ 1. Frameworks & Drivers (Express, FastAPI, Mongo, Chroma) │
       │   ┌───────────────────────────────────────────────────┐   │
       │   │ 2. Interface Adapters (Controllers, Repositories) │   │
       │   │   ┌───────────────────────────────────────────┐   │   │
       │   │   │ 3. Application Use Cases (ProcessDocument)│   │   │
       │   │   │   ┌───────────────────────────────────┐   │   │   │
       │   │   │   │ 4. Domain Entities & Invariants   │   │   │   │
       │   │   │   └───────────────────────────────────┘   │   │   │
       │   │   └───────────────────────────────────────────┘   │   │
       │   └───────────────────────────────────────────────────┘   │
       └───────────────────────────────────────────────────────────┘
```

### 2.1 Layer Responsibilities

#### Layer 4: Domain Entities (Core)
- Pure enterprise data structures and validation invariants.
- **Node.js**: TypeScript classes / pure types (e.g., `User`, `DocumentMetadata`).
- **Python**: Pydantic / dataclass domain objects (e.g., `PlagiarismMatch`, `Chunk`).
- Zero external dependencies.

#### Layer 3: Application Use Cases
- Contains application-specific business workflows.
- Implements use cases: `UploadDocumentUseCase`, `RunPlagiarismScanUseCase`, `StreamAgentAnalysisUseCase`.
- Communicates solely through abstract repository and service interfaces.

#### Layer 2: Interface Adapters
- Translates data between use cases and external representations.
- **Controllers**: Express route handlers, FastAPI endpoint routers.
- **Repositories**: Concrete implementations of domain repository interfaces (e.g., `MongoDocumentRepository`, `ChromaVectorRepository`).
- **Serializers / Presenters**: DTOs, JSON converters, SSE formatters.

#### Layer 1: Frameworks & Drivers (Outer Ring)
- Concrete infrastructure details: Express server instance, FastAPI ASGI app, Mongoose connection pool, ChromaDB client, Redis connection.
- Code in this ring can be swapped without touching a single line of business logic in layers 3 or 4.

---

## 3. Communication Strategy: Synchronous vs. Asynchronous

Enterprise AI workloads have wildly divergent latency characteristics:
- User authentication and profile queries execute in `< 30ms`.
- Interactive conversational RAG queries execute in `1.5s - 3s`.
- 50-page PDF semantic scans and multi-agent cross-referencing require `15s - 60s`.

Attempting to process full academic documents over a blocking synchronous HTTP request results in connection timeouts (`504 Gateway Timeout`), reverse proxy thread exhaustion, and broken user sessions.

### 3.1 Tiered Transport Architecture

| Operation Type | Transport Protocol | Path / Mechanism | Latency SLA | Error Handling |
| :--- | :--- | :--- | :--- | :--- |
| **Authentication & Metadata** | Synchronous REST (HTTP/2) | `POST /api/v1/auth/login`<br>`GET /api/v1/documents` | `< 150ms` | Immediate HTTP error response (4xx/5xx). |
| **Conversational RAG Chat** | Server-Sent Events (SSE) | `GET /api/v1/chat/stream?query=...` | First token `< 1.2s` | Streamed JSON error frame; graceful client retry. |
| **Full PDF Document Scan** | Asynchronous Queue + SSE | `POST /api/v1/documents/scan` (Returns Job ID)<br>Progress via SSE: `/api/v1/jobs/:id/events` | Async background (`15s - 60s`) | Automatic queue retry (up to 3 times) with exponential backoff. |
| **Gateway ➔ AI Microservice** | Internal REST + Service Auth | `POST http://fastapi-ai:8000/internal/v1/analyze` | Dedicated pool | Circuit Breaker pattern with 10s fallback threshold. |

---

## 4. Resilience, Fault Isolation & Circuit Breakers

1. **Process Isolation**: The Node.js event loop will never block during heavy mathematical embedding calculations because all model execution resides in isolated Python processes.
2. **Circuit Breaker Pattern**: If the Python AI microservice encounters memory pressure or crashes during an unexpected spike, the Node.js API Gateway trips a circuit breaker (via `opossum` or native middleware) after 5 consecutive failures, immediately serving a cached response or a `503 Service Degraded` notice without cascading failures to the authentication or user document dashboards.
3. **Graceful Degradation**: If vector retrieval against ChromaDB times out, the Citation and Grammar agents will still execute their lexical checks, flagging the Plagiarism analysis as "Temporarily Pending".
