# Architecture Decision Record (ADR) 004

## ADR-004: Multi-Tenant Data Isolation, STRIDE Threat Modeling & Zero-Trust Security

- **Status:** Accepted
- **Deciders:** Principal Architect, Security Lead, Backend Lead
- **Date:** 2026-10-23
- **Technical Domain:** Security Architecture, Multi-Tenancy & Data Governance

---

### Context & Problem Statement
Educational institutions, universities, and enterprise research laboratories operate under strict legal compliance frameworks (FERPA, GDPR, HIPAA in medical academia). Academic papers may contain patentable intellectual property, undisclosed clinical findings, or sensitive student records. The system must guarantee:
1. Strict logical isolation between competing institutions and individual researchers.
2. Complete prevention of cross-tenant vector contamination during semantic plagiarism searches.
3. Defense against malicious file uploads, prompt injection attacks, and LLM data leakage.

---

### Multi-Tenant Isolation Strategy

```
                                [ Incoming Request ]
                                         │
                                         ▼
                     [ JWT Extraction & Signature Verify ]
                                         │
                         (Tenant ID: "inst_berkeley_01")
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
       [ MongoDB Tenant Query ]                    [ ChromaDB Vector Query ]
db.documents.find({                         collection.query({
  _id: docId,                                 query_embeddings: [vector],
  tenantId: "inst_berkeley_01"                where: { "tenant_id": "inst_berkeley_01" }
})                                          })
```

1. **MongoDB Layer**: Every operational document (`users`, `documents`, `reports`, `audit_logs`) includes an immutable `tenantId` field indexed via a compound index: `{ tenantId: 1, _id: 1 }`. Repositories enforce an automatic Mongoose query filter plugin that prepends the active `tenantId` to all operations.
2. **ChromaDB Layer**: Chunks are tagged with `tenant_id` metadata. Vector similarity searches mandate a mandatory `where={"tenant_id": active_tenant_id}` clause. Queries without a valid tenant filter are rejected at the repository level.

---

### STRIDE Threat Analysis & Architectural Countermeasures

| Threat Category | Specific System Risk | Architectural Countermeasure |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates an academic administrator or student. | Cryptographically signed asymmetric JWTs (RS256 / Ed25519) with short TTL (15 min) + secure HTTP-only refresh tokens. Role-Based Access Control (RBAC) enforced on every route. |
| **Tampering** | User modifies plagiarism scores or tampers with scanned document files. | Document files fingerprinted with SHA-256 upon ingestion. Generated `AnalysisReport` records in MongoDB are flagged immutable via write-once collection rules. |
| **Repudiation** | User denies uploading a plagiarized thesis or an admin denies deleting an audit log. | Immutable append-only `audit_logs` collection capturing `user_id`, `tenant_id`, `action`, `client_ip`, and cryptographic hash of the operation. |
| **Information Disclosure** | Cross-tenant document leakage via vector nearest neighbors; leakage of student PII to remote LLMs. | 1. Mandatory metadata filtering on all vector queries.<br>2. Local SentenceTransformers embedding model ensures raw text never leaves the VPC for vectorization.<br>3. PII Redaction Pipeline (regex + SpaCy NER) scrubs student names, SSNs, and institutional emails before dispatching to external LLMs. |
| **Denial of Service (DoS)** | Attacker uploads a 2,000-page zip-bomb disguised as a PDF or floods the AI engine with concurrent scans. | 1. Strict multipart upload ceiling of 50MB.<br>2. PDF page cap (max 100 pages per scan).<br>3. Redis token-bucket rate limiter per IP and user tier.<br>4. Non-blocking asynchronous job queue (BullMQ/Redis) buffers burst traffic. |
| **Elevation of Privilege** | Student account exploits an API parameter to access institutional plagiarism benchmarks. | Context-aware authorization middleware validates that the authenticated `user_id` matches the document owner, or that the user possesses `ROLE_ADMIN` within the identical `tenantId`. |

---

### Zero-Trust Internal Microservice Security

Communication between the Node.js API Gateway and the Python FastAPI AI Engine traverses an authenticated internal bridge:
- Every request from Node.js to FastAPI must supply a signed internal token in the header:
  `X-Internal-Service-Key: <HMAC-SHA256(timestamp + payload, secret)>`
- FastAPI validates the signature and timestamp (rejecting any request older than 30 seconds to prevent replay attacks).
- Direct external traffic to FastAPI (port 8000) is blocked via Docker network isolation rules.
