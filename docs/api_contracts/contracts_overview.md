# API Architecture & Contracts Overview

- **Document ID:** API-001
- **Phase:** 00 - Project Research & Software Architecture
- **Status:** Approved
- **Author:** API Design & Systems Integration Team

---

## 1. Architectural Protocol Strategy

The system enforces a strict distinction between **external client-facing communication** and **internal microservice-to-microservice traffic**:

1. **Client ➔ Node.js Gateway (Public Web)**:
   - Synchronous transactional requests utilize **RESTful JSON over HTTP/2** (TLS 1.3).
   - Real-time AI token generation and job progress utilize **Server-Sent Events (SSE)**.
   - Authentication via Bearer JWT (`Authorization: Bearer <token>`).
   
2. **Node.js Gateway ➔ Python FastAPI Engine (Internal Mesh)**:
   - High-throughput internal REST endpoints.
   - Zero-Trust internal authorization header (`X-Internal-Service-Key`).
   - Private Docker bridge network; never exposed to public routing ingress.

3. **Background Job Broker**:
   - Redis RESP protocol managed via BullMQ (producer in Node.js, consumer/worker in FastAPI / Node.js).
   - Redis Pub/Sub channels for ephemeral job stage progress dispatch.

---

## 2. Standardized Error Payload Schema

All HTTP errors returned by the API Gateway adhere to RFC 7807 (Problem Details for HTTP APIs):

```json
{
  "type": "https://errors.academic-assistant.internal/quota-exceeded",
  "title": "Monthly Scan Quota Exceeded",
  "status": 429,
  "detail": "The current user tier 'STUDENT' allows a maximum of 10 scans per calendar month. 10 scans have been consumed.",
  "instance": "/api/v1/documents/upload",
  "timestamp": "2026-10-23T17:15:00.000Z",
  "invalidParams": null
}
```

---

## 3. Server-Sent Events (SSE) Streaming Specification

### 3.1 Job Progress Stream (`GET /api/v1/jobs/{jobId}/events`)
Client connects using the browser `EventSource` API:

```
event: progress
data: {"stage": "EXTRACTION", "percentage": 10, "message": "Parsing 24 pages from PDF"}

event: progress
data: {"stage": "CHUNKING", "percentage": 25, "message": "Segmented into 56 semantic chunks"}

event: progress
data: {"stage": "EMBEDDING", "percentage": 50, "message": "Generating 384-dimensional embeddings"}

event: progress
data: {"stage": "AGENTIC_ANALYSIS", "percentage": 80, "message": "Planner, Plagiarism & Citation agents evaluating"}

event: completed
data: {"status": "SUCCESS", "reportId": "rep_67b31c9a", "documentId": "doc_8899aabb"}
```

### 3.2 Conversational RAG Token Stream (`POST /api/v1/chat/completions`)
```
event: message
data: {"token": "According", "isFinal": false}

event: message
data: {"token": " to", "isFinal": false}

event: message
data: {"token": " Section", "isFinal": false}

event: message
data: {"token": " 3...", "isFinal": false}

event: citations
data: {"citations": [{"source": "Smith et al., 2021", "page": 4, "similarity": 0.89}]}

event: done
data: {"finishReason": "stop"}
```
