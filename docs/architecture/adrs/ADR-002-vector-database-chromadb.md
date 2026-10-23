# Architecture Decision Record (ADR) 002

## ADR-002: Vector Database Selection: ChromaDB over Pinecone and Raw FAISS

- **Status:** Accepted
- **Deciders:** Principal Architect, AI Lead, Data Engineer
- **Date:** 2026-10-23
- **Technical Domain:** Data Persistence & Semantic Retrieval

---

### Context & Problem Statement

The platform's semantic plagiarism detection and Agentic RAG capabilities require storing and retrieving high-dimensional embedding vectors (384 dimensions) generated from academic document chunks. The vector database must satisfy three critical enterprise constraints:

1. **Academic Privacy & Compliance**: Academic documents (theses, research papers) contain confidential research and unpublished intellectual property. Vectors and raw text chunks must never be exposed to public third-party SaaS cloud storage without institutional governance.
2. **Metadata Filtering for Tenant Isolation**: Each query must filter vectors by `tenant_id` and `user_id` to prevent cross-tenant contamination.
3. **Zero Operational API Billing for Core Semantic Indexing**: The architecture must eliminate per-vector or per-query SaaS fees that balloon under high-volume institutional plagiarism scanning.

### Considered Options

1. **Option 1: Pinecone (Managed Cloud SaaS)**:
   - _Pros_: Fully managed, high scalability, managed indexing.
   - _Cons_: Third-party cloud dependency; requires transmitting student data outside the network; recurring per-index and storage costs.
2. **Option 2: Raw FAISS (Facebook AI Similarity Search)**:
   - _Pros_: Extreme in-memory nearest neighbor performance in C++/Python; zero licensing cost.
   - _Cons_: Lacks built-in metadata filtering; lacks native persistence, document CRUD, or client-server networking; requires complex custom index synchronization code.
3. **Option 3: ChromaDB (Open-Source Self-Hosted Vector Store)**:
   - _Pros_: Fully self-hosted (in-process or standalone Docker container); native rich metadata filtering; native Python client; Apache 2.0 license; zero external API costs; integrated persistence.
   - _Cons_: Single-node scale limits compared to distributed Milvus/Qdrant clusters (sufficient for initial enterprise phase of < 50 million chunks).

### Decision Outcome

**Chosen Option: Option 3 (ChromaDB)**.

ChromaDB will be deployed as an isolated microservice container alongside the FastAPI AI Engine. It will manage the `academic_chunks` collection using HNSW (Hierarchical Navigable Small World) indexing with cosine similarity distance metrics.

### Technical Implementation & Tenant Isolation Strategy

Each chunk stored in ChromaDB will embed institutional metadata:

```python
collection.add(
    ids=["chunk_10284"],
    embeddings=[vector_384_dim],
    metadatas=[{
        "tenant_id": "stanford_university",
        "user_id": "usr_7890",
        "doc_id": "doc_456",
        "page_number": 3,
        "paragraph_index": 2
    }],
    documents=["Extracted paragraph text..."]
)
```

Every retrieval query strictly enforces the tenant filter:

```python
results = collection.query(
    query_embeddings=[query_vector],
    n_results=10,
    where={"tenant_id": current_tenant_id}
)
```

### Positive Consequences

- **Complete Intellectual Property Control**: 100% of embeddings and document text remain on customer-controlled infrastructure.
- **Predictable Cost Model**: Zero external vector API bills regardless of scan volume.
- **Developer Simplicity**: ChromaDB runs seamlessly in Docker Compose during development and testing without mocking cloud endpoints.

### Negative Consequences & Mitigation

- **Horizontal Scaling Ceilings**: ChromaDB standalone mode is not distributed across hundreds of nodes.
  - _Mitigation_: The repository layer is abstracted behind a clean `VectorRepositoryInterface`. If vector volume exceeds 20 million chunks, the repository can be swapped to Qdrant or Milvus without altering any LangGraph agent logic.
