import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { JwtTokenProvider } from '../../src/infrastructure/security/JwtTokenProvider';
import { SystemRole } from '../../src/domain/types/Roles';
import { env } from '../../src/config/env';

describe('Admin Routes Authorization Integration Tests (/api/v1/admin)', () => {
  let mongoServer: MongoMemoryServer | null = null;
  const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ai-academic-test';
    try {
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
    } catch {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
    await UserModel.init();
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await UserModel.deleteMany({});
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
  });

  describe('GET /api/v1/admin/status - RBAC Gatekeeper', () => {
    it('should return 401 Unauthorized when no Authorization token is provided', async () => {
      const res = await request(app).get('/api/v1/admin/status');

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Authentication required. Please log in.');
    });

    it('should return 403 Forbidden when accessed by a STUDENT user', async () => {
      const studentDoc = await UserModel.create({
        tenantId: 'default',
        email: 'student.rbac@mit.edu',
        passwordHash: '$2b$12$securehash',
        firstName: 'Student',
        lastName: 'RBAC',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const studentToken = tokenProvider.generateAccessToken({
        id: studentDoc._id.toString(),
        role: studentDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/status')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Access Denied');
    });

    it('should return 403 Forbidden when accessed by a RESEARCHER user', async () => {
      const researcherDoc = await UserModel.create({
        tenantId: 'default',
        email: 'researcher.rbac@mit.edu',
        passwordHash: '$2b$12$securehash',
        firstName: 'Researcher',
        lastName: 'RBAC',
        role: SystemRole.RESEARCHER,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const researcherToken = tokenProvider.generateAccessToken({
        id: researcherDoc._id.toString(),
        role: researcherDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/status')
        .set('Authorization', `Bearer ${researcherToken}`);

      expect(res.status).toBe(403);
      expect(res.body.detail).toContain('Access Denied');
    });

    it('should return 200 OK with system status when accessed by an ADMIN user', async () => {
      const adminDoc = await UserModel.create({
        tenantId: 'default',
        email: 'admin.rbac@mit.edu',
        passwordHash: '$2b$12$securehash',
        firstName: 'System',
        lastName: 'Administrator',
        role: SystemRole.ADMIN,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const adminToken = tokenProvider.generateAccessToken({
        id: adminDoc._id.toString(),
        role: adminDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/status')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.admin).toBe(true);
      expect(res.body.data.systemStatus).toBe('operational');
    });
  });

  describe('GET /api/v1/admin/users', () => {
    it('should return 403 Forbidden for non-admin users', async () => {
      const studentDoc = await UserModel.create({
        tenantId: 'default',
        email: 'student.list@mit.edu',
        passwordHash: '$2b$12$securehash',
        firstName: 'Student',
        lastName: 'List',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const studentToken = tokenProvider.generateAccessToken({
        id: studentDoc._id.toString(),
        role: studentDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
    });

    it('should return 200 OK and list of users for authenticated ADMIN users', async () => {
      const adminDoc = await UserModel.create({
        tenantId: 'default',
        email: 'admin.super@mit.edu',
        passwordHash: '$2b$12$securehash',
        firstName: 'Super',
        lastName: 'Admin',
        role: SystemRole.ADMIN,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const adminToken = tokenProvider.generateAccessToken({
        id: adminDoc._id.toString(),
        role: adminDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users).toBeDefined();
      expect(Array.isArray(res.body.data.users)).toBe(true);
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.users[0].email).toBe('admin.super@mit.edu');
    });
  });
});
