import { Request, Response } from 'express';
import { UploadDocumentUseCase } from '../../application/use-cases/documents/UploadDocumentUseCase';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, UnauthorizedError } from '../../domain/errors/AppError';

export class DocumentController {
  constructor(private readonly uploadDocumentUseCase: UploadDocumentUseCase) {}

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
}
