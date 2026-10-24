import { Request, Response } from 'express';
import { UploadDocumentUseCase } from '../../application/use-cases/documents/UploadDocumentUseCase';
import { UploadDocumentVersionUseCase } from '../../application/use-cases/documents/UploadDocumentVersionUseCase';
import { RestoreDocumentVersionUseCase } from '../../application/use-cases/documents/RestoreDocumentVersionUseCase';
import { IDocumentRepository } from '../../domain/repositories/IDocumentRepository';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../../domain/errors/AppError';

export class DocumentController {
  constructor(
    private readonly uploadDocumentUseCase: UploadDocumentUseCase,
    private readonly uploadDocumentVersionUseCase?: UploadDocumentVersionUseCase,
    private readonly restoreDocumentVersionUseCase?: RestoreDocumentVersionUseCase,
    private readonly documentRepository?: IDocumentRepository,
  ) {}

  /**
   * POST /api/v1/documents
   * Ingests a multipart file upload, validates constraints, persists to storage,
   * and creates a PENDING document entity record.
   */
  public upload = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const file = req.file;
    if (!file) {
      throw new BadRequestError('No file uploaded. Please attach a file under the "file" field.');
    }

    const title =
      typeof req.body?.title === 'string' && req.body.title.trim()
        ? req.body.title.trim()
        : undefined;

    const document = await this.uploadDocumentUseCase.execute({
      userId,
      fileBuffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      title,
    });

    res.status(201).json({
      status: 'success',
      data: {
        document,
      },
    });
  });

  /**
   * POST /api/v1/documents/:id/versions
   * Ingests a new revision of an existing document, creating an immutable history entry
   * and resetting document status to PENDING for processing.
   */
  public uploadVersion = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const file = req.file;
    if (!file) {
      throw new BadRequestError('No file uploaded. Please attach a file under the "file" field.');
    }

    const documentId = req.params.id;
    if (!documentId) {
      throw new BadRequestError('Document ID is required in URL parameter.');
    }

    if (!this.uploadDocumentVersionUseCase) {
      throw new Error('UploadDocumentVersionUseCase not configured on DocumentController.');
    }

    const result = await this.uploadDocumentVersionUseCase.execute({
      documentId,
      userId,
      fileBuffer: file.buffer,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
    });

    res.status(201).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * POST /api/v1/documents/:id/restore/:versionId
   * Restores an existing historical version as the document's active version.
   */
  public restoreVersion = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const documentId = req.params.id;
    const versionId = req.params.versionId;

    if (!documentId || !versionId) {
      throw new BadRequestError('Both document ID and version ID are required.');
    }

    if (!this.restoreDocumentVersionUseCase) {
      throw new Error('RestoreDocumentVersionUseCase not configured on DocumentController.');
    }

    const document = await this.restoreDocumentVersionUseCase.execute({
      documentId,
      userId,
      versionId,
    });

    res.status(200).json({
      status: 'success',
      data: {
        document,
      },
    });
  });

  /**
   * GET /api/v1/documents/:id
   * Retrieves a document by ID scoped strictly to the authenticated owner.
   * Supports an optional ?version=:versionId query parameter to inspect historical revisions.
   */
  public getById = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedError('Authentication required. Please log in.');
    }

    const documentId = req.params.id;
    if (!documentId) {
      throw new BadRequestError('Document ID is required.');
    }

    if (!this.documentRepository) {
      throw new Error('DocumentRepository not configured on DocumentController.');
    }

    const document = await this.documentRepository.findByIdAndOwner(documentId, userId);
    if (!document) {
      throw new NotFoundError(`Document "${documentId}" not found or access denied.`);
    }

    const requestedVersion = req.query.version as string | undefined;
    let selectedVersion = document.versions?.find((v) => v.versionId === document.activeVersionId);

    if (requestedVersion) {
      const match = document.versions?.find(
        (v) => v.versionId === requestedVersion || String(v.versionNumber) === requestedVersion,
      );
      if (!match) {
        throw new NotFoundError(
          `Version "${requestedVersion}" not found in document "${documentId}".`,
        );
      }
      selectedVersion = match;
    }

    res.status(200).json({
      status: 'success',
      data: {
        document,
        selectedVersion: selectedVersion || null,
      },
    });
  });
}
