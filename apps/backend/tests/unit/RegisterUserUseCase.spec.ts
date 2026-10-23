import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RegisterUserUseCase } from '../../src/application/use-cases/auth/RegisterUserUseCase';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { IHashProvider } from '../../src/domain/providers/IHashProvider';
import { User } from '../../src/domain/entities/User';
import { ConflictError } from '../../src/domain/errors/AppError';

describe('RegisterUserUseCase Unit Tests', () => {
  let mockUserRepository: IUserRepository;
  let mockHashProvider: IHashProvider;
  let useCase: RegisterUserUseCase;

  beforeEach(() => {
    mockUserRepository = {
      create: vi.fn(),
      createMany: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      find: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      findByEmail: vi.fn(),
      findByEmailAndTenant: vi.fn(),
      incrementTokenVersion: vi.fn(),
      updateAIUsage: vi.fn(),
      updateLastLogin: vi.fn(),
      existsByEmail: vi.fn(),
    };

    mockHashProvider = {
      hash: vi.fn().mockResolvedValue('$2b$12$mockedHashedPasswordValue123'),
      compare: vi.fn(),
    };

    useCase = new RegisterUserUseCase(mockUserRepository, mockHashProvider);
  });

  it('should successfully register a new user and return a sanitized DTO', async () => {
    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockUserRepository.create).mockImplementation(async (user: User) => {
      // Simulate ID assigned upon persistence
      return new User({
        id: 'user_1234567890abcdef',
        tenantId: user.tenantId,
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        status: user.status,
      });
    });

    const result = await useCase.execute({
      firstName: 'Alan',
      lastName: 'Turing',
      email: 'alan.turing@cambridge.edu',
      password: 'EnigmaPassword123!',
      tenantId: 'cambridge_tenant',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('alan.turing@cambridge.edu');
    expect(mockHashProvider.hash).toHaveBeenCalledWith('EnigmaPassword123!');
    expect(mockUserRepository.create).toHaveBeenCalled();

    expect(result).toEqual({
      id: 'user_1234567890abcdef',
      email: 'alan.turing@cambridge.edu',
      firstName: 'Alan',
      lastName: 'Turing',
      role: 'STUDENT',
    });

    // Verify sensitive fields are strictly omitted
    expect((result as Record<string, unknown>).passwordHash).toBeUndefined();
    expect((result as Record<string, unknown>).security).toBeUndefined();
    expect((result as Record<string, unknown>).isDeleted).toBeUndefined();
  });

  it('should automatically normalize email to lowercase and trimmed before check and persistence', async () => {
    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockUserRepository.create).mockImplementation(async (user: User) => {
      return new User({
        id: 'user_norm',
        tenantId: user.tenantId,
        email: user.email,
        passwordHash: user.passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    });

    await useCase.execute({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: '  Ada.Lovelace@AnalyticalEngine.ORG  ',
      password: 'Algorithms1843!',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
      'ada.lovelace@analyticalengine.org',
    );
  });

  it('should throw a ConflictError when the email is already registered', async () => {
    const existingUser = new User({
      id: 'existing_id',
      tenantId: 'default',
      email: 'existing@university.edu',
      firstName: 'Existing',
      lastName: 'User',
    });
    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);

    await expect(
      useCase.execute({
        firstName: 'Duplicate',
        lastName: 'Attempt',
        email: 'EXISTING@university.edu',
        password: 'Password123!',
      }),
    ).rejects.toThrow(ConflictError);

    expect(mockHashProvider.hash).not.toHaveBeenCalled();
    expect(mockUserRepository.create).not.toHaveBeenCalled();
  });
});
