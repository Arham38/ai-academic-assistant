# Conceptual Data Model & Schema Specifications

- **Document ID:** DATA-001
- **Phase:** 00 - Project Research & Software Architecture
- **Status:** Approved
- **Author:** Data Architecture Team
- **Datastores:** MongoDB 7.0 (Primary) + ChromaDB (Vector Search)

---

## 1. Architectural Strategy

The persistence architecture employs a **Polyglot Storage Pattern**:
1. **MongoDB (Transactional / Document Store)**: Optimized for structured and semi-structured operational records, relational joins via surrogate keys, transactional integrity, and atomic status updates.
2. **ChromaDB (Vector Datastore)**: Optimized for indexing and querying high-dimensional dense vector embeddings ($384$ dimensions) via Approximate Nearest Neighbor (ANN) search.

### 1.1 Cross-Store Key Linkage (Surrogate Keys)
```
[ MongoDB: 'documents' ]               [ ChromaDB: 'academic_chunks' ]
  _id: "doc_67a12b3c"  ◄───────┐         id: "chk_998877"
  tenantId: "inst_mit_01"      │         document_id: "doc_67a12b3c"  (Metadata)
  userId: "usr_4021"           └──────── tenant_id: "inst_mit_01"    (Metadata)
                                         user_id: "usr_4021"          (Metadata)
                                         embedding: [0.024, -0.198, ... 384 dims]
```

---

## 2. MongoDB Collections Schema Design

### 2.1 `users` Collection
Stores identity credentials, institutional tenant assignments, roles, and resource consumption quotas.

