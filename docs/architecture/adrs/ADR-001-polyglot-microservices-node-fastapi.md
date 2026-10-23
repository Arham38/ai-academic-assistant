# Architecture Decision Record (ADR) 001

## ADR-001: Polyglot Service Separation: Node.js (BFF/Gateway) and Python (FastAPI AI Engine)

- **Status:** Accepted
- **Deciders:** Principal Architect, AI Lead, Backend Lead
- **Date:** 2026-10-23
- **Technical Domain:** System Topology & Microservices Boundary

---

### Context & Problem Statement
The enterprise AI Academic Assistant requires two radically different execution profiles:
1. High-concurrency, low-latency I/O operations: HTTP request routing, JWT validation, multipart file streaming, WebSocket/SSE connection multiplexing, user permissions, and transactional database querying (MongoDB).
2. Compute-intensive, memory-bound AI/ML operations: PDF text extraction, SentenceTransformers tensor manipulation (`all-MiniLM-L6-v2`), PyTorch model forward passes, high-dimensional vector similarity calculations, and cyclical multi-agent graph traversal.

If a monolithic Node.js application attempts to run PyTorch inference via native C++ bindings or child processes, heavy tensor calculations inevitably block the Node.js single-threaded event loop, leading to severe latency spikes and connection drops for all concurrent users. Conversely, building the entire web application and user management layer in Python (e.g., pure Django or FastAPI) reduces developer velocity in building modern front-end-adjacent BFF features, lacks the vast npm ecosystem for frontend integration, and requires managing complex asynchronous connection handling alongside CPU-intensive worker threads.

### Decision Drivers
- **Thread Safety & CPU Isolation**: Complete physical decoupling of client-facing I/O from AI tensor execution.
- **Ecosystem Fit**: Node.js/TypeScript offers unmatched developer velocity for web APIs, while Python is the non-negotiable industry standard for PyTorch, Hugging Face, and LangGraph.
- **Independent Scalability**: Node.js API instances scale horizontally based on network ingress, while Python AI workers scale based on GPU/CPU availability.
- **Fail-Safe Operation**: A fatal crash (e.g., PyTorch Out-Of-Memory) in the AI engine must not terminate user sessions or drop web connections.

### Considered Options
1. **Option 1**: Monolithic Node.js utilizing `onnxruntime-node` or child Python processes.
2. **Option 2**: Monolithic Python application utilizing FastAPI or Django for both web and AI layers.
3. **Option 3**: Polyglot Distributed Architecture: Node.js/Express as BFF + Python/FastAPI as dedicated AI Microservice.

### Decision Outcome
**Chosen Option: Option 3 (Polyglot Distributed Architecture)**.

Node.js will handle the client-facing API Gateway, security enforcement, business transactions, and client streaming multiplexing. Python FastAPI will act strictly as an internal computational microservice accessed solely over an authenticated internal network interface.

### Positive Consequences
- **Event Loop Protection**: Node.js event loop latency remains consistently below 10ms regardless of AI workload.
- **Granular Autoscaling**: In production, the Node API service can run 4 lightweight replicas on low-spec nodes (1 vCPU, 1GB RAM), while the FastAPI service can be autoscaled independently on high-compute nodes (4 vCPU, 8GB RAM with GPU acceleration).
- **Domain Specialization**: Frontend and full-stack engineers work seamlessly in TypeScript across the React client and Express gateway, while ML engineers build and optimize LangGraph workflows in native Python.

### Negative Consequences & Mitigation
- **Deployment Complexity**: Requires managing two distinct runtimes (Node.js and Python) in Docker and CI/CD pipelines.
  - *Mitigation*: Unified Docker Compose configuration for local development and standardized Kubernetes manifests for production.
- **Inter-service Latency Overhead**: Introduces an internal network hop between Node.js and FastAPI.
  - *Mitigation*: Internal REST communication operates over high-speed local container bridge networks with HTTP keep-alive connections, introducing `< 3ms` overhead.
