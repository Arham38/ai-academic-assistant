import { IDocumentRepository } from '../../../domain/repositories/IDocumentRepository';
import { Document } from '../../../domain/entities/Document';
import { BadRequestError, NotFoundError } from '../../../domain/errors/AppError';
import { logger } from '../../../infrastructure/logging/logger';

export interface RestoreDocumentVersionDTO {
  documentId: string;
  userId: string;
  versionId: string;
}

/**
 * Enterprise Application Use Case handling restoration of a historical document version.
 * Verifies document ownership and reverts the activeVersionId and active metadata/file pointers.
 */
export class RestoreDocumentVersionUseCase {
  constructor(private readonly documentRepository: IDocumentRepository) {}

  public async execute(dto: RestoreDocumentVersionDTO): Promise<Document> {
    if (!dto.userId?.trim()) {
      throw new BadRequestError('User identifier is required.');
    }

    if (!dto.documentId?.trim()) {
      throw new BadRequestError('Document identifier is required.');
    }

    if (!dto.versionId?.trim()) {
      throw new BadRequestError('Version identifier is required.');
    }

    try {
      const restoredDoc = await this.documentRepository.restoreVersion(
        dto.documentId.trim(),
        dto.userId.trim(),
        dto.versionId.trim(),
      );

      if (!restoredDoc) {
        throw new NotFoundError(
          `Document "${dto.documentId}" not found or you do not have permission to modify it.`,
        );
      }

      logger.info({
        message: 'Document version successfully restored',
        documentId: dto.documentId,
        versionId: dto.versionId,
      });

      return restoredDoc;
    } catch (error: unknown) {
      if (error instanceof NotFoundError || error instanceof BadRequestError) {
        throw error;
      }
      if (error instanceof Error && error.message.includes('not found in document')) {
        throw new NotFoundError(error.message);
      }
      throw error;
    }
  }
}
