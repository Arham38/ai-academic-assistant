import { randomUUID } from 'crypto';
import { IStorageProvider } from '../../../domain/providers/IStorageProvider';
import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository';
import { IAIServiceClient } from '../../../domain/providers/IAIServiceClient';
import { DocumentVersion } from '../../../domain/entities/Document';
import {
  DocumentStatus,
  isValidMimeType,
  AllowedMimeType,
} from '../../../domain/types/DocumentStatus';
import {
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
} from '../../../domain/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';
import { MAX_DOCUMENT_SIZE_BYTES } from './UploadDocumentUseCase';

export interface UploadDocumentVersionDTO {
  documentId: string;
  userId: string;
  fileBuffer: Buffer;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UploadDocumentVersionResponseDTO {
  versionId: string;
  versionNumber: number;
  message: string;
  documentId: string;
  activeVersionId: string;
  status: DocumentStatus;
}

/**
 * Enterprise Application Use Case handling appending a new physical version to an existing document.
 * Asserts document ownership, stores the file with UUID isolation, pushes the new version object,
 * resets document status to PENDING, and dispatches the AI microservice task.
 */
export class UploadDocumentVersionUseCase {
  constructor(
    private readonly storageProvider: IStorageProvider,
    private readonly documentRepository: IDocumentRepository,
    private readonly aiServiceClient?: IAIServiceClient,
  ) {}

  public async execute(dto: UploadDocumentVersionDTO): Promise<UploadDocumentVersionResponseDTO> {
    // 1. Validation Safeguards
    if (!dto.userId?.trim()) {
      throw new BadRequestError('User identifier is required for version upload.');
    }

    if (!dto.documentId?.trim()) {
      throw new BadRequestError('Document identifier is required for version upload.');
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

    // 2. Document Ownership Verification
    const existingDoc = await this.documentRepository.findByIdAndOwner(
      dto.documentId.trim(),
      dto.userId.trim(),
    );

    if (!existingDoc) {
      throw new NotFoundError(
        `Document "${dto.documentId}" not found or you do not have permission to modify it.`,
      );
    }

    // 3. Compute version identifiers
    const nextVersionNumber = (existingDoc.versions?.length || 1) + 1;
    const versionId = randomUUID();

    // 4. Physical File Commitment with cryptographic isolation
    const storageUri = await this.storageProvider.saveFile(
      dto.fileBuffer,
      dto.mimeType,
      dto.originalFilename,
    );

    const newVersion: DocumentVersion = {
      versionId,
      versionNumber: nextVersionNumber,
      originalFilename: dto.originalFilename.trim(),
      storageUri,
      mimeType: dto.mimeType as AllowedMimeType,
      sizeBytes: dto.sizeBytes || dto.fileBuffer.length,
      status: DocumentStatus.PENDING,
      metadata: { language: existingDoc.metadata?.language || 'en' },
      uploadedAt: new Date(),
    };

    // 5. Append version to database with physical rollback on failure
    try {
      const updatedDoc = await this.documentRepository.addVersion(
        dto.documentId.trim(),
        dto.userId.trim(),
        newVersion,
      );

      if (!updatedDoc) {
        throw new NotFoundError(
          `Failed to append version: Document "${dto.documentId}" not found.`,
        );
      }

      logger.info({
        message: 'Document version successfully uploaded and registered',
        documentId: dto.documentId,
        versionId,
        versionNumber: nextVersionNumber,
      });

      // 6. Trigger background processing on AI microservice with specific versionId
      if (this.aiServiceClient && updatedDoc.id) {
        this.aiServiceClient
          .triggerDocumentProcessing(updatedDoc.id, storageUri, versionId)
          .catch((triggerErr) => {
            logger.warn({
              message: 'Background dispatch to AI service failed for new version',
              documentId: updatedDoc.id,
              versionId,
              err: triggerErr,
            });
          });
      }

      return {
        versionId,
        versionNumber: nextVersionNumber,
        message: `Version ${nextVersionNumber} uploaded. Processing initiated.`,
        documentId: updatedDoc.id!,
        activeVersionId: versionId,
        status: DocumentStatus.PENDING,
      };
    } catch (persistenceError) {
      // Rollback newly saved physical file if MongoDB operation fails
      try {
        await this.storageProvider.deleteFile(storageUri);
        logger.warn({
          message: 'Rolled back orphaned physical file after version append database failure',
          storageUri,
        });
      } catch (cleanupError) {
        logger.error({
          message: 'Failed to delete orphaned physical file during version rollback',
          storageUri,
          err: cleanupError,
        });
      }

      throw persistenceError;
    }
  }
}
