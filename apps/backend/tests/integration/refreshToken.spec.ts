import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { RefreshTokenModel } from '../../src/infrastructure/database/mongodb/models/RefreshTokenModel';

describe('Refresh Token System Integration Tests (/api/v1/auth)', () => {
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
    await RefreshTokenModel.init();
  }, 30000);

  afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
      await UserModel.deleteMany({});
      await RefreshTokenModel.deleteMany({});
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await RefreshTokenModel.deleteMany({});

    // Register baseline user
    await request(app).post('/api/v1/auth/register').send({
      firstName: 'Katherine',
      lastName: 'Johnson',
      email: 'katherine.johnson@nasa.gov',
      password: 'TrajectoryMath1962!',
    });
  });

  describe('POST /api/v1/auth/login - Cookie Transmission', () => {
    it('should set an HttpOnly refresh token cookie and strictly omit it from JSON response body', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'katherine.johnson@nasa.gov',
        password: 'TrajectoryMath1962!',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user).toBeDefined();

      // Non-functional requirement: Refresh token must NEVER be returned in JSON
      expect((res.body.data as Record<string, unknown>).refreshToken).toBeUndefined();
      expect((res.body.data as Record<string, unknown>).rawRefreshToken).toBeUndefined();

      // Functional requirement: Cookie must be present with security attributes
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join(';') : (cookies as string);
      expect(cookieStr).toContain('refreshToken=');
      expect(cookieStr.toLowerCase()).toContain('httponly');
      expect(cookieStr.toLowerCase()).toContain('path=/api/v1/auth');
      expect(cookieStr.toLowerCase()).toContain('samesite=strict');
    });
  });

  describe('POST /api/v1/auth/refresh - Token Rotation & Reuse Detection', () => {
    it('should reject refresh request when cookie is missing', async () => {
      const res = await request(app).post('/api/v1/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.detail).toContain('Refresh token cookie missing');
    });

    it('should exchange a valid refresh token cookie for a new JWT and a rotated refresh token cookie', async () => {
      // 1. Log in to get initial cookie
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'katherine.johnson@nasa.gov',
        password: 'TrajectoryMath1962!',
      });

      const initialCookies = loginRes.headers['set-cookie'];

      // 2. Refresh session with initial cookie
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', initialCookies);

      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.status).toBe('success');
      expect(refreshRes.body.data.accessToken).toBeDefined();

      // Verify new rotated cookie was sent
      const rotatedCookies = refreshRes.headers['set-cookie'];
      expect(rotatedCookies).toBeDefined();
      expect(rotatedCookies).not.toEqual(initialCookies);
    });

    it('should detect reuse of a previously rotated token, revoke the entire session family, and block all subsequent requests', async () => {
      // 1. Initial Login (Token A)
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'katherine.johnson@nasa.gov',
        password: 'TrajectoryMath1962!',
      });
      const cookieTokenA = loginRes.headers['set-cookie'];

      // 2. Legitimate user rotates Token A -> receives Token B
      const refreshRes1 = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieTokenA);
      expect(refreshRes1.status).toBe(200);
      const cookieTokenB = refreshRes1.headers['set-cookie'];

      // 3. Attacker presents stolen Token A (which is now revoked)
      const attackerRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookieTokenA);

      // System must detect reuse and reject
      expect(attackerRes.status).toBe(401);
      expect(attackerRes.body.detail).toContain('Compromised session detected');

      // 4. Legitimate user now presents Token B
      const victimRes = await request(app).post('/api/v1/auth/refresh').set('Cookie', cookieTokenB);

      // Token B must also be rejected because the entire token family was revoked upon reuse detection!
      expect(victimRes.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout - Session Revocation', () => {
    it('should revoke the refresh token in the database and clear the browser cookie', async () => {
      // 1. Log in
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'katherine.johnson@nasa.gov',
        password: 'TrajectoryMath1962!',
      });
      const cookies = loginRes.headers['set-cookie'];

      // 2. Call logout
      const logoutRes = await request(app).post('/api/v1/auth/logout').set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.message).toContain('Successfully logged out');

      // Assert cookie clearing header was issued (Max-Age=0 or empty expires)
      const logoutCookies = logoutRes.headers['set-cookie'];
      expect(logoutCookies).toBeDefined();
      const logoutCookieStr = Array.isArray(logoutCookies)
        ? logoutCookies.join(';')
        : (logoutCookies as string);
      expect(logoutCookieStr).toContain('refreshToken=;');

      // 3. Verify attempting to refresh with the logged out token fails
      const postLogoutRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies);

      expect(postLogoutRefresh.status).toBe(401);
    });
  });
});
