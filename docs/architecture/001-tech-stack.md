# Architecture Specification: Technology Stack & Tooling Manifest

- **Document ID:** ARCH-001
- **Phase:** 00 - Project Research & Software Architecture
- **Status:** Approved
- **Author:** System Architecture Team
- **Target System:** AI Academic Assistant Enterprise Platform

---

## 1. Executive Summary

The AI Academic Assistant is an enterprise-grade academic verification and reasoning platform engineered to perform deep semantic plagiarism detection, real-time grammar and stylistic auditing, automated citation validation, and conversational agentic retrieval-augmented generation (RAG).

To balance high-throughput I/O (user management, real-time client sessions, document streaming) with extreme compute/memory-bound operations (tensor manipulation, transformer embeddings, multi-agent cyclical graph traversal), the system adopts a **Polyglot Distributed Architecture**:
1. **Node.js (Express / TypeScript)**: Serving as the Backend-For-Frontend (BFF), API Gateway, Identity Orchestrator, and Transactional Coordinator.
2. **Python 3.11+ (FastAPI / Uvicorn)**: Serving as the specialized Artificial Intelligence and Machine Learning microservice.
3. **React 18+ (Vite / TypeScript)**: Serving as the client-side single page application (SPA).
4. **Hybrid Persistence Layer**: Document Store (MongoDB) for transactional consistency paired with an Embedded/Client-Server Vector Store (ChromaDB) for high-dimensional semantic search.

---

## 2. Technology Stack Matrix

| Layer / Domain | Technology | Version | Rationale & Trade-off Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | `^18.3.0` | Declarative UI, Concurrent Mode rendering for streaming AI tokens, extensive ecosystem. |
| **Frontend Build Tool** | Vite | `^5.4.0` | Sub-second Hot Module Replacement (HMR), optimized Rollup-based tree-shaking and bundle splitting. |
| **Frontend Language** | TypeScript | `^5.5.0` | Strict type safety, shared domain interfaces with Node.js backend, early error detection. |
| **UI Component Architecture** | Tailwind CSS + Lucide Icons | `^3.4.0` | Atomic utility styling, zero-runtime CSS overhead, consistent design tokens across complex dashboards. |
| **State Management** | Redux Toolkit (RTK) + RTK Query | `^2.2.0` | Predictable centralized state for auth/app settings; RTK Query handles automated caching, deduplication, and polling. |
| **Real-time Client Transport**| Server-Sent Events (SSE) / Socket.io-client | `^4.7.0` | Low-latency streaming of agent tokens and asynchronous PDF processing progress indicators. |
| **Math / Markdown Rendering** | KaTeX + React-Markdown | `^0.16.0` | Real-time parsing of LaTeX formulas and academic Markdown citations in LLM responses. |
| **API Gateway & BFF** | Node.js + Express.js | Node `v20.x LTS`, Express `^4.19.0` | Non-blocking event loop ideal for high-concurrency client multiplexing; unified TypeScript runtime. |
| **Gateway Validation & Security**| Zod + Helmet + CORS | `^3.23.0` | Strict runtime schema parsing, HTTP header hardening, cross-origin protection. |
| **AI Microservice** | Python + FastAPI | Python `3.11+`, FastAPI `^0.112.0` | Native asynchronous ASGI support, Pydantic v2 data validation, first-class ecosystem for PyTorch and LangGraph. |
| **ASGI Server** | Uvicorn (uvloop + httptools) | `^0.30.0` | Ultra-fast ASGI web server implementation written in Cython. |
| **Agentic Orchestration** | LangGraph + LangChain-Core | LangGraph `^0.2.0`, LangChain `^0.2.0` | Cyclical graph execution, fine-grained state checkpoints, multi-agent collaboration, deterministic termination guards. |
| **Embedding Model** | `sentence-transformers/all-MiniLM-L6-v2` | SentenceTransformers `^3.0.0` | 384-dimensional dense vectors, 80ms inference per paragraph on CPU, zero API billing, total privacy compliance. |
| **Vector Database** | ChromaDB | `^0.5.4` | Self-hosted, lightweight vector store with rich metadata filtering for multi-tenant document isolation. |
| **Primary Datastore** | MongoDB Community / Atlas | `v7.0+` | Flexible JSON document schema for heterogeneous academic reports, ACID transactions across collections. |
| **Object Data Modeling (Node)** | Mongoose | `^8.5.0` | Schema enforcement, validation hooks, indexes, and aggregation pipelines. |
| **Asynchronous Task Broker** | Redis + BullMQ (Node) / Celery (Python) | Redis `v7.2+`, BullMQ `^5.8.0` | In-memory distributed task queue for non-blocking multi-page PDF plagiarism scans. |
| **PDF Extraction Engine** | `pdfplumber` + `PyPDF` | `^0.11.0` | Precise bounding-box coordinate extraction, table parsing, and layout-aware text segmentation. |
| **Containerization & Devops** | Docker + Docker Compose | Compose Spec `v2.24+` | Reproducible multi-service development, isolated networking, environment parity. |

