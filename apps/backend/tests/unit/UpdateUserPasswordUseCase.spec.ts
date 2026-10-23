import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UpdateUserPasswordUseCase } from '../../src/application/use-cases/users/UpdateUserPasswordUseCase';
import { IUserRepository } from '../../src/domain/repositories/IUserRepository';
import { IHashProvider } from '../../src/domain/providers/IHashProvider';
import { User, SystemRole } from '../../src/domain/entities/User';
import { UnauthorizedError, ForbiddenError } from '../../src/domain/errors/AppError';

describe('UpdateUserPasswordUseCase Unit Tests', () => {
  let mockUserRepository: IUserRepository;
  let mockHashProvider: IHashProvider;
  let useCase: UpdateUserPasswordUseCase;

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
      hash: vi.fn().mockResolvedValue('$2b$12$newHashedPassword'),
      compare: vi.fn(),
    };

    useCase = new UpdateUserPasswordUseCase(mockUserRepository, mockHashProvider);
  });

  it('should successfully verify current password, hash new password, increment tokenVersion, and save', async () => {
    const existingUser = new User({
      id: 'usr_123',
      tenantId: 'default',
      email: 'marie@curie.org',
      passwordHash: '$2b$12$oldHashedPassword',
      firstName: 'Marie',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
      security: { tokenVersion: 1 },
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(true);
    vi.mocked(mockUserRepository.update).mockResolvedValue(existingUser);

    const result = await useCase.execute({
      userId: 'usr_123',
      currentPassword: 'OldValidPassword123!',
      newPassword: 'BrandNewSecurePassword456!',
    });

    expect(mockUserRepository.findById).toHaveBeenCalledWith('usr_123', false, true);
    expect(mockHashProvider.compare).toHaveBeenCalledWith(
      'OldValidPassword123!',
      '$2b$12$oldHashedPassword',
    );
    expect(mockHashProvider.hash).toHaveBeenCalledWith('BrandNewSecurePassword456!');
    // Token version was incremented from 1 to 2
    expect(existingUser.security.tokenVersion).toBe(2);
    expect(mockUserRepository.update).toHaveBeenCalledWith('usr_123', existingUser);
    expect(result.status).toBe('success');
    expect(result.message).toContain('Password updated securely');
  });

  it('should reject with UnauthorizedError when current password is wrong', async () => {
    const existingUser = new User({
      id: 'usr_123',
      tenantId: 'default',
      email: 'marie@curie.org',
      passwordHash: '$2b$12$oldHashedPassword',
      firstName: 'Marie',
      lastName: 'Curie',
      role: SystemRole.RESEARCHER,
      status: 'ACTIVE',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(existingUser);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: 'usr_123',
        currentPassword: 'WrongPassword!',
        newPassword: 'BrandNewPassword123!',
      }),
    ).rejects.toThrow(UnauthorizedError);

    expect(mockHashProvider.hash).not.toHaveBeenCalled();
    expect(mockUserRepository.update).not.toHaveBeenCalled();
  });

  it('should mitigate timing attack and throw UnauthorizedError when user is not found', async () => {
    vi.mocked(mockUserRepository.findById).mockResolvedValue(null);
    vi.mocked(mockHashProvider.compare).mockResolvedValue(false);

    await expect(
      useCase.execute({
        userId: 'missing_user',
        currentPassword: 'SomePassword!',
        newPassword: 'BrandNewPassword123!',
      }),
    ).rejects.toThrow(UnauthorizedError);

    // Assert dummy compare ran to equalize response time
    expect(mockHashProvider.compare).toHaveBeenCalledWith(
      'SomePassword!',
      expect.stringContaining('$2a$12$'),
    );
  });

  it('should throw ForbiddenError when user account is suspended', async () => {
    const suspendedUser = new User({
      id: 'usr_suspended',
      tenantId: 'default',
      email: 'suspended@sorbonne.fr',
      passwordHash: '$2b$12$someHash',
      firstName: 'Suspended',
      lastName: 'User',
      role: SystemRole.STUDENT,
      status: 'SUSPENDED',
    });

    vi.mocked(mockUserRepository.findById).mockResolvedValue(suspendedUser);

    await expect(
      useCase.execute({
        userId: 'usr_suspended',
        currentPassword: 'AnyPassword!',
        newPassword: 'NewPassword123!',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});
