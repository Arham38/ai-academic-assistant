import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUserUseCase } from '../../src/application/use-cases/auth/LoginUserUseCase';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { IHashProvider } from '../../src/domain/providers/IHashProvider';
import { User } from '../../src/domain/entities/User';
import { UnauthorizedError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('LoginUserUseCase Unit Tests', () => {
  let mockUserRepository: IUserRepository;
  let mockHashProvider: IHashProvider;
  let useCase: LoginUserUseCase;

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
      hash: vi.fn(),
      compare: vi.fn(),
    };

    useCase = new LoginUserUseCase(mockUserRepository, mockHashProvider);
  });

  it('should successfully authenticate with valid credentials and return sanitized profile', async () => {
    const existingUser = new User({
      id: 'valid_user_id',
      tenantId: 'default',
      email: 'scholar@institution.edu',
      passwordHash: '$2b$12$hashedPasswordRecord12345',
      firstName: 'Marie',
      lastName: 'Curie',
      role: 'RESEARCHER',
      status: 'ACTIVE',
    });

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(true);

    const result = await useCase.execute({
      email: 'scholar@institution.edu',
      password: 'Radioactivity1898!',
    });

    expect(mockUserRepository.findByEmail).toHaveBeenCalledWith('scholar@institution.edu', true);
    expect(mockHashProvider.compare).toHaveBeenCalledWith(
      'Radioactivity1898!',
      '$2b$12$hashedPasswordRecord12345',
    );
    expect(mockUserRepository.updateLastLogin).toHaveBeenCalledWith('valid_user_id');

    expect(result).toEqual({
      id: 'valid_user_id',
      email: 'scholar@institution.edu',
      role: 'RESEARCHER',
      firstName: 'Marie',
      lastName: 'Curie',
    });
  });

  it('should mitigate timing attacks by comparing against dummy hash when user is not found', async () => {
    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(false);

    await expect(
      useCase.execute({
        email: 'unknown.user@institution.edu',
        password: 'RandomPassword123!',
      }),
    ).rejects.toThrow(UnauthorizedError);

    // Assert that compare was executed against the dummy hash to equalize latency
    expect(mockHashProvider.compare).toHaveBeenCalledWith(
      'RandomPassword123!',
      expect.stringMatching(/^\$2[aby]\$/),
    );
  });

  it('should throw generic UnauthorizedError when password does not match', async () => {
    const existingUser = new User({
      id: 'user_id',
      tenantId: 'default',
      email: 'user@institution.edu',
      passwordHash: '$2b$12$actualHash',
      firstName: 'Isaac',
      lastName: 'Newton',
    });

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(existingUser);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(false);

    let caughtError: unknown;
    try {
      await useCase.execute({
        email: 'user@institution.edu',
        password: 'WrongPassword!',
      });
    } catch (err) {
      caughtError = err;
    }

    expect(caughtError).toBeInstanceOf(UnauthorizedError);
    expect((caughtError as UnauthorizedError).message).toBe('Invalid email or password.');
    expect(mockUserRepository.updateLastLogin).not.toHaveBeenCalled();
  });

  it('should throw ForbiddenError when user account is suspended', async () => {
    const suspendedUser = new User({
      id: 'suspended_user_id',
      tenantId: 'default',
      email: 'suspended@institution.edu',
      passwordHash: '$2b$12$actualHash',
      firstName: 'Suspended',
      lastName: 'User',
      status: 'SUSPENDED',
    });

    vi.mocked(mockUserRepository.findByEmail).mockResolvedValue(suspendedUser);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(true);

    await expect(
      useCase.execute({
        email: 'suspended@institution.edu',
        password: 'ValidPassword123!',
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(mockUserRepository.updateLastLogin).not.toHaveBeenCalled();
  });
});
