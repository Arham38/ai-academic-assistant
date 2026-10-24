import { Types } from 'mongoose';
import { Document, DocumentMetadata, DocumentVersion } from '../../../domain/entities/Document';
import { DocumentStatus, AllowedMimeType } from '../../../domain/types/DocumentStatus';

export interface RawDocumentPersistence {
  _id?: unknown;
  id?: string;
  userId: unknown;
  title: string;
  originalFilename: string;
  storageUri: string;
  mimeType: string;
  sizeBytes: number;
  status: string;
  activeVersionId?: string;
  versions?: DocumentVersion[];
  errorMessage?: string;
  metadata?: Partial<DocumentMetadata>;
  isDeleted?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export class DocumentMapper {
  /**
   * Transforms a database document into a pure Domain Document entity.
   * Strips database primitives (ObjectId, __v) and guarantees clean domain types.
   */
  public static toDomain(raw: RawDocumentPersistence): Document {
    const id = raw._id ? String(raw._id) : raw.id;
    const userId = String(raw.userId);

    return new Document({
      id,
      userId,
      title: raw.title,
      originalFilename: raw.originalFilename,
      storageUri: raw.storageUri,
      mimeType: raw.mimeType as AllowedMimeType,
      sizeBytes: raw.sizeBytes,
      status: raw.status as DocumentStatus,
      activeVersionId: raw.activeVersionId,
      versions: raw.versions
        ? raw.versions.map((v) => ({ ...v, uploadedAt: new Date(v.uploadedAt) }))
        : undefined,
      errorMessage: raw.errorMessage,
      metadata: raw.metadata,
      isDeleted: raw.isDeleted ?? false,
      createdAt: raw.createdAt ? new Date(raw.createdAt) : new Date(),
      updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : new Date(),
    });
  }

  /**
   * Transforms a Domain Document entity into a raw database persistence payload.
   */
  public static toPersistence(document: Document): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      userId: Types.ObjectId.isValid(document.userId)
        ? new Types.ObjectId(document.userId)
        : document.userId,
      title: document.title.trim(),
      originalFilename: document.originalFilename.trim(),
      storageUri: document.storageUri.trim(),
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      status: document.status,
      activeVersionId: document.activeVersionId,
      versions: document.versions.map((v) => ({
        versionId: v.versionId,
        versionNumber: v.versionNumber,
        originalFilename: v.originalFilename,
        storageUri: v.storageUri,
        mimeType: v.mimeType,
        sizeBytes: v.sizeBytes,
        status: v.status,
        metadata: { ...v.metadata },
        uploadedAt: v.uploadedAt,
      })),
      errorMessage: document.errorMessage,
      metadata: { ...document.metadata },
      isDeleted: document.isDeleted,
      updatedAt: document.updatedAt,
    };

    if (document.id && Types.ObjectId.isValid(document.id)) {
      payload._id = new Types.ObjectId(document.id);
    }

    return payload;
  }
}
