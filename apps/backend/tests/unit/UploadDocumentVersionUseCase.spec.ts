import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UploadDocumentVersionUseCase,
  UploadDocumentVersionDTO,
} from '../../src/application/use-cases/documents/UploadDocumentVersionUseCase';
import { RestoreDocumentVersionUseCase } from '../../src/application/use-cases/documents/RestoreDocumentVersionUseCase';
import { IStorageProvider } from '../../src/domain/providers/IStorageProvider';
import { IDocumentRepository } from '../../src/domain/repositories/IDocumentRepository';
import { IAIServiceClient } from '../../src/domain/providers/IAIServiceClient';
import { Document, DocumentVersion } from '../../src/domain/entities/Document';
import { DocumentStatus } from '../../src/domain/types/DocumentStatus';
import {
  BadRequestError,
  NotFoundError,
  PayloadTooLargeError,
} from '../../src/domain/errors/AppError';

describe('UploadDocumentVersionUseCase & RestoreDocumentVersionUseCase Unit Tests', () => {
  let mockStorageProvider: IStorageProvider;
  let mockDocumentRepository: IDocumentRepository;
  let mockAIServiceClient: IAIServiceClient;
  let uploadVersionUseCase: UploadDocumentVersionUseCase;
  let restoreVersionUseCase: RestoreDocumentVersionUseCase;

  const initialVersion: DocumentVersion = {
    versionId: '11111111-1111-4111-8111-111111111111',
    versionNumber: 1,
    originalFilename: 'v1.pdf',
    storageUri: '/uploads/v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status: DocumentStatus.COMPLETED,
    metadata: { wordCount: 500, pages: 5 },
    uploadedAt: new Date('2026-01-01'),
  };

  const existingDocument = new Document({
    id: '66a1b2c3d4e5f6a7b8c9d0e1',
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    title: 'Research Paper',
    originalFilename: 'v1.pdf',
    storageUri: '/uploads/v1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    status: DocumentStatus.COMPLETED,
    metadata: { wordCount: 500, pages: 5 },
    activeVersionId: '11111111-1111-4111-8111-111111111111',
    versions: [initialVersion],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

  const validDto: UploadDocumentVersionDTO = {
    documentId: '66a1b2c3d4e5f6a7b8c9d0e1',
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    fileBuffer: Buffer.from('%PDF-1.4 revision 2 content'),
    originalFilename: 'research-paper-v2.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 30,
  };

  beforeEach(() => {
    mockStorageProvider = {
      saveFile: vi.fn().mockResolvedValue('/uploads/v2-storage-uri.pdf'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    mockDocumentRepository = {
      create: vi.fn(),
      findByIdAndOwner: vi.fn().mockResolvedValue(existingDocument),
      findByUserIdPaginated: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      findPendingDocuments: vi.fn(),
      countByUserId: vi.fn(),
      existsByIdAndOwner: vi.fn(),
      findById: vi.fn(),
      addVersion: vi.fn().mockImplementation(async (_docId, _userId, version: DocumentVersion) => {
        return new Document({
          id: existingDocument.id,
          userId: existingDocument.userId,
          title: existingDocument.title,
          originalFilename: version.originalFilename,
          storageUri: version.storageUri,
          mimeType: version.mimeType,
          sizeBytes: version.sizeBytes,
          status: DocumentStatus.PENDING,
          activeVersionId: version.versionId,
          versions: [...(existingDocument.versions || []), version],
          metadata: { wordCount: 500, pages: 5 },
          createdAt: existingDocument.createdAt,
          updatedAt: new Date(),
        });
      }),
      restoreVersion: vi.fn().mockImplementation(async (_docId, _userId, versionId: string) => {
        const found = existingDocument.versions?.find((v) => v.versionId === versionId);
        if (!found) {
          throw new Error(`Version with ID "${versionId}" not found in document.`);
        }
        return new Document({
          id: existingDocument.id,
          userId: existingDocument.userId,
          title: existingDocument.title,
          originalFilename: found.originalFilename,
          storageUri: found.storageUri,
          mimeType: found.mimeType,
          sizeBytes: found.sizeBytes,
          status: DocumentStatus.COMPLETED,
          activeVersionId: found.versionId,
          versions: existingDocument.versions,
          metadata: { wordCount: 500, pages: 5 },
          createdAt: existingDocument.createdAt,
          updatedAt: new Date(),
        });
      }),
    };

    mockAIServiceClient = {
      triggerDocumentProcessing: vi.fn().mockResolvedValue(undefined),
    };

    uploadVersionUseCase = new UploadDocumentVersionUseCase(
      mockStorageProvider,
      mockDocumentRepository,
      mockAIServiceClient,
    );

    restoreVersionUseCase = new RestoreDocumentVersionUseCase(mockDocumentRepository);
  });

  describe('UploadDocumentVersionUseCase', () => {
    it('should successfully append version 2 and trigger AI background processing with versionId', async () => {
      const result = await uploadVersionUseCase.execute(validDto);

      expect(mockDocumentRepository.findByIdAndOwner).toHaveBeenCalledWith(
        validDto.documentId,
        validDto.userId,
      );
      expect(mockStorageProvider.saveFile).toHaveBeenCalledWith(
        validDto.fileBuffer,
        validDto.mimeType,
        validDto.originalFilename,
      );
      expect(mockDocumentRepository.addVersion).toHaveBeenCalledTimes(1);

      expect(result.versionNumber).toBe(2);
      expect(result.documentId).toBe(validDto.documentId);
      expect(result.status).toBe(DocumentStatus.PENDING);
      expect(result.activeVersionId).toBeTruthy();

      expect(mockAIServiceClient.triggerDocumentProcessing).toHaveBeenCalledWith(
        validDto.documentId,
        '/uploads/v2-storage-uri.pdf',
        result.versionId,
      );
    });

    it('should throw NotFoundError if document is not found or not owned by user', async () => {
      vi.mocked(mockDocumentRepository.findByIdAndOwner).mockResolvedValueOnce(null);

      await expect(uploadVersionUseCase.execute(validDto)).rejects.toThrow(NotFoundError);
      expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError if file buffer is empty', async () => {
      await expect(
        uploadVersionUseCase.execute({ ...validDto, fileBuffer: Buffer.alloc(0) }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should throw PayloadTooLargeError if file exceeds 10MB', async () => {
      await expect(
        uploadVersionUseCase.execute({ ...validDto, sizeBytes: 11 * 1024 * 1024 }),
      ).rejects.toThrow(PayloadTooLargeError);
    });

    it('should throw BadRequestError if mimeType is unsupported', async () => {
      await expect(
        uploadVersionUseCase.execute({ ...validDto, mimeType: 'image/png' }),
      ).rejects.toThrow(BadRequestError);
    });

    it('should rollback physical file if database addVersion fails', async () => {
      vi.mocked(mockDocumentRepository.addVersion).mockRejectedValueOnce(
        new Error('Database disconnect'),
      );

      await expect(uploadVersionUseCase.execute(validDto)).rejects.toThrow('Database disconnect');
      expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith('/uploads/v2-storage-uri.pdf');
    });

    it('should continue successfully if AI service dispatch throws an error', async () => {
      vi.mocked(mockAIServiceClient.triggerDocumentProcessing).mockRejectedValueOnce(
        new Error('FastAPI unreachable'),
      );

      const result = await uploadVersionUseCase.execute(validDto);
      expect(result.versionNumber).toBe(2);
      expect(mockStorageProvider.deleteFile).not.toHaveBeenCalled();
    });
  });

  describe('RestoreDocumentVersionUseCase', () => {
    it('should successfully restore an existing version', async () => {
      const restored = await restoreVersionUseCase.execute({
        documentId: validDto.documentId,
        userId: validDto.userId,
        versionId: initialVersion.versionId,
      });

      expect(mockDocumentRepository.restoreVersion).toHaveBeenCalledWith(
        validDto.documentId,
        validDto.userId,
        initialVersion.versionId,
      );
      expect(restored.activeVersionId).toBe(initialVersion.versionId);
    });

    it('should throw NotFoundError if version ID does not exist in document', async () => {
      await expect(
        restoreVersionUseCase.execute({
          documentId: validDto.documentId,
          userId: validDto.userId,
          versionId: 'non-existent-version',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
