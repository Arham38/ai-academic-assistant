import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../src/app';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { JwtTokenProvider } from '../../src/infrastructure/security/JwtTokenProvider';
import { BcryptHashProvider } from '../../src/infrastructure/security/BcryptHashProvider';
import { SystemRole } from '../../src/domain/types/Roles';
import { env } from '../../src/config/env';

describe('User Routes Integration Tests (/api/v1/users)', () => {
  let mongoServer: MongoMemoryServer | null = null;
  const tokenProvider = new JwtTokenProvider(env.JWT_SECRET, env.JWT_EXPIRES_IN);
  const hashProvider = new BcryptHashProvider(env.BCRYPT_SALT_ROUNDS);

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

  describe('GET /api/v1/users/me - Profile Retrieval', () => {
    it('should return 401 Unauthorized when request is unauthenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Authentication required. Please log in.');
    });

    it('should return authenticated user profile without exposing credentials or security internals', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'rosalind.franklin@kcl.ac.uk',
        passwordHash,
        firstName: 'Rosalind',
        lastName: 'Franklin',
        role: SystemRole.RESEARCHER,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();

      const user = res.body.data.user;
      expect(user.id).toBe(userDoc._id.toString());
      expect(user.email).toBe('rosalind.franklin@kcl.ac.uk');
      expect(user.firstName).toBe('Rosalind');
      expect(user.lastName).toBe('Franklin');
      expect(user.role).toBe('RESEARCHER');
      expect(user.status).toBe('ACTIVE');

      // Ensure no sensitive or internal fields are leaked
      expect(user.passwordHash).toBeUndefined();
      expect(user.password).toBeUndefined();
      expect(user.security).toBeUndefined();
      expect(user.tokenVersion).toBeUndefined();
    });
  });

  describe('PATCH /api/v1/users/me - Profile Update & Escalation Guardrails', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).patch('/api/v1/users/me').send({
        firstName: 'Hacked',
      });

      expect(res.status).toBe(401);
    });

    it('should successfully update firstName and lastName', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'alan.turing@manchester.ac.uk',
        passwordHash,
        firstName: 'Alan',
        lastName: 'Turing',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Al',
          lastName: 'Mathison Turing',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.firstName).toBe('Al');
      expect(res.body.data.user.lastName).toBe('Mathison Turing');

      // Verify in MongoDB persistence layer
      const updatedInDb = await UserModel.findById(userDoc._id);
      expect(updatedInDb?.firstName).toBe('Al');
      expect(updatedInDb?.lastName).toBe('Mathison Turing');
    });

    it('should reject request when body is empty', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'empty.payload@mit.edu',
        passwordHash,
        firstName: 'Empty',
        lastName: 'Payload',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');
      expect(
        res.body.invalidParams.some((p: { message: string }) =>
          p.message.includes('At least one field'),
        ),
      ).toBe(true);
    });

    it('should strictly reject role escalation attempts (role: ADMIN) with 400 Bad Request', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'student.escalator@mit.edu',
        passwordHash,
        firstName: 'Sneaky',
        lastName: 'Student',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          firstName: 'Sneaky',
          role: 'ADMIN',
        });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');
      expect(
        res.body.invalidParams.some((p: { message: string }) => p.message.includes('Unrecognized')),
      ).toBe(true);

      // Verify role has NOT changed in database
      const dbUser = await UserModel.findById(userDoc._id);
      expect(dbUser?.role).toBe(SystemRole.STUDENT);
    });

    it('should strictly reject IDOR attempts (id / _id injection) with 400 Bad Request', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'target.user@mit.edu',
        passwordHash,
        firstName: 'Target',
        lastName: 'User',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const otherUser = await UserModel.create({
        tenantId: 'default',
        email: 'other.victim@mit.edu',
        passwordHash,
        firstName: 'Victim',
        lastName: 'User',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: otherUser._id.toString(),
          firstName: 'Hijacked',
        });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');

      // Verify other user was untouched
      const untouchedVictim = await UserModel.findById(otherUser._id);
      expect(untouchedVictim?.firstName).toBe('Victim');
    });

    it('should strictly reject immutable email alteration with 400 Bad Request', async () => {
      const passwordHash = await hashProvider.hash('ValidPass123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'original.email@mit.edu',
        passwordHash,
        firstName: 'Original',
        lastName: 'Owner',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'tampered.email@mit.edu',
        });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');

      // Verify email remains unchanged in database
      const dbUser = await UserModel.findById(userDoc._id);
      expect(dbUser?.email).toBe('original.email@mit.edu');
    });
  });

  describe('PATCH /api/v1/users/me/password - Password Rotation & Session Invalidation', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      const res = await request(app).patch('/api/v1/users/me/password').send({
        currentPassword: 'OldPassword123!',
        newPassword: 'NewPassword123!',
      });

      expect(res.status).toBe(401);
    });

    it('should return 401 Unauthorized when current password is wrong', async () => {
      const passwordHash = await hashProvider.hash('CorrectPassword123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'pass.rotation@mit.edu',
        passwordHash,
        firstName: 'Rotation',
        lastName: 'Test',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'WrongPassword123!',
          newPassword: 'BrandNewSecure123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.detail).toBe('Invalid current password.');

      // Token version must NOT have been incremented
      const dbUser = await UserModel.findById(userDoc._id);
      expect(dbUser?.security.tokenVersion).toBe(1);
    });

    it('should reject when new password is weak or fails validation', async () => {
      const passwordHash = await hashProvider.hash('CorrectPassword123!');
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'weak.rotation@mit.edu',
        passwordHash,
        firstName: 'Weak',
        lastName: 'Pass',
        role: SystemRole.STUDENT,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      const token = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      const res = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${token}`)
        .send({
          currentPassword: 'CorrectPassword123!',
          newPassword: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.title).toBe('Validation Error');
    });

    it('should successfully rotate password, increment tokenVersion, and invalidate active sessions', async () => {
      const originalPassword = 'InitialPassword123!';
      const newPassword = 'BrandNewPassword456!';
      const initialPasswordHash = await hashProvider.hash(originalPassword);

      // 1. Seed user with tokenVersion: 1
      const userDoc = await UserModel.create({
        tenantId: 'default',
        email: 'session.invalidation@mit.edu',
        passwordHash: initialPasswordHash,
        firstName: 'Grace',
        lastName: 'Hopper',
        role: SystemRole.RESEARCHER,
        status: 'ACTIVE',
        'security.tokenVersion': 1,
      });

      // 2. Issue an active JWT access token using tokenVersion: 1
      const activeAccessToken = tokenProvider.generateAccessToken({
        id: userDoc._id.toString(),
        role: userDoc.role,
        tokenVersion: 1,
      });

      // Confirm old token can read profile
      const preCheck = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${activeAccessToken}`);
      expect(preCheck.status).toBe(200);

      // 3. Rotate password via PATCH /api/v1/users/me/password
      const rotateRes = await request(app)
        .patch('/api/v1/users/me/password')
        .set('Authorization', `Bearer ${activeAccessToken}`)
        .send({
          currentPassword: originalPassword,
          newPassword,
        });

      expect(rotateRes.status).toBe(200);
      expect(rotateRes.body.status).toBe('success');
      expect(rotateRes.body.message).toContain('Password updated securely');

      // 4. Verify MongoDB state: tokenVersion incremented to 2, passwordHash updated
      const updatedUser = await UserModel.findById(userDoc._id).select('+passwordHash');
      expect(updatedUser?.security.tokenVersion).toBe(2);
      expect(updatedUser?.passwordHash).not.toBe(initialPasswordHash);

      const isNewPasswordValid = await hashProvider.compare(newPassword, updatedUser!.passwordHash);
      expect(isNewPasswordValid).toBe(true);

      // 5. Verify Session Invalidation: Old access token must now be rejected (tokenVersion mismatch)
      const postInvalidationRes = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${activeAccessToken}`);

      expect(postInvalidationRes.status).toBe(401);
      expect(postInvalidationRes.body.detail).toBe('Token is invalid or has expired.');

      // 6. Verify User can authenticate with the newly rotated password
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'session.invalidation@mit.edu',
        password: newPassword,
      });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();

      // 7. Verify the new token (bearing tokenVersion: 2) successfully accesses the profile
      const newProfileRes = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${loginRes.body.data.accessToken}`);

      expect(newProfileRes.status).toBe(200);
      expect(newProfileRes.body.data.user.email).toBe('session.invalidation@mit.edu');
    }, 15000);
  });
});
