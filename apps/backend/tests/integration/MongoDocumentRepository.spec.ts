import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoDocumentRepository } from '../../src/infrastructure/database/mongodb/MongoDocumentRepository';
import { DocumentModel } from '../../src/infrastructure/database/mongodb/models/DocumentModel';
import { Document } from '../../src/domain/entities/Document';
import { DocumentStatus, DocumentMimeType } from '../../src/domain/types/DocumentStatus';
import { DocumentMapper } from '../../src/infrastructure/database/mappers/DocumentMapper';

describe('MongoDocumentRepository Integration Tests', () => {
  let mongoServer: MongoMemoryServer | null = null;
  let repository: MongoDocumentRepository;

  const userAId = new Types.ObjectId().toString();
  const userBId = new Types.ObjectId().toString();

  beforeAll(async () => {
    const testUri =
      process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ai-academic-doc-test';
    try {
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
    } catch {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
    await DocumentModel.init();
    repository = new MongoDocumentRepository(DocumentModel);
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await DocumentModel.deleteMany({});
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await DocumentModel.deleteMany({});
  });

  describe('Document Creation & Data Mapping', () => {
    it('should successfully persist a document and map to pure Domain Document entity', async () => {
      const docToCreate = new Document({
        userId: userAId,
        title: 'Deep Learning for Genomic Sequencing',
        originalFilename: 'genomic_deep_learning.pdf',
        storageUri: 's3://research-bucket/papers/genomic_deep_learning.pdf',
        mimeType: DocumentMimeType.PDF,
        sizeBytes: 2048576,
        metadata: {
          language: 'en',
          course: 'BIO-702',
          professor: 'Dr. Rosalind Franklin',
        },
      });

      const created = await repository.create(docToCreate);

      expect(created).toBeInstanceOf(Document);
      expect(created.id).toBeDefined();
      expect(typeof created.id).toBe('string');
      expect(created.id).toMatch(/^[0-9a-fA-F]{24}$/);
      expect(created.userId).toBe(userAId);
      expect(created.title).toBe('Deep Learning for Genomic Sequencing');
      expect(created.originalFilename).toBe('genomic_deep_learning.pdf');
      expect(created.storageUri).toBe('s3://research-bucket/papers/genomic_deep_learning.pdf');
      expect(created.mimeType).toBe(DocumentMimeType.PDF);
      expect(created.sizeBytes).toBe(2048576);
      expect(created.status).toBe(DocumentStatus.PENDING);
      expect(created.isDeleted).toBe(false);
      expect(created.metadata.course).toBe('BIO-702');
      expect(created.metadata.professor).toBe('Dr. Rosalind Franklin');
      expect(created.createdAt).toBeInstanceOf(Date);

      // Verify raw database record to confirm ObjectId typing and no leakage
      const rawInDb = await DocumentModel.findById(created.id).lean();
      expect(rawInDb).not.toBeNull();
      expect(rawInDb?.userId).toBeInstanceOf(Types.ObjectId);
      expect(String(rawInDb?.userId)).toBe(userAId);
      expect((rawInDb as Record<string, unknown>).__v).toBeUndefined();
    });

    it('should default title to originalFilename when title is omitted', async () => {
      const doc = new Document({
        userId: userAId,
        originalFilename: 'transformer_attention.docx',
        storageUri: '/local/uploads/transformer_attention.docx',
        mimeType: DocumentMimeType.DOCX,
        sizeBytes: 512000,
      });

      const created = await repository.create(doc);
      expect(created.title).toBe('transformer_attention.docx');
    });
  });

  describe('IDOR Security Protections (Tenant & User Isolation)', () => {
    it('should return null when User B attempts to access User A document via findByIdAndOwner', async () => {
      const userADoc = await repository.create(
        new Document({
          userId: userAId,
          originalFilename: 'userA_confidential_research.pdf',
          storageUri: 's3://vault/userA.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 1024,
        }),
      );

      // User A can access their own document
      const foundByUserA = await repository.findByIdAndOwner(userADoc.id!, userAId);
      expect(foundByUserA).not.toBeNull();
      expect(foundByUserA?.id).toBe(userADoc.id);

      // User B cannot access User A's document (IDOR attempt returns null)
      const foundByUserB = await repository.findByIdAndOwner(userADoc.id!, userBId);
      expect(foundByUserB).toBeNull();
    });

    it('should prevent User B from updating User A document', async () => {
      const userADoc = await repository.create(
        new Document({
          userId: userAId,
          title: 'Original Title',
          originalFilename: 'paper.pdf',
          storageUri: 's3://vault/paper.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 2048,
        }),
      );

      // User B attempts to overwrite User A's document
      const updateResult = await repository.update(userADoc.id!, userBId, {
        title: 'Malicious Tampering by User B',
      });
      expect(updateResult).toBeNull();

      // Verify User A's document remains unchanged in database
      const unchanged = await repository.findByIdAndOwner(userADoc.id!, userAId);
      expect(unchanged?.title).toBe('Original Title');
    });

    it('should prevent User B from soft-deleting User A document', async () => {
      const userADoc = await repository.create(
        new Document({
          userId: userAId,
          originalFilename: 'important_paper.pdf',
          storageUri: 's3://vault/important_paper.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 2048,
        }),
      );

      // User B attempts to delete User A's document
      const deleteResult = await repository.softDelete(userADoc.id!, userBId);
      expect(deleteResult).toBe(false);

      // Document must still be active and accessible by User A
      const stillActive = await repository.findByIdAndOwner(userADoc.id!, userAId);
      expect(stillActive).not.toBeNull();
      expect(stillActive?.isDeleted).toBe(false);
    });

    it('should throw an IDOR security error if un-scoped findById is invoked directly', async () => {
      await expect(repository.findById('any_id')).rejects.toThrow(
        /IDOR Security Safeguard: findById without userId is prohibited/,
      );
    });
  });

  describe('Pagination & Dashboard Recent Documents', () => {
    it('should paginate 15 documents returning 10 on page 1 and 5 on page 2', async () => {
      // Insert 15 documents for User A with slight timestamp offsets
      const baseTime = Date.now();
      for (let i = 1; i <= 15; i++) {
        await repository.create(
          new Document({
            userId: userAId,
            title: `Academic Paper #${i.toString().padStart(2, '0')}`,
            originalFilename: `paper_${i}.pdf`,
            storageUri: `s3://bucket/paper_${i}.pdf`,
            mimeType: DocumentMimeType.PDF,
            sizeBytes: 1000 * i,
            createdAt: new Date(baseTime + i * 1000),
          }),
        );
      }

      // Query page 1 (limit 10)
      const page1 = await repository.findByUserIdPaginated(userAId, 1, 10);
      expect(page1.total).toBe(15);
      expect(page1.page).toBe(1);
      expect(page1.totalPages).toBe(2);
      expect(page1.data).toHaveLength(10);
      // Newest should be first (createdAt: -1 index)
      expect(page1.data[0].title).toBe('Academic Paper #15');

      // Query page 2 (limit 10) - Expect exactly 5 documents
      const page2 = await repository.findByUserIdPaginated(userAId, 2, 10);
      expect(page2.total).toBe(15);
      expect(page2.page).toBe(2);
      expect(page2.totalPages).toBe(2);
      expect(page2.data).toHaveLength(5);
      expect(page2.data[page2.data.length - 1].title).toBe('Academic Paper #01');
    });

    it('should isolate paginated lists strictly to the requesting user', async () => {
      // Insert 3 documents for User A
      for (let i = 1; i <= 3; i++) {
        await repository.create(
          new Document({
            userId: userAId,
            originalFilename: `userA_${i}.pdf`,
            storageUri: `s3://bucket/userA_${i}.pdf`,
            mimeType: DocumentMimeType.PDF,
            sizeBytes: 1000,
          }),
        );
      }

      // Insert 2 documents for User B
      for (let i = 1; i <= 2; i++) {
        await repository.create(
          new Document({
            userId: userBId,
            originalFilename: `userB_${i}.pdf`,
            storageUri: `s3://bucket/userB_${i}.pdf`,
            mimeType: DocumentMimeType.PDF,
            sizeBytes: 1000,
          }),
        );
      }

      const userAPapers = await repository.findByUserIdPaginated(userAId, 1, 10);
      expect(userAPapers.total).toBe(3);
      expect(userAPapers.data.every((d) => d.userId === userAId)).toBe(true);

      const userBPapers = await repository.findByUserIdPaginated(userBId, 1, 10);
      expect(userBPapers.total).toBe(2);
      expect(userBPapers.data.every((d) => d.userId === userBId)).toBe(true);
    });

    it('should return empty result safely for invalid userId', async () => {
      const res = await repository.findByUserIdPaginated('invalid-id', 1, 10);
      expect(res.data).toEqual([]);
      expect(res.total).toBe(0);
      expect(res.totalPages).toBe(0);
    });
  });

  describe('Status Index Utilization & Worker Queue Polling', () => {
    it('should query PENDING documents utilizing the status index', async () => {
      // Insert 100 documents with mixed statuses
      const docsToInsert = [];
      for (let i = 0; i < 100; i++) {
        let status: DocumentStatus;
        if (i < 10) {
          status = DocumentStatus.PENDING;
        } else if (i < 40) {
          status = DocumentStatus.PARSING;
        } else if (i < 70) {
          status = DocumentStatus.EMBEDDING;
        } else {
          status = DocumentStatus.COMPLETED;
        }

        docsToInsert.push({
          userId: new Types.ObjectId(),
          title: `Paper ${i}`,
          originalFilename: `paper_${i}.pdf`,
          storageUri: `s3://bucket/paper_${i}.pdf`,
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 10000,
          status,
          metadata: {
            wordCount: status === DocumentStatus.COMPLETED ? 2500 : undefined,
            language: 'en',
          },
          isDeleted: false,
        });
      }

      await DocumentModel.insertMany(docsToInsert);

      // Query for PENDING documents using repository method
      const pendingDocs = await repository.findPendingDocuments(5);
      expect(pendingDocs).toHaveLength(5);
      expect(pendingDocs.every((d) => d.status === DocumentStatus.PENDING)).toBe(true);

      // Explain query via Mongoose to verify { status: 1 } index is used
      const explainResult = (await DocumentModel.find({
        status: DocumentStatus.PENDING,
        isDeleted: { $ne: true },
      })
        .limit(5)
        .explain('executionStats')) as Record<string, unknown>;

      const queryPlanner = explainResult.queryPlanner as Record<string, unknown>;
      const winningPlan = JSON.stringify(queryPlanner?.winningPlan || {});

      // Verify index utilization: status index or IXSCAN stage
      expect(winningPlan).toMatch(/status_1|IXSCAN/);
    });
  });

  describe('Soft Deletion Logic', () => {
    it('should filter soft-deleted documents from standard queries and pagination', async () => {
      const doc = await repository.create(
        new Document({
          userId: userAId,
          originalFilename: 'thesis_draft.pdf',
          storageUri: 's3://bucket/thesis.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 50000,
        }),
      );

      // Soft delete the document
      const softDeleted = await repository.softDelete(doc.id!, userAId);
      expect(softDeleted).toBe(true);

      // Standard findByIdAndOwner must return null
      const foundStandard = await repository.findByIdAndOwner(doc.id!, userAId);
      expect(foundStandard).toBeNull();

      // With includeDeleted = true, it should return the soft-deleted document
      const foundDeleted = await repository.findByIdAndOwner(doc.id!, userAId, true);
      expect(foundDeleted).not.toBeNull();
      expect(foundDeleted?.isDeleted).toBe(true);

      // Pagination must exclude soft-deleted documents by default
      const paginated = await repository.findByUserIdPaginated(userAId, 1, 10);
      expect(paginated.total).toBe(0);
      expect(paginated.data).toHaveLength(0);

      // Pagination with includeDeleted = true must include them
      const paginatedWithDeleted = await repository.findByUserIdPaginated(userAId, 1, 10, true);
      expect(paginatedWithDeleted.total).toBe(1);
      expect(paginatedWithDeleted.data).toHaveLength(1);
    });
  });

  describe('Mongoose Schema Constraints & Error Logging', () => {
    it('should reject insertion of invalid status string at database level', async () => {
      const invalidDoc = {
        userId: new Types.ObjectId(),
        title: 'Invalid Status Test',
        originalFilename: 'invalid.pdf',
        storageUri: 's3://bucket/invalid.pdf',
        mimeType: DocumentMimeType.PDF,
        sizeBytes: 100,
        status: 'PROCESSING', // Not in PENDING, PARSING, EMBEDDING, COMPLETED, FAILED
      };

      await expect(DocumentModel.create(invalidDoc)).rejects.toThrow(
        /is not a valid DocumentStatus/,
      );
    });

    it('should reject insertion of disallowed MIME type at database level', async () => {
      const invalidDoc = {
        userId: new Types.ObjectId(),
        title: 'Invalid MIME Test',
        originalFilename: 'malicious.exe',
        storageUri: 's3://bucket/malicious.exe',
        mimeType: 'application/x-msdownload',
        sizeBytes: 100,
        status: DocumentStatus.PENDING,
      };

      await expect(DocumentModel.create(invalidDoc)).rejects.toThrow(
        /is not a supported document MIME type/,
      );
    });

    it('should support updating status to FAILED with errorMessage in repository', async () => {
      const doc = await repository.create(
        new Document({
          userId: userAId,
          originalFilename: 'corrupt.pdf',
          storageUri: 's3://bucket/corrupt.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 100,
        }),
      );

      const updated = await repository.update(doc.id!, userAId, {
        status: DocumentStatus.FAILED,
        errorMessage: 'SyntaxError: Unexpected EOF in PDF trailer dictionary',
      });

      expect(updated).not.toBeNull();
      expect(updated?.status).toBe(DocumentStatus.FAILED);
      expect(updated?.errorMessage).toBe('SyntaxError: Unexpected EOF in PDF trailer dictionary');
    });

    it('should support extensible academic metadata without schema migrations', async () => {
      const doc = await repository.create(
        new Document({
          userId: userAId,
          originalFilename: 'dissertation.pdf',
          storageUri: 's3://bucket/dissertation.pdf',
          mimeType: DocumentMimeType.PDF,
          sizeBytes: 5000000,
          metadata: {
            course: 'PHIL-900',
            professor: 'Dr. Noam Chomsky',
            bibliographyStyle: 'CHICAGO_17',
            peerReviewRound: 2,
            targetJournal: 'Nature Machine Intelligence',
          },
        }),
      );

      const fetched = await repository.findByIdAndOwner(doc.id!, userAId);
      expect(fetched?.metadata.course).toBe('PHIL-900');
      expect(fetched?.metadata.professor).toBe('Dr. Noam Chomsky');
      expect(fetched?.metadata.bibliographyStyle).toBe('CHICAGO_17');
      expect(fetched?.metadata.peerReviewRound).toBe(2);
      expect(fetched?.metadata.targetJournal).toBe('Nature Machine Intelligence');
    });
  });

  describe('DocumentMapper Primitives Stripping', () => {
    it('should ensure raw BSON _id and __v do not leak into Domain Entity', () => {
      const rawBson = {
        _id: new Types.ObjectId(),
        userId: new Types.ObjectId(),
        title: 'Mapper Test',
        originalFilename: 'test.pdf',
        storageUri: 's3://bucket/test.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        status: 'PENDING',
        __v: 0,
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const domainDoc = DocumentMapper.toDomain(rawBson);
      expect(typeof domainDoc.id).toBe('string');
      expect(typeof domainDoc.userId).toBe('string');
      expect((domainDoc as unknown as Record<string, unknown>)._id).toBeUndefined();
      expect((domainDoc as unknown as Record<string, unknown>).__v).toBeUndefined();
    });
  });
});
