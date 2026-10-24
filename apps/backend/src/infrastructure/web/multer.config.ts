import multer from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../../domain/errors/AppError';
import { DocumentMimeType } from '../../domain/types/DocumentStatus';

/**
 * Whitelist of strictly permitted MIME types for academic document ingestion.
 */
export const ALLOWED_MIME_TYPES: readonly string[] = [
  DocumentMimeType.PDF,
  DocumentMimeType.DOCX,
  DocumentMimeType.TXT,
];

/**
 * Hard ceiling on incoming document payload size (10MB) to mitigate memory exhaustion & DoS.
 */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 Megabytes

/**
 * Multer middleware configured for in-memory multipart/form-data parsing.
 * Buffering in RAM allows domain use cases to validate invariants prior to disk commitment.
 */
export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: Request, file: Express.Multer.File, callback: multer.FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return callback(
        new BadRequestError(
          `Unsupported file format: "${file.mimetype}". Allowed formats are: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, text/plain.`,
        ),
      );
    }
    callback(null, true);
  },
});
