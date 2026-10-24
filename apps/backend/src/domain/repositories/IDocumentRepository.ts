import { Document, DocumentVersion } from '../entities/Document';

export interface PaginatedDocuments {
  data: Document[];
  total: number;
  page: number;
  totalPages: number;
}

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
};

/**
 * Domain repository contract for managing Document persistence.
 * Strictly enforces user ownership constraints on all individual document operations
 * to prevent Insecure Direct Object Reference (IDOR) vulnerabilities at compile-time.
 */
export interface IDocumentRepository {
  /**
   * Persists a new document entity.
   */
  create(document: Partial<Document> | Document): Promise<Document>;

  /**
   * Fetches a document by ID scoped strictly to the owning user.
   * Prevents IDOR by design: callers cannot query a document without asserting ownership.
   */
  findByIdAndOwner(
    documentId: string,
    userId: string,
    includeDeleted?: boolean,
  ): Promise<Document | null>;

  /**
   * Fetches paginated documents belonging strictly to a specified user.
   * Prevents Out-Of-Memory (OOM) crashes by guaranteeing bounded query limits.
   */
  findByUserIdPaginated(
    userId: string,
    page: number,
    limit: number,
    includeDeleted?: boolean,
  ): Promise<PaginatedDocuments>;

  /**
   * Updates a document owned by the specified user.
   */
  update(
    documentId: string,
    userId: string,
    updateData: Partial<Document>,
  ): Promise<Document | null>;

  /**
   * Soft-deletes a document owned by the specified user.
   */
  softDelete(documentId: string, userId: string): Promise<boolean>;

  /**
   * Queries pending documents across the system for background AI workers.
   * Utilizes the { status: 1 } compound index for optimal queue polling.
   */
  findPendingDocuments(limit?: number): Promise<Document[]>;

  /**
   * Counts active documents for a given user.
   */
  countByUserId(userId: string, includeDeleted?: boolean): Promise<number>;

  /**
   * Checks whether a document exists and is owned by the specified user.
   */
  existsByIdAndOwner(
    documentId: string,
    userId: string,
    includeDeleted?: boolean,
  ): Promise<boolean>;

  /**
   * Appends a new version to the document's history and updates active version pointer.
   */
  addVersion(
    documentId: string,
    userId: string,
    version: DocumentVersion,
  ): Promise<Document | null>;

  /**
   * Reverts active version pointer to an existing historical version.
   */
  restoreVersion(documentId: string, userId: string, versionId: string): Promise<Document | null>;
}
