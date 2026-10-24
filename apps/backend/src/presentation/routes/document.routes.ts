import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { uploadMiddleware } from '../../infrastructure/web/multer.config';
import { DocumentController } from '../controllers/DocumentController';
import { UploadDocumentUseCase } from '../../application/use-cases/documents/UploadDocumentUseCase';
import { localStorageProvider } from '../../infrastructure/storage/LocalStorageProvider';
import { mongoDocumentRepository } from '../../infrastructure/database/mongodb/MongoDocumentRepository';

export const createDocumentRouter = (documentController?: DocumentController): Router => {
  const router = Router();

  const controller =
    documentController ??
    (() => {
      const uploadDocumentUseCase = new UploadDocumentUseCase(
        localStorageProvider,
        mongoDocumentRepository,
      );
      return new DocumentController(uploadDocumentUseCase);
    })();

  router.use(requireAuth);

  /**
   * POST /api/v1/documents
   * Upload and register a new academic document for AI parsing and vector embedding.
   */
  router.post('/', uploadMiddleware.single('file'), controller.upload);

  return router;
};

export const documentRouter = createDocumentRouter();
