# Architectural Diagrams Reference

This directory contains the visual blueprints for the **AI Academic Assistant** platform. 

The primary source files are written in **PlantUML** (`.puml`) for C4 Model validation and CI/CD diagram generation. Below, interactive **Mermaid.js** diagrams are provided for immediate rendering in GitHub, IDEs, and browser markdown viewers.

---

## 1. System Context Diagram (C4 Level 1)
Source: [`c4_context.puml`](./c4_context.puml)

```mermaid
flowchart TD
    subgraph Users ["Actors & Users"]
        Student["Student / Author<br><i>Submits papers, views plagiarism & grammar feedback</i>"]
        Researcher["Academic Researcher<br><i>Conducts literature RAG & citation analysis</i>"]
        Admin["Institutional Admin<br><i>Manages quotas, audits & user permissions</i>"]
    end

    subgraph SystemBoundary ["AI Academic Assistant Platform"]
        App["Core AI Academic Assistant Ecosystem<br><i>Plagiarism, Grammar, Citations & Agentic RAG</i>"]
    end

    subgraph ExternalSystems ["External Services"]
        CrossRef["CrossRef / OpenAlex API<br><i>DOI metadata & academic catalog</i>"]
        S3["Object Storage (S3 / MinIO)<br><i>Encrypted PDF & artifact storage</i>"]
        SMTP["Institutional Email / SMTP<br><i>Scan notices & alerts</i>"]
    end

    Student -->|Uploads papers, views reports| App
    Researcher -->|Queries research corpus via RAG| App
    Admin -->|Configures policies & audits| App

    App -->|Resolves DOIs & citations| CrossRef
    App -->|Persists & retrieves raw PDFs| S3
    App -->|Sends notifications| SMTP
```

---

## 2. Container Diagram (C4 Level 2)
Source: [`c4_container.puml`](./c4_container.puml)

```mermaid
flowchart TD
    User(["User (Student / Researcher / Admin)"])

    subgraph PlatformBoundary ["AI Academic Assistant Ecosystem"]
        SPA["React 18 SPA (Vite + Tailwind)<br><i>Interactive dashboard, diffs & RAG chat</i>"]
        BFF["Node.js Express API Gateway (BFF)<br><i>Auth, JWT, Rate Limiting, Business Logic</i>"]
        Redis["Redis 7.2 Broker & Cache<br><i>BullMQ task queue & Pub/Sub events</i>"]
        FastAPI["Python FastAPI AI Microservice<br><i>LangGraph, SentenceTransformers, PyTorch</i>"]
        MongoDB[("MongoDB 7.0<br><i>Users, Documents, Reports, Audit Logs</i>")]
        ChromaDB[("ChromaDB Vector Store<br><i>384-dim Chunks, Tenant Metadata</i>")]
        Storage[("MinIO / S3 Object Store<br><i>Raw PDF Documents</i>")]
    end

    CrossRefExt["CrossRef / OpenAlex API"]

    User -->|HTTPS| SPA
    SPA -->|REST API, Uploads & SSE| BFF
    BFF -->|Reads / Writes| MongoDB
    BFF -->|Enqueues scan jobs| Redis
    BFF -->|Stores encrypted PDFs| Storage
    FastAPI -->|Consumes scan jobs| Redis
    FastAPI -->|Stores & queries vectors| ChromaDB
    FastAPI -->|Validates academic DOIs| CrossRefExt
    BFF -->|Sync Agent Queries (mTLS)| FastAPI
```

---

## 3. Component Diagram (C4 Level 3)
Source: [`c4_component.puml`](./c4_component.puml)

```mermaid
flowchart LR
    subgraph BFF_Comp ["Node.js Express Gateway Components"]
        AuthController["Auth Controller"]
        DocController["Document Controller"]
        SSEController["SSE Stream Controller"]
        AuthMiddleware["JWT & RBAC Middleware"]
        DocService["Document Ingestion Service"]
        QueueAdapter["BullMQ Queue Publisher"]
        UserRepo["User Repository"]
        DocRepo["Document Repository"]
    end

    subgraph AI_Comp ["Python FastAPI AI Engine Components"]
        QueueWorker["Queue Worker / Router"]
        PDFExtractor["PDF Layout Extractor"]
        Chunker["Recursive Semantic Chunker"]
        Embedder["SentenceTransformers (all-MiniLM-L6-v2)"]
        LangGraphRuntime["LangGraph Multi-Agent State Machine"]
        ChromaAdapter["Vector Repository Client"]
    end

    DocController --> AuthMiddleware
    DocController --> DocService
    DocService --> QueueAdapter
    DocService --> DocRepo
    QueueWorker --> PDFExtractor
    PDFExtractor --> Chunker
    Chunker --> Embedder
    Embedder --> ChromaAdapter
    QueueWorker --> LangGraphRuntime
    LangGraphRuntime --> ChromaAdapter
```

