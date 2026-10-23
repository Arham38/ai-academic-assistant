import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';

describe('Auth API Routes Integration Tests (/api/v1/auth)', () => {
  let mongoServer: MongoMemoryServer | null = null;

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

  describe('POST /api/v1/auth/register', () => {
    it('should reject registration when password is weak (fails Zod schema validation)', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        password: '123', // Weak password
      });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');
      expect(res.body.invalidParams).toBeDefined();
      expect(res.body.invalidParams.some((p: { field: string }) => p.field === 'password')).toBe(
        true,
      );
    });

    it('should reject registration when required fields are missing', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'not-an-email',
      });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');
    });

    it('should successfully register a user with valid credentials, persisting bcrypt hash in database', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada.lovelace@analytical.org',
        password: 'SecurePassword123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.email).toBe('ada.lovelace@analytical.org');
      expect(res.body.data.user.firstName).toBe('Ada');
      expect(res.body.data.user.lastName).toBe('Lovelace');
      expect(res.body.data.user.role).toBe('STUDENT');

      // Verify the password is stored as a bcrypt hash in the database, NOT plaintext
      const rawUser = await UserModel.findById(res.body.data.user.id)
        .select('+passwordHash')
        .lean();
      expect(rawUser).not.toBeNull();
      expect(rawUser?.passwordHash).not.toBe('SecurePassword123!');
      expect(rawUser?.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
    });

    it('should return 409 Conflict when attempting to register an existing email', async () => {
      // First registration
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'duplicate@analytical.org',
        password: 'SecurePassword123!',
      });

      // Second registration with the same email
      const res = await request(app).post('/api/v1/auth/register').send({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'DUPLICATE@analytical.org',
        password: 'DifferentPassword123!',
      });

      expect(res.status).toBe(409);
      expect(res.body.detail).toContain('already exists');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Seed a user for login tests
      await request(app).post('/api/v1/auth/register').send({
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace.hopper@navy.mil',
        password: 'CompilerAuthor1952!',
      });
    });

    it('should successfully authenticate with valid credentials', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'grace.hopper@navy.mil',
        password: 'CompilerAuthor1952!',
      });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.accessToken.split('.')).toHaveLength(3);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('grace.hopper@navy.mil');
      expect(res.body.data.user.role).toBe('STUDENT');
    });

    it('should return 401 with generic error message when password is wrong', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'grace.hopper@navy.mil',
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password.');
    });

    it('should return 401 with generic error message when email does not exist', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@navy.mil',
        password: 'AnyPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid email or password.');
    });
  });
});
