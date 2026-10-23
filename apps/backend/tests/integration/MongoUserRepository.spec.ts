import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoUserRepository } from '../../src/infrastructure/database/mongodb/MongoUserRepository';
import { UserModel } from '../../src/infrastructure/database/mongodb/models/UserModel';
import { User } from '../../src/domain/entities/User';

describe('MongoUserRepository Integration Tests', () => {
  let mongoServer: MongoMemoryServer | null = null;
  let repository: MongoUserRepository;

  beforeAll(async () => {
    const testUri = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/ai-academic-test';
    try {
      await mongoose.connect(testUri, { serverSelectionTimeoutMS: 2000 });
    } catch {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
    await UserModel.init();
    repository = new MongoUserRepository(UserModel);
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

  it('should successfully create and persist a user, mapping to pure Domain User entity', async () => {
    const userToCreate = new User({
      tenantId: 'tenant_mit_01',
      email: 'ada.lovelace@mit.edu',
      passwordHash: '$2b$12$securehashvalue1234567890',
      firstName: 'Ada',
      lastName: 'Lovelace',
      role: 'RESEARCHER',
    });

    const created = await repository.create(userToCreate);

    expect(created).toBeInstanceOf(User);
    expect(created.id).toBeDefined();
    expect(typeof created.id).toBe('string');
    // Ensure no raw MongoDB ObjectId is exposed
    expect(created.id).toMatch(/^[0-9a-fA-F]{24}$/);
    expect(created.email).toBe('ada.lovelace@mit.edu');
    expect(created.role).toBe('RESEARCHER');
    expect(created.status).toBe('ACTIVE');
    expect(created.aiUsage.tokensConsumed).toBe(0);
    expect(created.security.tokenVersion).toBe(1);
    expect(created.isDeleted).toBe(false);
  });

  it('should automatically normalize mixed-case and whitespace emails upon save', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: '  Grace.HOPPER@Yale.EDU  ',
      passwordHash: '$2b$12$hash',
      firstName: 'Grace',
      lastName: 'Hopper',
    });

    const created = await repository.create(user);
    expect(created.email).toBe('grace.hopper@yale.edu');

    // Verify raw database record
    const rawRecord = await UserModel.findById(created.id).lean();
    expect(rawRecord?.email).toBe('grace.hopper@yale.edu');
  });

  it('should reject duplicate email addresses with a MongoDB duplicate key error (code 11000)', async () => {
    const user1 = new User({
      tenantId: 'tenant_mit_01',
      email: 'unique.scholar@mit.edu',
      passwordHash: '$2b$12$hash1',
      firstName: 'First',
      lastName: 'Scholar',
    });

    await repository.create(user1);

    const duplicateUser = new User({
      tenantId: 'tenant_mit_01',
      email: 'UNIQUE.SCHOLAR@MIT.EDU', // Same email, different casing
      passwordHash: '$2b$12$hash2',
      firstName: 'Second',
      lastName: 'Scholar',
    });

    await expect(repository.create(duplicateUser)).rejects.toThrow();
  });

  it('should exclude passwordHash by default in queries to prevent credential leakage', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: 'no.leak@mit.edu',
      passwordHash: '$2b$12$supersecretpasswordhash',
      firstName: 'Safe',
      lastName: 'User',
    });

    const created = await repository.create(user);

    // Standard findById query
    const foundById = await repository.findById(created.id!);
    expect(foundById?.passwordHash).toBeUndefined();

    // Standard findByEmail query
    const foundByEmail = await repository.findByEmail('no.leak@mit.edu');
    expect(foundByEmail?.passwordHash).toBeUndefined();
  });

  it('should explicitly include passwordHash when requested for authentication verification', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: 'auth.verify@mit.edu',
      passwordHash: '$2b$12$supersecretpasswordhash',
      firstName: 'Auth',
      lastName: 'User',
    });

    await repository.create(user);

    const foundWithPassword = await repository.findByEmail('auth.verify@mit.edu', true);
    expect(foundWithPassword).not.toBeNull();
    expect(foundWithPassword?.passwordHash).toBe('$2b$12$supersecretpasswordhash');
  });

  it('should filter soft-deleted users from standard queries', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: 'to.delete@mit.edu',
      passwordHash: '$2b$12$hash',
      firstName: 'To',
      lastName: 'Delete',
    });

    const created = await repository.create(user);
    const softDeleted = await repository.softDelete(created.id!);
    expect(softDeleted).toBe(true);

    // Standard query must NOT find soft-deleted user
    const foundStandard = await repository.findById(created.id!);
    expect(foundStandard).toBeNull();

    const foundByEmail = await repository.findByEmail('to.delete@mit.edu');
    expect(foundByEmail).toBeNull();

    // With includeDeleted = true, it should return the soft-deleted user
    const foundDeleted = await repository.findById(created.id!, true);
    expect(foundDeleted).not.toBeNull();
    expect(foundDeleted?.isDeleted).toBe(true);
  });

  it('should increment tokenVersion in database atomically', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: 'token.version@mit.edu',
      passwordHash: '$2b$12$hash',
      firstName: 'Token',
      lastName: 'Test',
    });

    const created = await repository.create(user);
    expect(created.security.tokenVersion).toBe(1);

    const newVersion = await repository.incrementTokenVersion(created.id!);
    expect(newVersion).toBe(2);

    const refreshed = await repository.findById(created.id!);
    expect(refreshed?.security.tokenVersion).toBe(2);
  });

  it('should update AI tokens consumed atomically', async () => {
    const user = new User({
      tenantId: 'tenant_mit_01',
      email: 'ai.usage@mit.edu',
      passwordHash: '$2b$12$hash',
      firstName: 'AI',
      lastName: 'User',
    });

    const created = await repository.create(user);
    expect(created.aiUsage.tokensConsumed).toBe(0);

    const updated = await repository.updateAIUsage(created.id!, 4500);
    expect(updated).toBe(true);

    const refreshed = await repository.findById(created.id!);
    expect(refreshed?.aiUsage.tokensConsumed).toBe(4500);
  });
});
