# Architecture Decision Record (ADR) 005

## ADR-005: Asynchronous Processing Strategy for Heavy Document AI Workloads

- **Status:** Accepted
- **Deciders:** Principal Architect, Backend Lead, AI Lead
- **Date:** 2026-10-23
- **Technical Domain:** Asynchronous Task Architecture & Real-Time Client Streaming

---

### Context & Problem Statement
Academic document processing is an inherently heterogeneous, long-running computational workload:
- A 3-page research abstract can be extracted, chunked, embedded, and checked in 4 seconds.
- A 60-page doctoral dissertation requires extracting 25,000 words, generating ~60 dense embedding vectors, executing 60 nearest-neighbor vector queries, and running multi-agent evaluation routines across dozens of sections, consuming 30 to 90 seconds.

If this operation is performed synchronously over a standard HTTP `POST /documents/scan` request:
1. Reverse proxies (Nginx, AWS ALB, Cloudflare) terminate the connection after standard timeouts (typically 30s or 60s), resulting in `504 Gateway Timeout` errors.
2. Web browser network threads remain tied up, preventing the user from navigating or viewing intermediate progress.
3. Node.js and FastAPI worker threads become saturated waiting on downstream LLMs or vector stores, causing cascading denial of service for concurrent users.

### Considered Options
1. **Option 1: Synchronous HTTP with Extended Timeout (120s)**:
   - *Flaw*: Extreme fragility; violates HTTP semantics; poor user experience; high risk of dropped connections.
2. **Option 2: Asynchronous Job Queue (BullMQ + Redis) with Server-Sent Events (SSE) & Polling Fallback**:
   - *Mechanism*: The client uploads the document and immediately receives an HTTP `202 Accepted` response with a `jobId`. The background worker picks up the job. The client connects to an SSE endpoint (`/api/v1/jobs/:jobId/events`) to receive real-time granular progress (e.g., `EXTRACTING`, `CHUNKING`, `EMBEDDING`, `SCORING`, `SYNTHESIZING`). If SSE is interrupted, the client falls back to standard HTTP polling (`GET /api/v1/jobs/:jobId`).

### Decision Outcome
**Chosen Option: Option 2 (BullMQ + Redis with SSE Streaming & Polling Fallback)**.

### Architectural Workflow

```
[ React SPA ]                  [ Node.js Gateway ]            [ Redis Queue ]           [ Python AI Worker ]
      │                                │                              │                           │
      │ 1. POST /documents/upload      │                              │                           │
      ├───────────────────────────────►│                              │                           │
      │                                │ 2. Enqueue Job               │                           │
      │                                ├─────────────────────────────►│                           │
      │ 3. 202 Accepted {jobId, docId} │                              │                           │
      │◄───────────────────────────────┤                              │ 4. Pop Job                │
      │                                │                              │◄──────────────────────────┤
      │ 5. GET /jobs/:id/events (SSE)  │                              │                           │
      ├───────────────────────────────►│                              │ 5a. Progress: CHUNKING    │
      │                                │                              │◄──────────────────────────┤
      │ 6. SSE Event: {progress: 25%}  │◄─────────────────────────────┤ (via Redis Pub/Sub)       │
      │◄───────────────────────────────┤                              │                           │
      │                                │                              │ 5b. Progress: EMBEDDING   │
      │                                │                              │◄──────────────────────────┤
      │ 7. SSE Event: {progress: 60%}  │◄─────────────────────────────┤                           │
      │◄───────────────────────────────┤                              │                           │
      │                                │                              │ 5c. Progress: COMPLETE    │
      │                                │                              │◄──────────────────────────┤
      │ 8. SSE Event: {status: DONE}   │◄─────────────────────────────┤                           │
      │◄───────────────────────────────┤                              │                           │
      │                                │                              │                           │
      │ 9. GET /reports/:docId         │                              │                           │
      ├───────────────────────────────►│ 10. Fetch from MongoDB       │                           │
      │ 11. 200 OK (Full Report)       │                              │                           │
      │◄───────────────────────────────┤                              │                           │
```

### Positive Consequences
- **Zero HTTP Timeouts**: File upload returns in `< 200ms` with job metadata.
- **Rich User Experience**: Real-time progress bars reflect exact agent lifecycle stages.
- **Resilient Retry Mechanism**: Redis/BullMQ automatically retries failed tasks with exponential backoff if an internal AI service restarts.
- **Traffic Smoothing**: Bursts of document submissions are buffered safely in Redis without overwhelming the GPU/CPU inference tier.

### Negative Consequences & Mitigation
- **Infrastructure Dependency**: Requires running and maintaining a Redis instance.
  - *Mitigation*: Redis is deployed as an official lightweight container in Docker Compose and can be managed via AWS ElastiCache / Redis Cloud in production.