---

## 3. Detailed Component Justifications

### 3.1 Frontend: React (Vite) + Redux Toolkit
- **Why Vite over Create React App / Next.js**: The platform requires a dedicated, decoupled client application that can be deployed to edge CDNs (Cloudflare Pages, AWS S3/CloudFront) with zero server-side rendering latency. Vite provides near-instantaneous build cycles and dynamic imports for heavy visualization modules (e.g., PDF viewer, diff viewer).
- **Why RTK Query**: Manages the server cache lifecycle automatically. When an academic document is submitted, RTK Query initiates optimistic updates, transitions to background polling/SSE listeners, and caches the multi-megabyte analysis report without redundant network round-trips.

### 3.2 Gateway Layer: Node.js / Express
- **Decoupling Rationale**: Modern enterprise AI applications must never allow client browsers to communicate directly with GPU-bound AI microservices. Express acts as a defensive perimeter:
  - **Authentication**: Verifies asymmetric RSA/EdDSA signed JWT tokens.
  - **Rate Limiting**: Enforces token-bucket rate limits per user tier (Student: 10 scans/day, Researcher: 100 scans/day, Admin: Unlimited) to prevent LLM resource starvation.
  - **Payload Scrubbing**: Validates file MIME signatures (magic bytes) to prevent executable uploads masquerading as PDFs.

### 3.3 AI Microservice: Python / FastAPI
- **Native ML Interoperability**: Python remains the singular lingua franca for modern deep learning. Running PyTorch, Hugging Face Transformers, and LangGraph inside a native Python runtime eliminates foreign-function interface (FFI) overhead and IPC serialization bottlenecks.
- **Async Execution**: FastAPI's native `async/await` syntax allows non-blocking execution of I/O tasks (retrieving embeddings from ChromaDB, querying remote LLMs) while delegating CPU-heavy tensor operations to dedicated process pools (`concurrent.futures.ProcessPoolExecutor`).

### 3.4 Vector Search: ChromaDB with `all-MiniLM-L6-v2`
- **Privacy & Compliance**: Academic theses and pre-published research papers represent highly sensitive intellectual property. Using cloud-hosted vector databases (such as Pinecone or Weaviate Cloud) requires transferring raw text embeddings over the public internet to third-party infrastructure. ChromaDB runs entirely on-premise or within a private VPC.
- **Dimension & Cost Efficiency**: The `all-MiniLM-L6-v2` model outputs 384-dimensional vectors. Compared to OpenAI's `text-embedding-3-small` (1536 dimensions) or `text-embedding-3-large` (3072 dimensions), 384-dimensional vectors require 75% to 87.5% less RAM and disk storage, drastically accelerating k-Nearest Neighbors (k-NN) / Cosine similarity calculations while retaining 98.2% semantic retention on academic text benchmarks.

---

## 4. Interoperability & Network Boundaries

```
[ Client: React SPA ] 
       │ 
       │ HTTPS / WSS / SSE (Public Internet)
       ▼
[ Node.js API Gateway (BFF) ] : Port 5000
       │
       ├─────────────────────────────────┐
       │ Internal TCP (Protected VPC)     │ Internal REST / mTLS
       ▼                                 ▼
[ MongoDB Replica Set ] : Port 27017   [ Python FastAPI AI Service ] : Port 8000
                                         │
                                         ├────────────────────────┐
                                         ▼                        ▼
                                [ ChromaDB Vector Store ]   [ Redis Queue ]
                                       Port 8001               Port 6379
```

- **Zero-Trust Network Perimeter**: Port 8000 (FastAPI), Port 8001 (ChromaDB), and Port 27017 (MongoDB) are strictly bound to internal Docker network interfaces (`127.0.0.1` / private Docker bridge) and are never exposed to external ingress routes.
- **Internal Authentication**: Requests from Node.js to FastAPI must supply a signed internal service token (`X-Internal-Service-Key` or mTLS certificate) to eliminate unauthorized invocation of compute-heavy inference endpoints.

---

## 5. Dependency Constraints & Compatibility Matrix

| Dependency A | Dependency B | Compatibility Constraint | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| Node.js `20.x` | Mongoose `8.x` | Native Fetch API and Buffer handling | Pin Node LTS version in Dockerfile base image (`node:20-alpine`). |
| Python `3.11` | PyTorch `2.4+` | CPython ABI stability | Use `python:3.11-slim-bookworm` to guarantee pre-compiled manylinux wheel availability. |
| LangGraph `0.2.x` | LangChain `0.2.x` | Pydantic v2 core serialization | Explicitly pin `pydantic>=2.7.0,<3.0.0` across all Python environments. |
| ChromaDB `0.5.x` | SQLite3 | Requires SQLite `3.35.0+` for vector indexing | Debian Bookworm includes SQLite `3.40.1`, satisfying ChromaDB build requirements natively. |