---

## 4. Sequence Diagram: Document Plagiarism Scan Workflow
Source: [`sequence_plagiarism_scan.puml`](./sequence_plagiarism_scan.puml)

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Browser)
    participant SPA as React Client
    participant BFF as Node.js Gateway
    participant Redis as Redis Queue & PubSub
    participant AI as FastAPI AI Worker
    participant VectorDB as ChromaDB
    participant Mongo as MongoDB

    User->>SPA: Upload PDF Document
    SPA->>BFF: POST /api/v1/documents/upload
    BFF->>BFF: Validate JWT, Tenant Quotas, Magic Bytes & SHA-256
    BFF->>Mongo: Insert Document (Status: QUEUED)
    BFF->>Redis: Enqueue Job 'scan-document'
    BFF-->>SPA: HTTP 202 Accepted {jobId, docId}

    SPA->>BFF: Connect GET /api/v1/jobs/{jobId}/events (SSE)
    BFF->>Redis: Subscribe to job:{jobId}:progress

    Redis->>AI: Worker pops job
    AI->>Redis: Progress: EXTRACTING (15%)
    Redis-->>SPA: SSE Event: Progress 15%

    AI->>AI: Parse layout & recursive chunking (500 tokens, 50 overlap)
    AI->>Redis: Progress: EMBEDDING (40%)
    Redis-->>SPA: SSE Event: Progress 40%

    AI->>VectorDB: Upsert chunks with tenant metadata
    AI->>Redis: Progress: AGENTIC_ANALYSIS (70%)
    Redis-->>SPA: SSE Event: Progress 70%

    AI->>AI: Execute LangGraph (Planner, Plagiarism, Grammar, Citation, Synthesis)
    AI->>Mongo: Persist AnalysisReport & Update Document (Status: COMPLETED)
    AI->>Redis: Progress: COMPLETED (100%)
    Redis-->>SPA: SSE Event: Finished with reportId

    SPA->>BFF: GET /api/v1/reports/{reportId}
    BFF->>Mongo: Fetch Report
    Mongo-->>BFF: Analysis JSON
    BFF-->>SPA: HTTP 200 OK
    SPA-->>User: Render Interactive Integrity Dashboard
```

---

## 5. Sequence Diagram: Conversational Agentic RAG Workflow
Source: [`sequence_agentic_rag.puml`](./sequence_agentic_rag.puml)

```mermaid
sequenceDiagram
    autonumber
    actor Researcher as Researcher
    participant SPA as React Chat UI
    participant BFF as Node.js Gateway
    participant AI as FastAPI AI Engine
    participant LangGraph as LangGraph Orchestrator
    participant Chroma as ChromaDB

    Researcher->>SPA: Submits Prompt ("Analyze methodology gaps")
    SPA->>BFF: POST /api/v1/chat/completions (Stream: true)
    BFF->>BFF: Verify JWT & Token Bucket Limit
    BFF->>AI: POST /internal/v1/agent/query

    AI->>LangGraph: Initialize State & Run Multi-Agent Graph
    LangGraph->>LangGraph: Planner Agent: Decompose & plan retrieval
    LangGraph->>Chroma: Hybrid Query (Dense + BM25, Tenant Filter)
    Chroma-->>LangGraph: Relevant Academic Context Chunks
    LangGraph->>LangGraph: Specialist Agents run validation
    LangGraph->>LangGraph: Synthesis Agent begins streaming response

    LangGraph-->>AI: Stream token chunk 1
    AI-->>BFF: Stream token chunk 1
    BFF-->>SPA: SSE data: {'token': 'In'}
    SPA-->>Researcher: Renders token in real-time

    LangGraph-->>AI: Stream subsequent tokens...
    AI-->>BFF: Stream tokens...
    BFF-->>SPA: SSE data: {'token': '...'}
    SPA-->>Researcher: Incremental UI update

    LangGraph-->>AI: Final citations metadata frame
    AI-->>BFF: Stream complete
    BFF-->>SPA: SSE event: done
    SPA-->>Researcher: Render citation badges & confidence scores
```
