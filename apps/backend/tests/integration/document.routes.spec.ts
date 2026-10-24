import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'node:fs';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { DocumentModel } from '../../src/infrastructure/database/mongodb/models/DocumentModel';
import { JwtTokenProvider } from '../../src/infrastructure/security/JwtTokenProvider';
import { BcryptHashProvider } from '../../src/infrastructure/security/BcryptHashProvider';
import { localStorageProvider } from '../../src/infrastructure/storage/LocalStorageProvider';
import { SystemRole } from '../../src/domain/types/Roles';
import { DocumentStatus } from '../../src/domain/types/DocumentStatus';
import { env } from '../../src/config/env';

describe('Document Upload Routes Integration Tests (/api/v1/documents)', () => {
  let mongoServer: MongoMemoryServer | null = null;
  const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const hashProvider = new BcryptHashProvider(env.BCRYPT_SALT_ROUNDS);

  let testUserToken: string;
  let testUserId: string;
  const createdUris: string[] = [];

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ai-academic-test';
    try {
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
    } catch {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
    await UserModel.init();
    await DocumentModel.init();
  }, 30000);

  afterAll(async () => {
    // Clean up physical test files
    for (const uri of createdUris) {
      try {
        await localStorageProvider.deleteFile(uri);
      } catch {
        // Ignore test cleanup errors
      }
    }

    if (mongoose.connection.readyState !== 0) {
      await UserModel.deleteMany({});
      await DocumentModel.deleteMany({});
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await DocumentModel.deleteMany({});

    const passwordHash = await hashProvider.hash('StrongPass123!');
    const user = await UserModel.create({
      tenantId: 'default',
      email: 'student.researcher@university.edu',
      passwordHash,
      firstName: 'Alan',
      lastName: 'Turing',
      role: SystemRole.STUDENT,
      status: 'ACTIVE',
      'security.tokenVersion': 1,
    });

    testUserId = user._id.toString();
    testUserToken = tokenProvider.generateAccessToken({
      id: testUserId,
      role: user.role,
      tokenVersion: 1,
    });
  });

  describe('POST /api/v1/documents - Ingestion and Validation', () => {
    it('should return 401 Unauthorized when request lacks JWT authorization', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .attach('file', Buffer.from('%PDF-1.4 test'), 'sample.pdf');

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Authentication required. Please log in.');
    });

    it('should return 400 Bad Request when no file is attached to the request', async () => {
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ title: 'No file paper' });

      expect(res.status).toBe(400);
      expect(res.body.detail).toContain('No file uploaded');
    });

    it('should return 400 Bad Request when an unsupported MIME type is uploaded', async () => {
      const malwareBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', malwareBuffer, {
          filename: 'payload.exe',
          contentType: 'application/x-msdownload',
        });

      expect(res.status).toBe(400);
      expect(res.body.detail).toMatch(/Unsupported file format/i);
    });

    it('should return 413 Payload Too Large when file exceeds 10MB limit', async () => {
      // 10MB + 1024 bytes buffer
      const oversizedBuffer = Buffer.alloc(10 * 1024 * 1024 + 1024);

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', oversizedBuffer, {
          filename: 'massive-paper.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(413);
      expect(res.body.detail).toMatch(/File size exceeds/i);
    });

    it('should successfully upload a valid PDF and initialize PENDING status in DB', async () => {
      const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .field('title', 'On Computable Numbers')
        .attach('file', pdfBuffer, {
          filename: 'turing-1936.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');

      const doc = res.body.data.document;
      expect(doc.id).toBeDefined();
      expect(doc.userId).toBe(testUserId);
      expect(doc.title).toBe('On Computable Numbers');
      expect(doc.originalFilename).toBe('turing-1936.pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.status).toBe(DocumentStatus.PENDING);
      expect(doc.storageUri).toMatch(/^\/uploads\/[0-9a-f-]{36}\.pdf$/);

      createdUris.push(doc.storageUri);

      // Verify MongoDB persistence
      const dbRecord = await DocumentModel.findById(doc.id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord?.userId.toString()).toBe(testUserId);
      expect(dbRecord?.status).toBe(DocumentStatus.PENDING);

      // Verify physical disk persistence
      const absolutePath = localStorageProvider.getAbsolutePath(doc.storageUri);
      expect(fs.existsSync(absolutePath)).toBe(true);
    });

    it('should successfully upload a valid DOCX file', async () => {
      const docxBuffer = Buffer.from('PK\x03\x04 fake docx content');

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', docxBuffer, {
          filename: 'draft-dissertation.docx',
          contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

      expect(res.status).toBe(201);
      const doc = res.body.data.document;
      expect(doc.mimeType).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      );
      expect(doc.storageUri).toMatch(/^\/uploads\/[0-9a-f-]{36}\.docx$/);
      createdUris.push(doc.storageUri);
    });

    it('should successfully upload a valid TXT file', async () => {
      const txtBuffer = Buffer.from('Abstract:\nThis study evaluates AI RAG pipelines.');

      const res = await request(app)
        .post('/api/v1/documents')
        .set('Authorization', `Bearer ${testUserToken}`)
        .attach('file', txtBuffer, {
          filename: 'abstract.txt',
          contentType: 'text/plain',
        });

      expect(res.status).toBe(201);
      const doc = res.body.data.document;
      expect(doc.mimeType).toBe('text/plain');
      expect(doc.storageUri).toMatch(/^\/uploads\/[0-9a-f-]{36}\.txt$/);
      createdUris.push(doc.storageUri);
    });
  });
});
