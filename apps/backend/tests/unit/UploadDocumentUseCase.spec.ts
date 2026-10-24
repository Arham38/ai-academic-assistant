import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  UploadDocumentUseCase,
  UploadDocumentDTO,
  MAX_DOCUMENT_SIZE_BYTES,
} from '../../src/application/use-cases/documents/UploadDocumentUseCase';
import { IStorageProvider } from '../../src/domain/providers/IStorageProvider';
import { IDocumentRepository } from '../../src/domain/repositories/IDocumentRepository';
import { Document } from '../../src/domain/entities/Document';
import { DocumentStatus } from '../../src/domain/types/DocumentStatus';
import { BadRequestError, PayloadTooLargeError } from '../../src/domain/errors/AppError';

describe('UploadDocumentUseCase Unit Tests', () => {
  let mockStorageProvider: IStorageProvider;
  let mockDocumentRepository: IDocumentRepository;
  let useCase: UploadDocumentUseCase;

  const validDto: UploadDocumentDTO = {
    userId: '65f1a2b3c4d5e6f7a8b9c0d1',
    fileBuffer: Buffer.from('%PDF-1.4 sample content'),
    originalFilename: 'research-paper.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 24,
    title: 'Research Paper',
  };

  beforeEach(() => {
    mockStorageProvider = {
      saveFile: vi.fn().mockResolvedValue('/uploads/mock-uuid-123.pdf'),
      deleteFile: vi.fn().mockResolvedValue(undefined),
    };

    mockDocumentRepository = {
      create: vi.fn().mockImplementation(async (doc: Document) => {
        // Simulate returning persisted document with generated ID and timestamps
        return new Document({
          id: '66a1b2c3d4e5f6a7b8c9d0e1',
          userId: doc.userId,
          title: doc.title,
          originalFilename: doc.originalFilename,
          storageUri: doc.storageUri,
          mimeType: doc.mimeType,
          sizeBytes: doc.sizeBytes,
          status: doc.status,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }),
      findByIdAndOwner: vi.fn(),
      findByUserIdPaginated: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      existsByIdAndOwner: vi.fn(),
      findById: vi.fn(),
    };

    useCase = new UploadDocumentUseCase(mockStorageProvider, mockDocumentRepository);
  });

  it('should successfully upload and persist a document in PENDING state', async () => {
    const result = await useCase.execute(validDto);

    expect(mockStorageProvider.saveFile).toHaveBeenCalledWith(
      validDto.fileBuffer,
      validDto.mimeType,
      validDto.originalFilename,
    );
    expect(mockDocumentRepository.create).toHaveBeenCalledTimes(1);

    expect(result.id).toBe('66a1b2c3d4e5f6a7b8c9d0e1');
    expect(result.userId).toBe(validDto.userId);
    expect(result.title).toBe(validDto.title);
    expect(result.originalFilename).toBe(validDto.originalFilename);
    expect(result.storageUri).toBe('/uploads/mock-uuid-123.pdf');
    expect(result.status).toBe(DocumentStatus.PENDING);
    expect(mockStorageProvider.deleteFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError if userId is missing', async () => {
    const dto = { ...validDto, userId: '' };
    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestError);
    expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError if fileBuffer is empty', async () => {
    const dto = { ...validDto, fileBuffer: Buffer.alloc(0) };
    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestError);
    expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError if originalFilename is empty', async () => {
    const dto = { ...validDto, originalFilename: '   ' };
    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestError);
    expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
  });

  it('should throw PayloadTooLargeError if file exceeds 10MB', async () => {
    const dto = {
      ...validDto,
      sizeBytes: MAX_DOCUMENT_SIZE_BYTES + 1,
    };
    await expect(useCase.execute(dto)).rejects.toThrow(PayloadTooLargeError);
    expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
  });

  it('should throw BadRequestError if mimeType is not supported', async () => {
    const dto = {
      ...validDto,
      mimeType: 'application/x-msdownload',
      originalFilename: 'malware.exe',
    };
    await expect(useCase.execute(dto)).rejects.toThrow(BadRequestError);
    expect(mockStorageProvider.saveFile).not.toHaveBeenCalled();
  });

  it('should trigger physical rollback (deleteFile) if database persistence fails', async () => {
    const dbError = new Error('Database connection lost');
    vi.mocked(mockDocumentRepository.create).mockRejectedValueOnce(dbError);

    await expect(useCase.execute(validDto)).rejects.toThrow('Database connection lost');

    expect(mockStorageProvider.saveFile).toHaveBeenCalledTimes(1);
    expect(mockStorageProvider.deleteFile).toHaveBeenCalledWith('/uploads/mock-uuid-123.pdf');
  });

  it('should still rethrow database error even if storage deleteFile rollback fails', async () => {
    const dbError = new Error('MongoDB cluster unavailable');
    vi.mocked(mockDocumentRepository.create).mockRejectedValueOnce(dbError);
    vi.mocked(mockStorageProvider.deleteFile).mockRejectedValueOnce(new Error('S3 delete failed'));

    await expect(useCase.execute(validDto)).rejects.toThrow('MongoDB cluster unavailable');
  });
});
