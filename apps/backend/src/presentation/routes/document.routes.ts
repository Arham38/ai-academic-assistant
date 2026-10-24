import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { uploadMiddleware } from '../../infrastructure/web/multer.config';
import { DocumentController } from '../controllers/DocumentController';
import { UploadDocumentUseCase } from '../../application/use-cases/documents/UploadDocumentUseCase';
import { UploadDocumentVersionUseCase } from '../../application/use-cases/documents/UploadDocumentVersionUseCase';
import { RestoreDocumentVersionUseCase } from '../../application/use-cases/documents/RestoreDocumentVersionUseCase';
import { localStorageProvider } from '../../infrastructure/storage/LocalStorageProvider';
import { mongoDocumentRepository } from '../../infrastructure/database/mongodb/MongoDocumentRepository';
import { fastAPIAIServiceClient } from '../../infrastructure/external-clients/FastAPIAIServiceClient';

export const createDocumentRouter = (documentController?: DocumentController): Router => {
  const router = Router();

  const controller =
    documentController ??
    (() => {
      const uploadDocumentUseCase = new UploadDocumentUseCase(
        localStorageProvider,
        mongoDocumentRepository,
        fastAPIAIServiceClient,
      );
      const uploadDocumentVersionUseCase = new UploadDocumentVersionUseCase(
        localStorageProvider,
        mongoDocumentRepository,
        fastAPIAIServiceClient,
      );
      const restoreDocumentVersionUseCase = new RestoreDocumentVersionUseCase(
        mongoDocumentRepository,
      );
      return new DocumentController(
        uploadDocumentUseCase,
        uploadDocumentVersionUseCase,
        restoreDocumentVersionUseCase,
        mongoDocumentRepository,
      );
    })();

  router.use(requireAuth);

  /**
   * POST /api/v1/documents
   * Upload and register a new academic document for AI parsing and vector embedding.
   */
  router.post('/', uploadMiddleware.single('file'), controller.upload);

  /**
   * POST /api/v1/documents/:id/versions
   * Append a new version to an existing academic document.
   */
  router.post('/:id/versions', uploadMiddleware.single('file'), controller.uploadVersion);

  /**
   * POST /api/v1/documents/:id/restore/:versionId
   * Revert the active version pointer to an existing historical version.
   */
  router.post('/:id/restore/:versionId', controller.restoreVersion);

  /**
   * GET /api/v1/documents/:id
   * Retrieve document details with optional historical version resolution (?version=:versionId).
   */
  router.get('/:id', controller.getById);

  return router;
};

export const documentRouter = createDocumentRouter();
