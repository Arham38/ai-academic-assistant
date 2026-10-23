import {
  DocumentStatus,
  DocumentMimeType,
  AllowedMimeType,
  isValidMimeType,
} from '../types/DocumentStatus';

export { DocumentStatus, DocumentMimeType };

export interface DocumentMetadata {
  wordCount?: number;
  pageCount?: number;
  language: string;
  course?: string;
  professor?: string;
  bibliographyStyle?: string;
  [key: string]: unknown;
}

export interface DocumentProperties {
  id?: string;
  userId: string;
  title?: string;
  originalFilename: string;
  storageUri: string;
  mimeType: AllowedMimeType | string;
  sizeBytes: number;
  status?: DocumentStatus;
  errorMessage?: string;
  metadata?: Partial<DocumentMetadata>;
  isDeleted?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Enterprise Domain Entity representing an academic document and its processing state machine.
 * Strictly decoupled from Mongoose, databases, and network adapters.
 */
export class Document {
  private readonly _documentId?: string;
  private readonly _userId: string;
  private _title: string;
  private readonly _originalFilename: string;
  private readonly _storageUri: string;
  private readonly _mimeType: AllowedMimeType;
  private readonly _sizeBytes: number;
  private _status: DocumentStatus;
  private _errorMessage?: string;
  private _metadata: DocumentMetadata;
  private _isDeleted: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: DocumentProperties) {
    if (!props.userId?.trim()) {
      throw new Error('Document entity validation failed: userId is required.');
    }
    if (!props.originalFilename?.trim()) {
      throw new Error('Document entity validation failed: originalFilename is required.');
    }
    if (!props.storageUri?.trim()) {
      throw new Error('Document entity validation failed: storageUri is required.');
    }
    if (props.sizeBytes === undefined || props.sizeBytes === null || props.sizeBytes < 0) {
      throw new Error(
        'Document entity validation failed: sizeBytes must be a non-negative number.',
      );
    }
    if (!isValidMimeType(props.mimeType)) {
      throw new Error(
        `Document entity validation failed: Unsupported MIME type "${props.mimeType}". Allowed types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain.`,
      );
    }

    this._documentId = props.id;
    this._userId = props.userId.trim();
    this._originalFilename = props.originalFilename.trim();
    this._title = props.title?.trim() || this._originalFilename;
    this._storageUri = props.storageUri.trim();
    this._mimeType = props.mimeType as AllowedMimeType;
    this._sizeBytes = props.sizeBytes;
    this._status = props.status ?? DocumentStatus.PENDING;
    this._errorMessage = props.errorMessage;

    this._metadata = {
      wordCount: props.metadata?.wordCount,
      pageCount: props.metadata?.pageCount,
      language: props.metadata?.language ?? 'en',
      course: props.metadata?.course,
      professor: props.metadata?.professor,
      bibliographyStyle: props.metadata?.bibliographyStyle,
      ...props.metadata,
    };

    if (this._status === DocumentStatus.COMPLETED) {
      if (
        this._metadata.wordCount === undefined ||
        this._metadata.wordCount === null ||
        this._metadata.wordCount < 0
      ) {
        throw new Error(
          'Document entity invariant failed: Document cannot be in COMPLETED status without a valid non-negative wordCount.',
        );
      }
    }

    this._isDeleted = props.isDeleted ?? false;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  // Getters
  public get id(): string | undefined {
    return this._documentId;
  }

  public get userId(): string {
    return this._userId;
  }

  public get title(): string {
    return this._title;
  }

  public get originalFilename(): string {
    return this._originalFilename;
  }

  public get storageUri(): string {
    return this._storageUri;
  }

  public get mimeType(): AllowedMimeType {
    return this._mimeType;
  }

  public get sizeBytes(): number {
    return this._sizeBytes;
  }

  public get status(): DocumentStatus {
    return this._status;
  }

  public get errorMessage(): string | undefined {
    return this._errorMessage;
  }

  public get metadata(): Readonly<DocumentMetadata> {
    return { ...this._metadata };
  }

  public get isDeleted(): boolean {
    return this._isDeleted;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  // State Machine & Business Rules

  /**
   * Transitions state from PENDING to PARSING.
   */
  public startParsing(): void {
    if (this._status !== DocumentStatus.PENDING) {
      throw new Error(
        `Invalid state transition: Cannot transition document from ${this._status} to PARSING. Valid source state is PENDING.`,
      );
    }
    this._status = DocumentStatus.PARSING;
    this._errorMessage = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Transitions state from PARSING to EMBEDDING.
   */
  public startEmbedding(): void {
    if (this._status !== DocumentStatus.PARSING) {
      throw new Error(
        `Invalid state transition: Cannot transition document from ${this._status} to EMBEDDING. Valid source state is PARSING.`,
      );
    }
    this._status = DocumentStatus.EMBEDDING;
    this._updatedAt = new Date();
  }

  /**
   * Transitions state from EMBEDDING to COMPLETED and stores extracted metadata.
   */
  public completeProcessing(metadata?: Partial<DocumentMetadata>): void {
    if (this._status !== DocumentStatus.EMBEDDING) {
      throw new Error(
        `Invalid state transition: Cannot transition document from ${this._status} to COMPLETED. Document must be in EMBEDDING state.`,
      );
    }

    if (metadata) {
      this._metadata = {
        ...this._metadata,
        ...metadata,
      };
    }

    if (
      this._metadata.wordCount === undefined ||
      this._metadata.wordCount === null ||
      this._metadata.wordCount < 0
    ) {
      throw new Error(
        'Document entity invariant failed: Document cannot be marked COMPLETED without a valid non-negative wordCount.',
      );
    }

    this._status = DocumentStatus.COMPLETED;
    this._errorMessage = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Marks document processing as FAILED with an error message or stack trace.
   */
  public markAsFailed(reason: string): void {
    if (!reason || !reason.trim()) {
      throw new Error(
        'Document entity validation failed: A non-empty failure reason is required to mark document as FAILED.',
      );
    }
    if (this._status === DocumentStatus.COMPLETED) {
      throw new Error(
        'Invalid state transition: Cannot mark an already COMPLETED document as FAILED.',
      );
    }

    this._status = DocumentStatus.FAILED;
    this._errorMessage = reason.trim();
    this._updatedAt = new Date();
  }

  /**
   * Returns true if document is actively in AI parsing or embedding pipelines.
   */
  public isProcessing(): boolean {
    return this._status === DocumentStatus.PARSING || this._status === DocumentStatus.EMBEDDING;
  }

  /**
   * Updates document title (e.g. user renamed document).
   */
  public updateTitle(newTitle: string): void {
    if (!newTitle || !newTitle.trim()) {
      throw new Error('Document entity validation failed: Title cannot be empty.');
    }
    this._title = newTitle.trim();
    this._updatedAt = new Date();
  }

  /**
   * Updates document metadata fields (e.g., academic course, professor, bibliography style).
   */
  public updateMetadata(meta: Partial<DocumentMetadata>): void {
    this._metadata = {
      ...this._metadata,
      ...meta,
    };
    this._updatedAt = new Date();
  }

  /**
   * Soft-deletes the document.
   */
  public softDelete(): void {
    this._isDeleted = true;
    this._updatedAt = new Date();
  }
}