```typescript
interface UserDocument {
  _id: string; // UUID v4 or ObjectId
  tenantId: string; // Institutional Partition Identifier
  email: string; // Unique within tenant
  passwordHash: string; // Argon2id or bcrypt hash
  fullName: string;
  role: 'STUDENT' | 'RESEARCHER' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED' | 'PENDING_VERIFICATION';
  quotas: {
    monthlyScanLimit: number; // e.g., 50 scans
    scansConsumedThisMonth: number;
    maxPagesPerDocument: number; // e.g., 75 pages
    quotaResetDate: Date;
  };
  security: {
    mfaEnabled: boolean;
    lastLoginAt?: Date;
    passwordChangedAt: Date;
    failedLoginAttempts: number;
    lockedUntil?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- Unique compound: `{ tenantId: 1, email: 1 }`
- Lookup: `{ tenantId: 1, role: 1 }`

---

### 2.2 `documents` Collection
Stores uploaded file metadata, cryptographic integrity hashes, parsing status, and storage references.

```typescript
interface DocumentRecord {
  _id: string; // Surrogate Key (e.g., 'doc_67a12b3c')
  tenantId: string; // Institutional Partition
  userId: string; // Foreign Key referencing users._id
  originalFilename: string;
  fileSizeBytes: number;
  mimeType: string; // Strictly 'application/pdf' or 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  sha256Hash: string; // Prevents duplicate re-scans within same tenant
  storageUri: string; // Encrypted S3 / MinIO URI: 's3://academic-vault/inst_mit/doc_67a12b3c.enc'
  pageCount: number;
  status: 'PENDING' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  processingStage?: 'EXTRACTION' | 'CHUNKING' | 'EMBEDDING' | 'AGENTIC_EVALUATION' | 'SYNTHESIS';
  failureReason?: string;
  reportId?: string; // Foreign Key referencing reports._id (once completed)
  createdAt: Date;
  updatedAt: Date;
}
```
**Indexes**:
- Sharding / Compound Key: `{ tenantId: 1, _id: 1 }`
- Fast User History: `{ tenantId: 1, userId: 1, createdAt: -1 }`
- Duplicate Prevention: `{ tenantId: 1, sha256Hash: 1 }`
- Queue Monitoring: `{ status: 1, createdAt: 1 }`

---

### 2.3 `reports` Collection
Stores immutable analysis artifacts output by the LangGraph multi-agent engine.

```typescript
interface AnalysisReport {
  _id: string; // Surrogate Key (e.g., 'rep_1102948')
  tenantId: string;
  documentId: string; // Foreign Key referencing documents._id
  userId: string;
  summary: {
    overallIntegrityScore: number; // 0.0 - 100.0 (Higher = cleaner academic rigor)
    plagiarismPercentage: number;  // 0.0 - 100.0
    grammarErrorCount: number;
    citationIssueCount: number;
    executiveSummary: string;
  };
  plagiarismAnalysis: {
    evaluatedChunksCount: number;
    matchedSources: Array<{
      sourceTitle: string;
      sourceUrl?: string;
      similarityScore: number; // Cosine similarity: 0.0 - 1.0
      matchedChunkText: string;
      sourceExcerptText: string;
      pageNumber: number;
      charOffsetStart: number;
      charOffsetEnd: number;
    }>;
  };
  grammarAnalysis: {
    overallReadabilityScore: number; // Flesch-Kincaid grade
    issues: Array<{
      issueId: string;
      severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
      category: 'PASSIVE_VOICE' | 'INFORMAL_TONE' | 'SYNTAX' | 'REDUNDANCY';
      originalSnippet: string;
      suggestedFix: string;
      explanation: string;
      pageNumber: number;
      charOffsetStart: number;
      charOffsetEnd: number;
    }>;
  };
  citationAnalysis: {
    detectedStyle: 'APA_7' | 'MLA_9' | 'CHICAGO_17' | 'IEEE' | 'UNKNOWN';
    totalCitationsFound: number;
    orphanedInTextCitations: string[]; // Cited in text, missing in bibliography
    unreferencedBibliographyEntries: string[]; // In bibliography, never cited in text
    verifiedDois: Array<{
      citationText: string;
      doi: string;
      isResolvedOnline: boolean;
    }>;
  };
  agentTrace: {
    totalExecutionDurationMs: number;
    iterationsRequired: number;
    agentsInvoked: string[];
  };
  generatedAt: Date;
}
```
**Indexes**:
- Lookup by Document: `{ documentId: 1 }` (Unique)
- Compound Query: `{ tenantId: 1, generatedAt: -1 }`

---

### 2.4 `audit_logs` Collection
Immutable append-only records tracking sensitive actions for compliance (FERPA, GDPR).

```typescript
interface AuditLogEntry {
  _id: string;
  tenantId: string;
  userId: string;
  action: 'DOCUMENT_UPLOAD' | 'DOCUMENT_SCAN_STARTED' | 'REPORT_ACCESSED' | 'REPORT_EXPORTED' | 'DOCUMENT_DELETED';
  resourceId: string; // e.g., docId or reportId
  ipAddress: string;
  userAgent: string;
  payloadDigest: string; // SHA-256 hash of the request parameters
  timestamp: Date;
}
```
**Indexes**:
- Search by Tenant & Date: `{ tenantId: 1, timestamp: -1 }`
- User Action Tracking: `{ tenantId: 1, userId: 1, timestamp: -1 }`

---

## 3. ChromaDB Vector Collection Schema

### 3.1 Collection Name: `academic_chunks`
Vector search collections in ChromaDB store dense numerical embeddings alongside structured metadata dictionaries for pre-filtering.

| Field | Type | Description |
| :--- | :--- | :--- |
| **`id`** | `String` (PK) | Unique chunk ID (e.g., `chk_${docId}_p${page}_${idx}`) |
| **`embedding`** | `Array<Float>` | 384-dimensional dense float vector (`all-MiniLM-L6-v2`) |
| **`document`** | `String` | Raw text content of the 500-token chunk |
| **`metadata.tenant_id`** | `String` | Mandatory tenant partition key for multi-tenancy |
| **`metadata.doc_id`** | `String` | Foreign surrogate key referencing MongoDB `documents._id` |
| **`metadata.user_id`** | `String` | Uploader ID |
| **`metadata.page_number`** | `Integer` | Physical page in PDF document (1-indexed) |
| **`metadata.paragraph_index`** | `Integer` | Paragraph offset within page |
| **`metadata.section_name`** | `String` | Extracted header (e.g., "Methodology", "Abstract") |
| **`metadata.token_length`** | `Integer` | Number of tokens in chunk |

---

## 4. Referential Integrity & Cascade Deletion Rules

Because MongoDB and ChromaDB are physically separated datastores, cross-system referential integrity must be managed in the Application Service Layer:

1. **Document Deletion Flow**:
   - Node.js API receives `DELETE /api/v1/documents/:id`.
   - Node.js verifies authorization (User must own document or be Tenant Admin).
   - Node.js invokes FastAPI internal deletion hook: `DELETE /internal/v1/vectors/documents/:id`.
   - FastAPI issues ChromaDB deletion: `collection.delete(where={"doc_id": docId, "tenant_id": tenantId})`.
   - Upon ChromaDB confirmation, Node.js atomically deletes the record from MongoDB `documents`, associated `reports`, and removes the encrypted binary from S3.
   - An immutable entry is written to `audit_logs`.

2. **Orphan Prevention**:
   - If document analysis fails terminally, a cleanup cron job runs every 24 hours to delete any orphaned vector embeddings whose `doc_id` does not exist in MongoDB with status `COMPLETED`.
