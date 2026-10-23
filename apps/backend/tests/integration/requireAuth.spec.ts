import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { JwtTokenProvider } from '../../src/infrastructure/security/JwtTokenProvider';
import { env } from '../../src/config/env';

describe('requireAuth Middleware Integration Tests (/api/v1/users/me)', () => {
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

  it('should return 401 Unauthorized when Authorization header is missing', async () => {
    const res = await request(app).get('/api/v1/users/me');

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Authentication required. Please log in.');
  });

  it('should return 401 Unauthorized when Authorization header does not use Bearer scheme', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=');

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Authentication required. Please log in.');
  });

  it('should return 401 Unauthorized when token string is empty or invalid', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', 'Bearer invalid.tampered.token');

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Token is invalid or has expired.');
  });

  it('should return 401 Unauthorized when token has expired', async () => {
    const shortLivedProvider = new JwtTokenProvider(env.JWT_SECRET, '1ms');

    // Create a user in database
    const userDoc = await UserModel.create({
      tenantId: 'default',
      email: 'expired.test@institution.edu',
      passwordHash: '$2b$12$somehash',
      firstName: 'Expired',
      lastName: 'User',
      role: 'STUDENT',
      status: 'ACTIVE',
      'security.tokenVersion': 1,
    });

    const expiredToken = shortLivedProvider.generateAccessToken({
      id: userDoc._id.toString(),
      role: userDoc.role,
      tokenVersion: 1,
    });

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 20));

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Token is invalid or has expired.');
  });

  it('should return 200 OK and user profile when a valid token is provided', async () => {
    const userDoc = await UserModel.create({
      tenantId: 'default',
      email: 'valid.scholar@mit.edu',
      passwordHash: '$2b$12$securehash',
      firstName: 'Valid',
      lastName: 'Scholar',
      role: 'RESEARCHER',
      status: 'ACTIVE',
      'security.tokenVersion': 1,
    });

    const validToken = tokenProvider.generateAccessToken({
      id: userDoc._id.toString(),
      role: userDoc.role,
      tokenVersion: 1,
    });

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.id).toBe(userDoc._id.toString());
    expect(res.body.data.user.email).toBe('valid.scholar@mit.edu');
  });

  it('should instantly invalidate previously issued tokens when tokenVersion is incremented in database', async () => {
    // 1. Create user with tokenVersion: 1
    const userDoc = await UserModel.create({
      tenantId: 'default',
      email: 'revocation.test@mit.edu',
      passwordHash: '$2b$12$securehash',
      firstName: 'Revoke',
      lastName: 'Test',
      role: 'STUDENT',
      status: 'ACTIVE',
      'security.tokenVersion': 1,
    });

    // 2. Issue token with tokenVersion: 1
    const issuedToken = tokenProvider.generateAccessToken({
      id: userDoc._id.toString(),
      role: userDoc.role,
      tokenVersion: 1,
    });

    // Verify token works initially
    const initialRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${issuedToken}`);
    expect(initialRes.status).toBe(200);

    // 3. Increment tokenVersion in database (simulating remote logout or password reset)
    await UserModel.updateOne({ _id: userDoc._id }, { $inc: { 'security.tokenVersion': 1 } });

    // 4. Send request with the old token (containing tokenVersion: 1 while DB is now 2)
    const revokedRes = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${issuedToken}`);

    // Must be rejected with 401 Unauthorized
    expect(revokedRes.status).toBe(401);
    expect(revokedRes.body.detail).toBe('Token is invalid or has expired.');
  });

  it('should return 403 Forbidden when an authenticated user account has been suspended', async () => {
    const userDoc = await UserModel.create({
      tenantId: 'default',
      email: 'suspended.student@mit.edu',
      passwordHash: '$2b$12$securehash',
      firstName: 'Suspended',
      lastName: 'Student',
      role: 'STUDENT',
      status: 'SUSPENDED',
      'security.tokenVersion': 1,
    });

    const token = tokenProvider.generateAccessToken({
      id: userDoc._id.toString(),
      role: userDoc.role,
      tokenVersion: 1,
    });

    const res = await request(app).get('/api/v1/users/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.detail).toContain('Account is suspended');
  });
});
