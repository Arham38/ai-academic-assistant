import { IStorageProvider } from '../../../domain/providers/IStorageProvider';
import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository';
import { IAIServiceClient } from '../../../domain/providers/IAIServiceClient';
import { Document } from '../../../domain/entities/Document';
import {
  DocumentStatus,
  isValidMimeType,
  AllowedMimeType,
} from '../../../domain/types/DocumentStatus';
import { BadRequestError, PayloadTooLargeError } from '../../../domain/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';

export const MAX_DOCUMENT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

export interface UploadDocumentDTO {
  userId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  title?: string;
}

export interface UploadDocumentResponseDTO {
  id: string;
  userId: string;
  title: string;
  originalFilename: string;
  storageUri: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  createdAt: Date;
}

/**
 * Enterprise Application Use Case orchestrating file ingestion, physical persistence,
 * MongoDB state initialization (PENDING), and automatic physical rollback on storage/database failures.
 */
export class UploadDocumentUseCase {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly documentRepository: IDocumentRepository,
    private readonly aiServiceClient?: IAIServiceClient,
  ) {}

  public async execute(dto: UploadDocumentDTO): Promise<UploadDocumentResponseDTO> {
    // 1. Validation Safeguards
    if (!dto.userId?.trim()) {
      throw new BadRequestError('User identifier is required for document ingestion.');
    }

    if (!dto.fileBuffer || dto.fileBuffer.length === 0) {
      throw new BadRequestError('Uploaded file buffer cannot be empty.');
    }

    if (!dto.originalFilename?.trim()) {
      throw new BadRequestError('Original filename is required.');
    }

    if (
      dto.sizeBytes > MAX_DOCUMENT_SIZE_BYTES ||
      dto.fileBuffer.length > MAX_DOCUMENT_SIZE_BYTES
    ) {
      throw new PayloadTooLargeError(
        `File size exceeds maximum allowable limit of 10MB (received ${dto.sizeBytes || dto.fileBuffer.length} bytes).`,
      );
    }

    if (!isValidMimeType(dto.mimeType)) {
      throw new BadRequestError(
        `Unsupported document format "${dto.mimeType}". Permitted formats: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain.`,
      );
    }

    // 2. Physical File Commitment
    const storageUri = await this.storageProvider.saveFile(
      dto.fileBuffer,
      dto.mimeType,
      dto.originalFilename,
    );

    // 3. Domain Entity Instantiation in PENDING state
    const document = new Document({
      userId: dto.userId.trim(),
      title: dto.title?.trim() || dto.originalFilename.trim(),
      originalFilename: dto.originalFilename.trim(),
      storageUri,
      mimeType: dto.mimeType as AllowedMimeType,
      sizeBytes: dto.sizeBytes || dto.fileBuffer.length,
      status: DocumentStatus.PENDING,
    });

    // 4. Persistence with Physical Rollback Protection
    try {
      const persistedDoc = await this.documentRepository.create(document);

      logger.info({
        message: 'Document successfully ingested and persisted',
        documentId: persistedDoc.id,
        userId: persistedDoc.userId,
        status: persistedDoc.status,
      });

      // 5. Trigger downstream asynchronous processing in AI microservice
      if (this.aiServiceClient && persistedDoc.id) {
        this.aiServiceClient
          .triggerDocumentProcessing(persistedDoc.id, persistedDoc.storageUri)
          .catch((triggerErr) => {
            logger.warn({
              message: 'Background dispatch to AI service failed',
              documentId: persistedDoc.id,
              err: triggerErr,
            });
          });
      }

      return {
        id: persistedDoc.id!,
        userId: persistedDoc.userId,
        title: persistedDoc.title,
        originalFilename: persistedDoc.originalFilename,
        storageUri: persistedDoc.storageUri,
        mimeType: persistedDoc.mimeType,
        sizeBytes: persistedDoc.sizeBytes,
        status: persistedDoc.status,
        createdAt: persistedDoc.createdAt,
      };
    } catch (persistenceError) {
      // Rollback orphaned physical file if database insertion fails
      try {
        await this.storageProvider.deleteFile(storageUri);
        logger.warn({
          message: 'Rolled back orphaned physical file after database persistence failure',
          storageUri,
        });
      } catch (cleanupError) {
        logger.error({
          message: 'Failed to delete orphaned physical file during rollback',
          storageUri,
          err: cleanupError,
        });
      }

      throw persistenceError;
    }
  }
}
